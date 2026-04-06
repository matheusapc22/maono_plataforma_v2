import { Router } from "itty-router";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const bcryptHash = (password, rounds = 10) => new Promise((res, rej) => bcrypt.hash(password, rounds, (err, hash) => err ? rej(err) : res(hash)));
const bcryptCompare = (password, hash) => new Promise((res, rej) => bcrypt.compare(password, hash, (err, same) => err ? rej(err) : res(same)));

const router = Router();
const now = () => new Date().toISOString();
const encoder = new TextEncoder();

const jsonHeaders = (origin) => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
});

const getEnv = (env = {}) => ({
  jwtSecret: env.JWT_SECRET || "maono_dev_secret",
  tokenExpiresIn: env.JWT_EXPIRES_IN || "8h",
  corsOrigin: env.CORS_ORIGIN || "*",
});

const createToken = async (env, user) => {
  const { jwtSecret, tokenExpiresIn } = getEnv(env);
  return new SignJWT({ email: user.email, role: user.role, org: user.organization_id })
    .setSubject(user.id)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(tokenExpiresIn)
    .sign(encoder.encode(jwtSecret));
};

const authMiddleware = async (request, env) => {
  const { jwtSecret } = getEnv(env);
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!token) return { error: "Token ausente." };
  try {
    const { payload } = await jwtVerify(token, encoder.encode(jwtSecret));
    return { user: { id: payload.sub, email: payload.email, role: payload.role, org: payload.org } };
  } catch {
    return { error: "Token inválido." };
  }
};

const readBody = async (request) => {
  if (!(request.headers.get("Content-Type") || "").includes("application/json")) return {};
  return request.json();
};

// ==========================================
// 🌐 ROTAS PÚBLICAS E CATÁLOGO
// ==========================================
router.options("*", (request, env) => new Response(null, { status: 204, headers: jsonHeaders(getEnv(env).corsOrigin) }));
router.get("/health", (request, env) => new Response(JSON.stringify({ status: "ok" }), { headers: jsonHeaders(getEnv(env).corsOrigin) }));

router.get("/catalog", (request, env) => {
  return new Response(JSON.stringify({ datasets: [{ id: 'ds_tiles_teste', name: 'Tiles Teste (Cloudflare R2)', type: 'SERVERLESS MVT', rows: 'Transmissão Contínua', description: 'Prova de Conceito Serverless.', columns: ['*'] }] }), { headers: jsonHeaders(getEnv(env).corsOrigin) });
});

// ==========================================
// 🔐 LOGIN E AUTENTICAÇÃO
// ==========================================
router.post("/auth/login", async (request, env) => {
  const { corsOrigin } = getEnv(env);
  const { email, password } = await readBody(request) || {};
  const user = await env.DB.prepare(`SELECT u.id, u.email, u.password_hash, u.role, u.organization_id, o.status as org_status FROM users u JOIN organizations o ON u.organization_id = o.id WHERE u.email = ?`).bind(email).first();
  
  if (!user || !(await bcryptCompare(password, user.password_hash))) return new Response(JSON.stringify({ error: "Credenciais inválidas." }), { status: 401, headers: jsonHeaders(corsOrigin) });
  if (user.org_status === 'SUSPENDED' && user.role !== 'SUPER_ADMIN') return new Response(JSON.stringify({ error: "Assinatura suspensa." }), { status: 403, headers: jsonHeaders(corsOrigin) });
  
  const token = await createToken(env, user);
  return new Response(JSON.stringify({ token }), { headers: jsonHeaders(corsOrigin) });
});

router.get("/auth/me", async (request, env) => {
  const { corsOrigin } = getEnv(env);
  const auth = await authMiddleware(request, env);
  if (auth.error) return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers: jsonHeaders(corsOrigin) });
  const user = await env.DB.prepare("SELECT id, email, role, organization_id FROM users WHERE id = ?").bind(auth.user.id).first();
  return new Response(JSON.stringify({ user }), { headers: jsonHeaders(corsOrigin) });
});

// ==========================================
// 🏢 GESTÃO DE USUÁRIOS
// ==========================================
router.get("/users", async (request, env) => {
  const { corsOrigin } = getEnv(env);
  const auth = await authMiddleware(request, env);
  if (auth.error) return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers: jsonHeaders(corsOrigin) });
  if (auth.user.role === 'VIEWER' || auth.user.role === 'EDITOR') return new Response(JSON.stringify({ error: "Acesso negado." }), { status: 403, headers: jsonHeaders(corsOrigin) });
  
  let result = auth.user.role === 'SUPER_ADMIN' 
    ? await env.DB.prepare("SELECT u.id, u.email, u.role, u.created_at, o.name as org_name FROM users u JOIN organizations o ON u.organization_id = o.id ORDER BY u.created_at DESC").all()
    : await env.DB.prepare("SELECT id, email, role, created_at FROM users WHERE organization_id = ? ORDER BY created_at DESC").bind(auth.user.org).all();
  return new Response(JSON.stringify({ users: result.results || [] }), { headers: jsonHeaders(corsOrigin) });
});

router.post("/users", async (request, env) => {
  const { corsOrigin } = getEnv(env);
  const auth = await authMiddleware(request, env);
  if (auth.error) return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers: jsonHeaders(corsOrigin) });
  if (auth.user.role === 'VIEWER' || auth.user.role === 'EDITOR') return new Response(JSON.stringify({ error: "Acesso negado." }), { status: 403, headers: jsonHeaders(corsOrigin) });

  const { email, password, role = 'VIEWER', target_org_id } = await readBody(request) || {};
  const finalOrgId = auth.user.role === 'SUPER_ADMIN' && target_org_id ? target_org_id : auth.user.org;

  const org = await env.DB.prepare("SELECT max_users FROM organizations WHERE id = ?").bind(finalOrgId).first();
  const currentUsers = await env.DB.prepare("SELECT count(id) as count FROM users WHERE organization_id = ?").bind(finalOrgId).first();
  if (currentUsers.count >= org.max_users && auth.user.role !== 'SUPER_ADMIN') return new Response(JSON.stringify({ error: "Limite atingido!" }), { status: 403, headers: jsonHeaders(corsOrigin) });

  const passwordHash = await bcryptHash(password, 10);
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO users (id, organization_id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(id, finalOrgId, email, passwordHash, role, now()).run();
  return new Response(JSON.stringify({ message: "Criado!", id }), { status: 201, headers: jsonHeaders(corsOrigin) });
});

router.delete("/users/:id", async (request, env) => {
  const { corsOrigin } = getEnv(env);
  const auth = await authMiddleware(request, env);
  if (auth.error) return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers: jsonHeaders(corsOrigin) });
  if (auth.user.role === 'VIEWER' || auth.user.role === 'EDITOR') return new Response(JSON.stringify({ error: "Acesso negado." }), { status: 403, headers: jsonHeaders(corsOrigin) });
  
  if (auth.user.role === 'SUPER_ADMIN') {
    await env.DB.prepare("DELETE FROM projects WHERE user_id = ?").bind(request.params.id).run();
    await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(request.params.id).run();
  } else {
    await env.DB.prepare("DELETE FROM projects WHERE user_id = ? AND organization_id = ?").bind(request.params.id, auth.user.org).run();
    await env.DB.prepare("DELETE FROM users WHERE id = ? AND organization_id = ?").bind(request.params.id, auth.user.org).run();
  }
  return new Response(JSON.stringify({ status: "ok" }), { headers: jsonHeaders(corsOrigin) });
});

// ==========================================
// 🗺️ PROJETOS
// ==========================================
router.get("/projects", async (request, env) => {
  const { corsOrigin } = getEnv(env);
  const auth = await authMiddleware(request, env);
  if (auth.error) return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers: jsonHeaders(corsOrigin) });
  
  let result = auth.user.role === 'SUPER_ADMIN' 
    ? await env.DB.prepare("SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM projects ORDER BY updated_at DESC").all()
    : await env.DB.prepare("SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM projects WHERE organization_id = ? ORDER BY updated_at DESC").bind(auth.user.org).all();
  return new Response(JSON.stringify({ projects: result.results || [] }), { headers: jsonHeaders(corsOrigin) });
});

router.all("*", (request, env) => new Response(JSON.stringify({ error: "Rota não encontrada." }), { status: 404, headers: jsonHeaders(getEnv(env).corsOrigin) }));

export default {
  async fetch(request, env, ctx) {
    const { corsOrigin } = getEnv(env);
    try {
      const res = await router.fetch(request, env, ctx);
      return res instanceof Response ? res : new Response(JSON.stringify(res ?? {}), { status: 200, headers: jsonHeaders(corsOrigin) });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: jsonHeaders(corsOrigin) });
    }
  },
};