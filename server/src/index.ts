import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt, sign } from 'hono/jwt';
import { zValidator } from '@hono/zod-validator';
import { registerSchema, loginSchema, projectSchema, demandListSchema } from './schemas';

// Tipagem para os bindings do Cloudflare Workers
type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// 🔒 CORS super restritivo para produção (protege o frontend)
app.use('/*', cors({
  origin: ['http://localhost:5173', 'https://app.maono.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// =========================================================================
// 🏢 1. GESTÃO DE USUÁRIOS E ORGANIZAÇÕES
// =========================================================================

app.post('/api/auth/register', zValidator('json', registerSchema), async (c) => {
  const body = c.req.valid('json');
  const db = c.env.DB;
  
  const orgId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  
  // Hash de senha mockado (em prod use bcrypt/scrypt via edge libs)
  const passwordHash = `hashed_${body.password}`;

  try {
    // Transação para criar Organização e Usuário ao mesmo tempo
    const batch = await db.batch([
      db.prepare(`INSERT INTO organizations (id, name, type) VALUES (?, ?, ?)`).bind(orgId, body.orgName, body.orgType),
      db.prepare(`INSERT INTO users (id, org_id, name, email, password_hash) VALUES (?, ?, ?, ?, ?)`).bind(userId, orgId, body.userName, body.email, passwordHash)
    ]);

    const token = await sign({ userId, orgId, role: 'USER' }, c.env.JWT_SECRET);
    return c.json({ message: 'Conta criada com sucesso', token, orgId }, 201);
  } catch (error) {
    return c.json({ error: 'Erro ao criar conta. Email já existe?' }, 400);
  }
});

app.post('/api/auth/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const db = c.env.DB;

  const user: any = await db.prepare(`SELECT * FROM users WHERE email = ?`).bind(email).first();
  
  if (!user || user.password_hash !== `hashed_${password}`) {
    return c.json({ error: 'Credenciais inválidas' }, 401);
  }

  const token = await sign({ userId: user.id, orgId: user.org_id, role: user.role }, c.env.JWT_SECRET);
  return c.json({ token, orgId: user.org_id });
});

// =========================================================================
// Middleware de Autenticação (Aplica nas rotas abaixo)
// =========================================================================
app.use('/api/app/*', async (c, next) => {
  const jwtMiddleware = jwt({ secret: c.env.JWT_SECRET });
  return jwtMiddleware(c, next);
});

// =========================================================================
// 📊 2. MOTOR GEO-BI (SALVANDO OS JSONs DE 2KB)
// =========================================================================

// Salvar um novo projeto (Dashboard)
app.post('/api/app/projects', zValidator('json', projectSchema), async (c) => {
  const payload = c.get('jwtPayload'); // Pega dados do usuário logado
  const body = c.req.valid('json');
  const db = c.env.DB;

  const projectId = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO projects (id, org_id, user_id, name, description, state_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(projectId, payload.orgId, payload.userId, body.name, body.description || '', body.state_json).run();

  return c.json({ message: 'Projeto salvo com sucesso!', id: projectId }, 201);
});

// Carregar projetos (O usuário só vê os da organização dele)
app.get('/api/app/projects', async (c) => {
  const payload = c.get('jwtPayload');
  const db = c.env.DB;

  const { results } = await db.prepare(`SELECT id, name, description, updated_at FROM projects WHERE org_id = ? ORDER BY updated_at DESC`).bind(payload.orgId).all();
  return c.json(results);
});

// Carregar O ESTADO de um projeto específico para remontar o painel
app.get('/api/app/projects/:id', async (c) => {
  const payload = c.get('jwtPayload');
  const db = c.env.DB;
  const projectId = c.req.param('id');

  const project: any = await db.prepare(`SELECT state_json FROM projects WHERE id = ? AND org_id = ?`).bind(projectId, payload.orgId).first();
  
  if (!project) return c.json({ error: 'Projeto não encontrado' }, 404);
  
  return c.json({ state_json: JSON.parse(project.state_json) });
});

// =========================================================================
// 🛒 3. MARKETPLACE E ANONIMIZAÇÃO (FASE 3.0 READY)
// =========================================================================

// 🚫 REGRA 1: Cotações/Lances são privados.
app.get('/api/app/market/bids/:listId', async (c) => {
  const payload = c.get('jwtPayload');
  const listId = c.req.param('listId');
  const db = c.env.DB;

  // Só retorna os lances se quem estiver pedindo for o DONO da lista ou o próprio DISTRIBUIDOR que deu o lance.
  // A concorrência nunca vê isso.
  const query = `
    SELECT b.* FROM bids b 
    JOIN demand_lists dl ON b.list_id = dl.id
    WHERE b.list_id = ? AND (dl.retailer_org_id = ? OR b.distributor_org_id = ?)
  `;
  const { results } = await db.prepare(query).bind(listId, payload.orgId, payload.orgId).all();
  return c.json(results);
});

// 🌍 REGRA 2: Analytics Georreferenciado Anonimizado
app.get('/api/app/analytics/regional', async (c) => {
  const db = c.env.DB;
  const region = c.req.query('region') || 'Varginha';

  // Observe o SQL: Nós não expomos NENHUM org_id, nem quem comprou, nem quem vendeu.
  // Fazemos uma AGREGAÇÃO (SUM, COUNT) agrupada por produto e região.
  const query = `
    SELECT 
      di.product_name,
      SUM(di.quantity) as total_volume_sold,
      AVG(di.target_price) as avg_price_practiced,
      COUNT(DISTINCT dl.retailer_org_id) as unique_buyers_count 
    FROM demand_items di
    JOIN demand_lists dl ON di.list_id = dl.id
    WHERE dl.status = 'FULFILLED' AND dl.region = ? 
    GROUP BY di.product_name
    HAVING unique_buyers_count > 3 -- Regra de K-Anonymity: Só exibe se pelo menos 3 comércios diferentes compraram, para não vazar a estratégia de 1 só.
  `;
  
  const { results } = await db.prepare(query).bind(region).all();
  return c.json({ region, analytics: results });
});

export default app;