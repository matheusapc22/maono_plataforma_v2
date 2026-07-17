-- Gestão de arquivos por organização.
-- Aplicar antes de publicar o Worker que contém as novas rotas de arquivos.

ALTER TABLE organizations ADD COLUMN dropbox_folder_path TEXT;
ALTER TABLE organizations ADD COLUMN storage_status TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE organizations ADD COLUMN storage_error TEXT;
ALTER TABLE organizations ADD COLUMN storage_updated_at TEXT;

UPDATE organizations
SET dropbox_folder_path = '/organizations/' || replace(lower(id), ' ', '-'),
    storage_status = 'PENDING',
    storage_updated_at = COALESCE(storage_updated_at, created_at)
WHERE dropbox_folder_path IS NULL;

CREATE TABLE IF NOT EXISTS organization_files (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  project_id TEXT,
  uploaded_by TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  dropbox_path TEXT NOT NULL UNIQUE,
  dropbox_file_id TEXT,
  dropbox_revision TEXT,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  extension TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  content_hash TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  idempotency_key TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY(organization_id) REFERENCES organizations(id),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY(uploaded_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_organization_files_org_status
  ON organization_files(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organization_files_project
  ON organization_files(project_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_files_idempotency
  ON organization_files(organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  organization_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
  ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs(entity_type, entity_id, created_at DESC);
