import { Router } from "itty-router";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

// Wrappers async para evitar bloquear o runtime
const bcryptHash = (password, rounds = 10) =>
  new Promise((resolve, reject) => {
    bcrypt.hash(password, rounds, (err, hash) => {
      if (err) reject(err);
      else resolve(hash);
    });
  });

const bcryptCompare = (password, hash) =>
  new Promise((resolve, reject) => {
    bcrypt.compare(password, hash, (err, same) => {
      if (err) reject(err);
      else resolve(same);
    });
  });

const router = Router();

const jsonHeaders = (origin) => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
});

const now = () => new Date().toISOString();
const encoder = new TextEncoder();

const getEnv = (env = {}) => ({
  jwtSecret: env.JWT_SECRET || "maono_dev_secret",
  tokenExpiresIn: env.JWT_EXPIRES_IN || "8h",
  corsOrigin: env.CORS_ORIGIN || "*",
});

const createToken = async (env, user) => {
  const { jwtSecret, tokenExpiresIn } = getEnv(env);
  return new SignJWT({ email: user.email })
    .setSubject(user.id)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(tokenExpiresIn)
    .sign(encoder.encode(jwtSecret));
};

const authMiddleware = async (request, env) => {
  const { jwtSecret } = getEnv(env);
  const header = request.headers.get("Authorization") || "";
  const token = header.replace("Bearer ", "");

  if (!token) {
    return { error: "Token ausente." };
  }

  try {
    const { payload } = await jwtVerify(token, encoder.encode(jwtSecret));
    return { user: { id: payload.sub, email: payload.email } };
  } catch {
    return { error: "Token inválido." };
  }
};

const readBody = async (request) => {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    return {};
  }
  return request.json();
};

const filterKeplerJsonByCity = (keplerJson, city, fieldName) => {
  if (!keplerJson?.datasets || !Array.isArray(keplerJson.datasets)) {
    return keplerJson;
  }

  const normalizedCity = city.trim().toLowerCase();
  const normalizedField = fieldName.trim().toLowerCase();
  let matched = false;

  const datasets = keplerJson.datasets.map((dataset) => {
    const fields = dataset?.data?.fields || [];
    const rows = dataset?.data?.rows || [];
    const fieldIndex = fields.findIndex(
      (field) => field?.name?.toLowerCase() === normalizedField
    );

    if (fieldIndex === -1) return dataset;

    matched = true;
    const filteredRows = rows.filter((row) => {
      const value = row[fieldIndex];
      if (value === undefined || value === null) return false;
      return String(value).toLowerCase() === normalizedCity;
    });

    return {
      ...dataset,
      data: {
        ...dataset.data,
        rows: filteredRows,
      },
    };
  });

  if (!matched) {
    throw new Error("Campo de cidade não encontrado nos datasets.");
  }

  return { ...keplerJson, datasets };
};

// ==========================================
// 🌐 ROTAS PÚBLICAS E CONFIGURAÇÕES
// ==========================================
router.options("*", (request, env) => {
  const { corsOrigin } = getEnv(env);
  return new Response(null, {
    status: 204,
    headers: jsonHeaders(corsOrigin),
  });
});

router.get("/health", (request, env) => {
  const { corsOrigin } = getEnv(env);
  return new Response(JSON.stringify({ status: "ok", message: "Maõno API Online" }), {
    headers: jsonHeaders(corsOrigin),
  });
});

router.get("/catalog", (request, env) => {
  const { corsOrigin } = getEnv(env);
  const catalogDatasets = [
    {
      id: 'ds_tiles_teste', 
      name: 'Tiles Teste (Cloudflare R2)', 
      type: 'SERVERLESS MVT', 
      rows: 'Transmissão Contínua',
      description: 'Prova de Conceito de Arquitetura Serverless. Fatias vetorizadas transmitidas diretamente para a GPU.',
      columns: ['* Todas as propriedades encapsuladas no Protobuf']
    }
  ];

  return new Response(JSON.stringify({ datasets: catalogDatasets }), {
    status: 200,
    headers: jsonHeaders(corsOrigin),
  });
});

// ==========================================
// 🔐 AUTENTICAÇÃO E SESSÃO
// ==========================================
router.post("/auth/signup", async (request, env) => {
  const { corsOrigin } = getEnv(env);
  const body = await readBody(request);
  const { email, password } = body || {};

  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: "Email e senha são obrigatórios." }),
      { status: 400, headers: jsonHeaders(corsOrigin) }
    );
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first();

  if (existing) {
    return new Response(JSON.stringify({ error: "Email já cadastrado." }), {
      status: 409,
      headers: jsonHeaders(corsOrigin),
    });
  }

  const passwordHash = await bcryptHash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    email,
    password_hash: passwordHash,
    created_at: now(),
  };

  await env.DB.prepare(
    "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)"
  )
    .bind(user.id, user.email, user.password_hash, user.created_at)
    .run();

  const token = await createToken(env, user);
  return new Response(JSON.stringify({ token, message: "Usuário criado com sucesso!" }), {
    status: 201,
    headers: jsonHeaders(corsOrigin),
  });
});

router.post("/auth/login", async (request, env) => {
  const { corsOrigin } = getEnv(env);
  const body = await readBody(request);
  const { email, password } = body || {};

  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: "Email e senha são obrigatórios." }),
      { status: 400, headers: jsonHeaders(corsOrigin) }
    );
  }

  const user = await env.DB.prepare(
    "SELECT id, email, password_hash FROM users WHERE email = ?"
  )
    .bind(email)
    .first();

  const ok = user ? await bcryptCompare(password, user.password_hash) : false;
  if (!user || !ok) {
    return new Response(JSON.stringify({ error: "Credenciais inválidas." }), {
      status: 401,
      headers: jsonHeaders(corsOrigin),
    });
  }

  const token = await createToken(env, user);
  return new Response(JSON.stringify({ token }), {
    headers: jsonHeaders(corsOrigin),
  });
});

// NOVA ROTA: Validação de Sessão
router.get("/auth/me", async (request, env) => {
  const { corsOrigin } = getEnv(env);
  const auth = await authMiddleware(request, env);

  if (auth.error) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: 401,
      headers: jsonHeaders(corsOrigin),
    });
  }

  const user = await env.DB.prepare(
    "SELECT id, email, created_at FROM users WHERE id = ?"
  )
    .bind(auth.user.id)
    .first();

  if (!user) {
    return new Response(JSON.stringify({ error: "Usuário não encontrado." }), {
      status: 404,
      headers: jsonHeaders(corsOrigin),
    });
  }

  return new Response(JSON.stringify({ user }), {
    headers: jsonHeaders(corsOrigin),
  });
});

// ==========================================
// 🗺️ GESTÃO DE PROJETOS (KEPLER MAPS)
// ==========================================
router.get("/projects", async (request, env) => {
  const { corsOrigin } = getEnv(env);
  const auth = await authMiddleware(request, env);

  if (auth.error) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: 401,
      headers: jsonHeaders(corsOrigin),
    });
  }

  const result = await env.DB.prepare(
    `SELECT id, name, created_at as createdAt, updated_at as updatedAt
     FROM projects
     WHERE user_id = ?
     ORDER BY updated_at DESC`
  )
    .bind(auth.user.id)
    .all();

  return new Response(JSON.stringify({ projects: result.results || [] }), {
    headers: jsonHeaders(corsOrigin),
  });
});

router.get("/projects/:id", async (request, env) => {
  const { corsOrigin } = getEnv(env);
  const auth = await authMiddleware(request, env);

  if (auth.error) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: 401,
      headers: jsonHeaders(corsOrigin),
    });
  }

  const project = await env.DB.prepare(
    `SELECT id, name, json_data as jsonData
     FROM projects
     WHERE id = ? AND user_id = ?`
  )
    .bind(request.params.id, auth.user.id)
    .first();

  if (!project) {
    return new Response(JSON.stringify({ error: "Projeto não encontrado." }), {
      status: 404,
      headers: jsonHeaders(corsOrigin),
    });
  }

  let keplerJson;
  try {
    keplerJson = JSON.parse(project.jsonData);
  } catch {
    return new Response(JSON.stringify({ error: "JSON do projeto inválido." }), {
      status: 500,
      headers: jsonHeaders(corsOrigin),
    });
  }

  const url = new URL(request.url);
  const city = url.searchParams.get("city");
  const field = url.searchParams.get("field") || "cidade";

  if (city) {
    try {
      keplerJson = filterKeplerJsonByCity(keplerJson, city, field);
    } catch {
      return new Response(
        JSON.stringify({ error: "Não foi possível aplicar o filtro." }),
        { status: 400, headers: jsonHeaders(corsOrigin) }
      );
    }
  }

  return new Response(
    JSON.stringify({ id: project.id, name: project.name, keplerJson }),
    { headers: jsonHeaders(corsOrigin) }
  );
});

router.post("/projects", async (request, env) => {
  const { corsOrigin } = getEnv(env);
  const auth = await authMiddleware(request, env);

  if (auth.error) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: 401,
      headers: jsonHeaders(corsOrigin),
    });
  }

  const body = await readBody(request);
  const { name, keplerJson } = body || {};

  if (!name || !keplerJson) {
    return new Response(
      JSON.stringify({ error: "Nome e JSON do projeto são obrigatórios." }),
      { status: 400, headers: jsonHeaders(corsOrigin) }
    );
  }

  const project = {
    id: crypto.randomUUID(),
    user_id: auth.user.id,
    name,
    json_data: JSON.stringify(keplerJson),
    created_at: now(),
    updated_at: now(),
  };

  await env.DB.prepare(
    `INSERT INTO projects (id, user_id, name, json_data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      project.id,
      project.user_id,
      project.name,
      project.json_data,
      project.created_at,
      project.updated_at
    )
    .run();

  return new Response(JSON.stringify({ id: project.id }), {
    status: 201,
    headers: jsonHeaders(corsOrigin),
  });
});

router.put("/projects/:id", async (request, env) => {
  const { corsOrigin } = getEnv(env);
  const auth = await authMiddleware(request, env);

  if (auth.error) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: 401,
      headers: jsonHeaders(corsOrigin),
    });
  }

  const body = await readBody(request);
  const { name, keplerJson } = body || {};

  if (!name || !keplerJson) {
    return new Response(
      JSON.stringify({ error: "Nome e JSON do projeto são obrigatórios." }),
      { status: 400, headers: jsonHeaders(corsOrigin) }
    );
  }

  const result = await env.DB.prepare(
    `UPDATE projects
     SET name = ?, json_data = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`
  )
    .bind(name, JSON.stringify(keplerJson), now(), request.params.id, auth.user.id)
    .run();

  if (result.changes === 0) {
    return new Response(JSON.stringify({ error: "Projeto não encontrado." }), {
      status: 404,
      headers: jsonHeaders(corsOrigin),
    });
  }

  return new Response(JSON.stringify({ status: "ok" }), {
    headers: jsonHeaders(corsOrigin),
  });
});

router.delete("/projects/:id", async (request, env) => {
  const { corsOrigin } = getEnv(env);
  const auth = await authMiddleware(request, env);

  if (auth.error) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: 401,
      headers: jsonHeaders(corsOrigin),
    });
  }

  const result = await env.DB.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?")
    .bind(request.params.id, auth.user.id)
    .run();

  if (result.changes === 0) {
    return new Response(JSON.stringify({ error: "Projeto não encontrado." }), {
      status: 404,
      headers: jsonHeaders(corsOrigin),
    });
  }

  return new Response(JSON.stringify({ status: "ok" }), {
    headers: jsonHeaders(corsOrigin),
  });
});

router.all("*", (request, env) => {
  const { corsOrigin } = getEnv(env);
  return new Response(JSON.stringify({ error: "Rota não encontrada." }), {
    status: 404,
    headers: jsonHeaders(corsOrigin),
  });
});

export default {
  async fetch(request, env, ctx) {
    const { jwtSecret, corsOrigin } = getEnv(env);

    // hardening simples: em produção, não permitir secret default
    if (env?.NODE_ENV === "production" && jwtSecret === "maono_dev_secret") {
      return new Response(
        JSON.stringify({ error: "Defina JWT_SECRET antes de iniciar." }),
        { status: 500, headers: jsonHeaders(corsOrigin) }
      );
    }

    try {
      const res = await router.fetch(request, env, ctx);

      if (res instanceof Response) return res;

      return new Response(JSON.stringify(res ?? {}), {
        status: 200,
        headers: jsonHeaders(corsOrigin),
      });
    } catch (err) {
      console.error(err);
      const message =
        env?.NODE_ENV === "production"
          ? "Erro interno."
          : (err && err.message) || String(err);

      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: jsonHeaders(corsOrigin),
      });
    }
  },
};