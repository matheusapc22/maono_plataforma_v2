import {buildDropboxFilePath, normalizeRole, sanitizeFileName, validateUploadFile} from "../lib/file-policy.js";
import {deleteDropboxFileIfExists, ensureDropboxFolder, uploadDropboxFile} from "../lib/dropbox.js";
import {
  ApiError, assertOrganizationAccess, auditStatement, ensureOrganizationStorage, getFileEnv, getFileRecord,
  getRequestId, jsonResponse, mapFileRow, now, requireAuth, requireOrganization,
  requireProjectInOrganization, safe, sha256Hex,
} from "./context.js";

export function registerUploadRoute(router) {
  router.post("/organizations/:id/files", safe(async (request, env) => {
    const user = await requireAuth(request, env);
    const organizationId = request.params.id;
    assertOrganizationAccess(user, "file.upload", organizationId);
    const organization = await requireOrganization(env, organizationId);
    if (organization.status === "SUSPENDED" && normalizeRole(user.role) !== "SUPER_ADMIN") {
      throw new ApiError("A organização está suspensa.", {status: 403, code: "ORGANIZATION_SUSPENDED", stage: "file.upload"});
    }
    let formData;
    try { formData = await request.formData(); }
    catch { throw new ApiError("Não foi possível interpretar o formulário de upload.", {status: 400, code: "MULTIPART_INVALID", stage: "file.parse_form"}); }
    const file = formData.get("file");
    const projectId = String(formData.get("projectId") || "").trim() || null;
    await requireProjectInOrganization(env, projectId, organizationId);
    const validation = validateUploadFile(file, getFileEnv(env).maxUploadBytes);
    if (!validation.ok) throw new ApiError(validation.message, {status: validation.code === "FILE_TOO_LARGE" ? 413 : 400, code: validation.code, stage: "file.validate"});

    const idempotencyKey = String(request.headers.get("Idempotency-Key") || "").trim() || null;
    if (idempotencyKey) {
      const existing = await env.DB.prepare(`
        SELECT * FROM organization_files WHERE organization_id = ? AND idempotency_key = ? AND status IN ('PENDING', 'ACTIVE')
      `).bind(organizationId, idempotencyKey).first();
      if (existing?.status === "ACTIVE") return jsonResponse(request, env, {file: mapFileRow(existing), idempotent: true});
      if (existing?.status === "PENDING") throw new ApiError("Já existe um upload em processamento com esta chave.", {status: 409, code: "UPLOAD_IN_PROGRESS", stage: "file.idempotency"});
    }

    if (organization.storage_status !== "READY") await ensureOrganizationStorage(env, organization);
    const fileId = crypto.randomUUID();
    const originalName = String(file.name);
    const storedName = `${fileId}-${sanitizeFileName(originalName)}`;
    const dropboxPath = buildDropboxFilePath({organizationId, projectId, fileId, originalName});
    const bytes = await file.arrayBuffer();
    const contentHash = await sha256Hex(bytes);
    const timestamp = now();
    await env.DB.prepare(`
      INSERT INTO organization_files (
        id, organization_id, project_id, uploaded_by, original_name, stored_name, dropbox_path,
        mime_type, extension, size_bytes, content_hash, status, idempotency_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
    `).bind(fileId, organizationId, projectId, user.id, originalName, storedName, dropboxPath,
      validation.mimeType, validation.extension, Number(file.size), contentHash, idempotencyKey, timestamp, timestamp).run();

    let dropboxMetadata;
    try {
      await ensureDropboxFolder(env, dropboxPath.slice(0, dropboxPath.lastIndexOf("/")));
      dropboxMetadata = await uploadDropboxFile(env, dropboxPath, bytes, {mode: "add"});
      await env.DB.batch([
        env.DB.prepare(`
          UPDATE organization_files SET status = 'ACTIVE', dropbox_file_id = ?, dropbox_revision = ?, updated_at = ?, error_message = NULL WHERE id = ?
        `).bind(dropboxMetadata?.id || null, dropboxMetadata?.rev || null, now(), fileId),
        auditStatement(env, request, user, "file.upload", "organization_file", fileId, organizationId,
          {projectId, originalName, sizeBytes: Number(file.size), contentHash}),
      ]);
    } catch (error) {
      await env.DB.prepare(`UPDATE organization_files SET status = 'FAILED', error_message = ?, updated_at = ? WHERE id = ?`)
        .bind(String(error?.message || error), now(), fileId).run();
      if (dropboxMetadata) {
        try { await deleteDropboxFileIfExists(env, dropboxPath); }
        catch (compensationError) {
          console.error(JSON.stringify({level: "error", requestId: getRequestId(request), code: "UPLOAD_COMPENSATION_FAILED", fileId, message: String(compensationError)}));
        }
      }
      throw error;
    }
    return jsonResponse(request, env, {file: mapFileRow(await getFileRecord(env, fileId))}, 201);
  }));
}
