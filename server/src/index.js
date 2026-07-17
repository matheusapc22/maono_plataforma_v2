import {Router} from "itty-router";
import bcrypt from "bcryptjs";
import {SignJWT} from "jose";
import {buildOrganizationFolder, normalizeRole} from "./lib/file-policy.js";
import {registerFileManagementRoutes} from "./file-management/index.js";
import {
  ApiError, auditStatement, ensureOrganizationStorage, errorResponse, getRequestId,
  jsonResponse, now, requireAuth, responseHeaders, writeAudit,
} from "./file-management/context.js";

const router = Router();
const encoder = new TextEncoder();
const bcryptHash = (password, rounds = 10) => new Promise((resolve, reject) =>
  bcrypt.hash(password, rounds, (error, hash) => error ? reject(error) : resolve(hash)));
const bcryptCompare = (password, hash) => new Promise((resolve, reject) =>
  bcrypt.compare(password, hash, (error, same) => error ? reject(error) : resolve(same)));

const getEnv = (env = {}) => ({
  jwtSecret: env.JWT_SECRET || "maono_dev_secret",
  tokenExpiresIn: env.JWT_EXPIRES_IN || "8h",
});

async function readJsonBody(request) {
  if (!(request.headers.get("Content-Type") || "").includes("application/json")) return {};
  try { return await request.json(); }
  catch { throw new ApiError("JSON inválido.", {status: 400, code: "INVALID_JSON", stage: "request.parse_json"}); }
}

async function createToken(env, user) {
  const {jwtSecret, tokenExpiresIn} = getEnv(env);
  return new SignJWT({email: user.email, role: user.role, org: user.organization_id})
    .setSubject(user.id).setProtectedHeader({alg: "HS256"}).setIssuedAt()
    .setExpirationTime(tokenExpiresIn).sign(encoder.encode(jwtSecret));
}

function requireSuperAdmin(user, code, stage) {
  if (normalizeRole(user.role) !== "SUPER_ADMIN") {
    throw new ApiError("Acesso restrito ao Super Admin.", {status: 403, code, stage});
  }
}

router.options("*", (request, env) => new Response(null, {status: 204, headers: responseHeaders(request, env)}));
router.get("/health", (request, env) => jsonResponse(request, env, {status: "ok"}));
router.get("/catalog", (request, env) => jsonResponse(request, env, {
  datasets: [{
    id: "ds_tiles_teste", name: "Tiles Teste (Cloudflare R2)", type: "SERVERLESS MVT",
    rows: "Transmissão Contínua", description: "Prova de Conceito Serverless.", columns: ["*"],
  }],
}));

router.post("/auth/login", async (request, env) => {
  const {email, password} = await readJsonBody(request);
  if (!email || !password) throw new ApiError("E-mail e senha são obrigatórios.", {status: 400, code: "LOGIN_FIELDS_REQUIRED", stage: "auth.login"});
  const user = await env.DB.prepare(`
    SELECT u.id, u.email, u.password_hash, u.role, u.organization_id, o.status AS org_status
    FROM users u JOIN organizations o ON u.organization_id = o.id WHERE lower(u.email) = lower(?)
  `).bind(email).first();
  if (!user || !(await bcryptCompare(password, user.password_hash))) {
    throw new ApiError("Credenciais inválidas.", {status: 401, code: "LOGIN_INVALID", stage: "auth.login"});
  }
  if (user.org_status === "SUSPENDED" && normalizeRole(user.role) !== "SUPER_ADMIN") {
    throw new ApiError("Assinatura suspensa.", {status: 403, code: "ORGANIZATION_SUSPENDED", stage: "auth.login"});
  }
  const token = await createToken(env, user);
  await writeAudit(env, request, {id: user.id, org: user.organization_id}, "auth.login", "user", user.id, user.organization_id);
  return jsonResponse(request, env, {token});
});

router.get("/auth/me", async (request, env) => {
  const authUser = await requireAuth(request, env);
  const user = await env.DB.prepare(`
    SELECT u.id, u.email, u.role, u.organization_id,
           o.name AS organization_name, o.status AS organization_status,
           o.dropbox_folder_path, o.storage_status, o.storage_error
    FROM users u JOIN organizations o ON o.id = u.organization_id WHERE u.id = ?
  `).bind(authUser.id).first();
  if (!user) throw new ApiError("Usuário não encontrado.", {status: 404, code: "USER_NOT_FOUND", stage: "auth.me"});
  return jsonResponse(request, env, {user});
});

router.get("/organizations", async (request, env) => {
  const user = await requireAuth(request, env);
  requireSuperAdmin(user, "ORGANIZATIONS_FORBIDDEN", "authorization");
  const result = await env.DB.prepare(`
    SELECT o.id, o.name, o.max_users, o.status, o.created_at,
           o.dropbox_folder_path, o.storage_status, o.storage_error, o.storage_updated_at,
           (SELECT COUNT(id) FROM users WHERE organization_id = o.id) AS current_users
    FROM organizations o ORDER BY o.created_at DESC
  `).all();
  return jsonResponse(request, env, {organizations: result.results || []});
});

router.post("/organizations", async (request, env) => {
  const user = await requireAuth(request, env);
  requireSuperAdmin(user, "ORGANIZATION_CREATE_FORBIDDEN", "authorization");
  const {name, max_users = 5, status = "ACTIVE"} = await readJsonBody(request);
  if (!String(name || "").trim()) throw new ApiError("O nome da organização é obrigatório.", {status: 400, code: "ORGANIZATION_NAME_REQUIRED", stage: "organization.create"});
  const id = `org-${crypto.randomUUID()}`;
  const folderPath = buildOrganizationFolder(id);
  const createdAt = now();
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO organizations (
        id, name, max_users, status, created_at, dropbox_folder_path, storage_status, storage_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `).bind(id, String(name).trim(), Number(max_users) || 5, status, createdAt, folderPath, createdAt),
    auditStatement(env, request, user, "organization.create", "organization", id, id, {name: String(name).trim()}),
  ]);
  let storage = {status: "READY", warning: null};
  try { await ensureOrganizationStorage(env, {id, dropbox_folder_path: folderPath}); }
  catch (error) {
    storage = {
      status: "ERROR",
      warning: "A organização foi criada, mas a pasta do Dropbox ainda não foi provisionada. Use a ação de sincronização.",
      code: error?.code || "DROPBOX_PROVISION_FAILED",
    };
  }
  return jsonResponse(request, env, {message: "Organização criada com sucesso.", id, storage}, 201);
});

router.put("/organizations/:id/status", async (request, env) => {
  const user = await requireAuth(request, env);
  requireSuperAdmin(user, "ORGANIZATION_UPDATE_FORBIDDEN", "authorization");
  const {status} = await readJsonBody(request);
  if (!["ACTIVE", "SUSPENDED"].includes(status)) throw new ApiError("Status de organização inválido.", {status: 400, code: "ORGANIZATION_STATUS_INVALID", stage: "organization.update_status"});
  const organization = await env.DB.prepare("SELECT id FROM organizations WHERE id = ?").bind(request.params.id).first();
  if (!organization) throw new ApiError("Organização não encontrada.", {status: 404, code: "ORGANIZATION_NOT_FOUND", stage: "organization.lookup"});
  await env.DB.batch([
    env.DB.prepare("UPDATE organizations SET status = ? WHERE id = ?").bind(status, organization.id),
    auditStatement(env, request, user, "organization.status.update", "organization", organization.id, organization.id, {status}),
  ]);
  return jsonResponse(request, env, {message: "Status do contrato atualizado."});
});

router.get("/users", async (request, env) => {
  const user = await requireAuth(request, env);
  const role = normalizeRole(user.role);
  if (["VIEWER", "EDITOR"].includes(role)) throw new ApiError("Acesso negado.", {status: 403, code: "USERS_FORBIDDEN", stage: "authorization"});
  const result = role === "SUPER_ADMIN"
    ? await env.DB.prepare(`
        SELECT u.id, u.email, u.role, u.created_at, u.organization_id, o.name AS org_name
        FROM users u JOIN organizations o ON u.organization_id = o.id ORDER BY u.created_at DESC
      `).all()
    : await env.DB.prepare("SELECT id, email, role, created_at, organization_id FROM users WHERE organization_id = ? ORDER BY created_at DESC").bind(user.org).all();
  return jsonResponse(request, env, {users: result.results || []});
});

router.post("/users", async (request, env) => {
  const user = await requireAuth(request, env);
  const role = normalizeRole(user.role);
  if (["VIEWER", "EDITOR"].includes(role)) throw new ApiError("Acesso negado.", {status: 403, code: "USER_CREATE_FORBIDDEN", stage: "authorization"});
  const {email, password, role: requestedRole = "VIEWER", target_org_id} = await readJsonBody(request);
  if (!email || !password) throw new ApiError("E-mail e senha são obrigatórios.", {status: 400, code: "USER_FIELDS_REQUIRED", stage: "user.create"});
  const finalOrgId = role === "SUPER_ADMIN" && target_org_id ? target_org_id : user.org;
  const org = await env.DB.prepare("SELECT id, max_users FROM organizations WHERE id = ?").bind(finalOrgId).first();
  if (!org) throw new ApiError("Organização não encontrada.", {status: 404, code: "ORGANIZATION_NOT_FOUND", stage: "user.create"});
  const currentUsers = await env.DB.prepare("SELECT count(id) AS count FROM users WHERE organization_id = ?").bind(finalOrgId).first();
  if (Number(currentUsers?.count || 0) >= Number(org.max_users) && role !== "SUPER_ADMIN") {
    throw new ApiError("Limite de usuários do contrato atingido.", {status: 403, code: "ORGANIZATION_USER_LIMIT", stage: "user.create"});
  }
  const normalizedRequestedRole = normalizeRole(requestedRole);
  if (role !== "SUPER_ADMIN" && ["SUPER_ADMIN", "ADMIN", "OWNER"].includes(normalizedRequestedRole)) {
    throw new ApiError("Você não pode criar um usuário com esse perfil.", {status: 403, code: "ROLE_ASSIGNMENT_FORBIDDEN", stage: "user.create"});
  }
  const id = crypto.randomUUID();
  const passwordHash = await bcryptHash(password, 10);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (id, organization_id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, finalOrgId, String(email).trim().toLowerCase(), passwordHash, normalizedRequestedRole, now()),
    auditStatement(env, request, user, "user.create", "user", id, finalOrgId, {email, role: normalizedRequestedRole}),
  ]);
  return jsonResponse(request, env, {message: "Usuário criado.", id}, 201);
});

router.delete("/users/:id", async (request, env) => {
  const user = await requireAuth(request, env);
  const role = normalizeRole(user.role);
  if (["VIEWER", "EDITOR"].includes(role)) throw new ApiError("Acesso negado.", {status: 403, code: "USER_DELETE_FORBIDDEN", stage: "authorization"});
  const target = await env.DB.prepare("SELECT id, organization_id, role FROM users WHERE id = ?").bind(request.params.id).first();
  if (!target) throw new ApiError("Usuário não encontrado.", {status: 404, code: "USER_NOT_FOUND", stage: "user.delete"});
  if (role !== "SUPER_ADMIN" && target.organization_id !== user.org) throw new ApiError("Acesso negado.", {status: 403, code: "CROSS_ORGANIZATION_FORBIDDEN", stage: "authorization"});
  if (normalizeRole(target.role) === "SUPER_ADMIN" && role !== "SUPER_ADMIN") throw new ApiError("Acesso negado.", {status: 403, code: "SUPER_ADMIN_DELETE_FORBIDDEN", stage: "authorization"});
  await env.DB.batch([
    env.DB.prepare("DELETE FROM projects WHERE user_id = ? AND organization_id = ?").bind(target.id, target.organization_id),
    env.DB.prepare("DELETE FROM users WHERE id = ? AND organization_id = ?").bind(target.id, target.organization_id),
    auditStatement(env, request, user, "user.delete", "user", target.id, target.organization_id),
  ]);
  return jsonResponse(request, env, {status: "ok"});
});

router.get("/projects", async (request, env) => {
  const user = await requireAuth(request, env);
  const requestedOrganizationId = new URL(request.url).searchParams.get("organizationId");
  const role = normalizeRole(user.role);
  let result;
  if (role === "SUPER_ADMIN") {
    result = requestedOrganizationId
      ? await env.DB.prepare("SELECT id, organization_id AS organizationId, name, created_at AS createdAt, updated_at AS updatedAt FROM projects WHERE organization_id = ? ORDER BY updated_at DESC").bind(requestedOrganizationId).all()
      : await env.DB.prepare("SELECT id, organization_id AS organizationId, name, created_at AS createdAt, updated_at AS updatedAt FROM projects ORDER BY updated_at DESC").all();
  } else {
    result = await env.DB.prepare("SELECT id, organization_id AS organizationId, name, created_at AS createdAt, updated_at AS updatedAt FROM projects WHERE organization_id = ? ORDER BY updated_at DESC").bind(user.org).all();
  }
  return jsonResponse(request, env, {projects: result.results || []});
});

registerFileManagementRoutes(router);
router.all("*", (request, env) => jsonResponse(request, env, {
  error: "Rota não encontrada.", code: "ROUTE_NOT_FOUND", requestId: getRequestId(request),
}, 404));

export default {
  async fetch(request, env, ctx) {
    getRequestId(request);
    try {
      const response = await router.fetch(request, env, ctx);
      return response instanceof Response ? response : jsonResponse(request, env, response ?? {});
    } catch (error) {
      return errorResponse(request, env, error);
    }
  },
};
