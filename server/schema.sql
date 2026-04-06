-- Tabela de Assinaturas / Empresas (O coração do SaaS)
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE ou SUSPENDED
  max_users INTEGER NOT NULL DEFAULT 5,
  expires_at TEXT, -- Se for NULL, o contrato é vitalício
  created_at TEXT NOT NULL
);

-- Tabela de Usuários vinculada à Organização
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'VIEWER', -- SUPER_ADMIN, MASTER, EDITOR, VIEWER
  created_at TEXT NOT NULL,
  FOREIGN KEY(organization_id) REFERENCES organizations(id)
);

-- Tabela de Projetos vinculada à Organização e ao Usuário
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  json_data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(organization_id) REFERENCES organizations(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);