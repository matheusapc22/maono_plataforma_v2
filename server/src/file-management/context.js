import {jwtVerify} from "jose";
import {buildOrganizationFolder, canFileAction} from "../lib/file-policy.js";
import {DropboxApiError, ensureDropboxFolder} from "../lib/dropbox.js";

const encoder = new TextEncoder();
const requestIds = new WeakMap();
export const now = () => new Date().toISOString();

export class ApiError extends Error {
  constructor(message, {status = 400, code = "BAD_REQUEST", stage = "request", details = null} = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.stage = stage;
    this.details = details;
  }
}

export const getFileEnv = (env = {}) => ({
  jwtSecret: env.JWT_SECRET || "maono_dev_secret",
  corsOrigin: env.CORS_ORIGIN || "*",
  maxUploadBytes: Number(env.MAX_UPLOAD_BYTES || 25 * 1024 * 1024),
});

export function getRequestId(request) {
  if (!requestIds.has(request)) requestIds.set(request, request.headers.get("X-Request-Id") || crypto.randomUUID());
  return requestIds.get(request);
}

export function responseHeaders(request, env, extra = {}) {
  return {
    "Access-Control-Allow-Origin": getFileEnv(env).corsOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key, X-Request-Id",
    "Access-Control-Expose-Headers": "Content-Disposition, X-Request-Id",
    "X-Request-Id": getRequestId(request),
    ...extra,
  };
}

export function jsonResponse(request, env, payload, status = 200, extraHeaders = {}) {
  return new Response(payload === null ? null : JSON.stringify(payload), {
    status,
    headers: responseHeaders(request, env, {"Content-Type": "application/json; charset=utf-8", ...extraHeaders}),
  });
}

export function errorResponse(request, env, error) {
  const normalized = error instanceof DropboxApiError || error instanceof ApiError
    ? error
    : new ApiError("Erro interno ao processar a requisição.", {status: 500, code: "INTERNAL_ERROR", stage: "server"});
  const requestId = getRequestId(request);
  console.error(JSON.stringify({
    level: "error", requestId, code: normalized.code, stage: normalized.stage,
    message: normalized.message, details: normalized.details || undefined, stack: error?.stack || undefined,
  }));
  return jsonResponse(request, env, {
    error: normalized.message, code: normalized.code, stage: normalized.stage, requestId,
  }, normalized.status || 500);
}

export function safe(handler) {
  return async (request, env, ctx) => {
    getRequestId(request);
    try { return await handler(request, env, ctx); }
    catch (error) { return errorResponse(request, env, error); }
  };
}

export async function requireAuth(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new ApiError("Token ausente.", {status: 401, code: "AUTH_INVALID", stage: "auth"});
  try {
    const {payload} = await jwtVerify(token, encoder.encode(getFileEnv(env).jwtSecret));
    return {id: payload.sub, email: payload.email, role: payload.role, org: payload.org};
  } catch {
    throw new ApiError("Token inválido.", {status: 401, code: "AUTH_INVALID", stage: "auth"});
  }
}

function getClientIp(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || null;
}

export function auditStatement(env, request, user, action, entityType, entityId, organizationId, metadata = {}) {
  return env.DB.prepare(`
    INSERT INTO audit_logs (id, user_id, organization_id, action, entity_type, entity_id, metadata_json, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(), user?.id || null, organizationId || user?.org || null, action, entityType,
    entityId || null, JSON.stringify({requestId: getRequestId(request), ...metadata}), getClientIp(request), now()
  );
}

export async function writeAudit(env, request, user, action, entityType, entityId, organizationId, metadata = {}) {
  try { await auditStatement(env, request, user, action, entityType, entityId, organizationId, metadata).run(); }
  catch (error) { console.error(JSON.stringify({level: "error", requestId: getRequestId(request), code: "AUDIT_WRITE_FAILED", message: String(error)})); }
}

export async function getOrganization(env, organizationId) {
  return env.DB.prepare(`
    SELECT id, name, status, max_users, expires_at, created_at,
           dropbox_folder_path, storage_status, storage_error, storage_updated_at
    FROM organizations WHERE id = ?
  `).bind(organizationId).first();
}

export async function requireOrganization(env, organizationId) {
  const organization = await getOrganization(env, organizationId);
  if (!organization) throw new ApiError("Organização não encontrada.", {status: 404, code: "ORGANIZATION_NOT_FOUND", stage: "organization.lookup"});
  return organization;
}

export function assertOrganizationAccess(user, action, organizationId) {
  if (!canFileAction(user, action, organizationId)) {
    throw new ApiError("Você não tem permissão para executar esta ação.", {status: 403, code: "FILE_ACTION_FORBIDDEN", stage: "authorization"});
  }
}

export async function ensureOrganizationStorage(env, organization) {
  const folderPath = organization.dropbox_folder_path || buildOrganizationFolder(organization.id);
  await env.DB.prepare(`
    UPDATE organizations SET dropbox_folder_path = ?, storage_status = 'PENDING', storage_error = NULL, storage_updated_at = ? WHERE id = ?
  `).bind(folderPath, now(), organization.id).run();
  try {
    await ensureDropboxFolder(env, `${folderPath}/files`);
    await env.DB.prepare(`UPDATE organizations SET storage_status = 'READY', storage_error = NULL, storage_updated_at = ? WHERE id = ?`)
      .bind(now(), organization.id).run();
    return {folderPath, storageStatus: "READY"};
  } catch (error) {
    await env.DB.prepare(`UPDATE organizations SET storage_status = 'ERROR', storage_error = ?, storage_updated_at = ? WHERE id = ?`)
      .bind(String(error?.message || error), now(), organization.id).run();
    throw error;
  }
}

export async function requireProjectInOrganization(env, projectId, organizationId) {
  if (!projectId) return null;
  const project = await env.DB.prepare("SELECT id, name, organization_id FROM projects WHERE id = ? AND organization_id = ?")
    .bind(projectId, organizationId).first();
  if (!project) throw new ApiError("O projeto informado não pertence à organização selecionada.", {status: 404, code: "PROJECT_NOT_FOUND", stage: "project.lookup"});
  return project;
}

export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function mapFileRow(row) {
  if (!row) return null;
  return {
    id: row.id, organizationId: row.organization_id, projectId: row.project_id, projectName: row.project_name || null,
    uploadedBy: row.uploaded_by, uploadedByEmail: row.uploaded_by_email || null, originalName: row.original_name,
    storedName: row.stored_name, mimeType: row.mime_type, extension: row.extension, sizeBytes: Number(row.size_bytes || 0),
    contentHash: row.content_hash, revision: row.dropbox_revision, status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at,
  };
}

export async function getFileRecord(env, fileId) {
  return env.DB.prepare(`
    SELECT f.*, p.name AS project_name, u.email AS uploaded_by_email
    FROM organization_files f
    LEFT JOIN projects p ON p.id = f.project_id
    LEFT JOIN users u ON u.id = f.uploaded_by
    WHERE f.id = ?
  `).bind(fileId).first();
}
