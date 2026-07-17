const ROLE_ALIASES = Object.freeze({
  MASTER: "OWNER",
});

const READ_ROLES = new Set(["ADMIN", "OWNER", "EDITOR", "VIEWER"]);
const UPLOAD_ROLES = new Set(["ADMIN", "OWNER", "EDITOR"]);
const DELETE_ROLES = new Set(["ADMIN", "OWNER"]);

export const ALLOWED_FILE_EXTENSIONS = new Set([
  "csv",
  "dbf",
  "geojson",
  "gpkg",
  "jpeg",
  "jpg",
  "json",
  "kml",
  "kmz",
  "pdf",
  "png",
  "prj",
  "shp",
  "shx",
  "xls",
  "xlsx",
  "zip",
]);

export function normalizeRole(role) {
  const normalized = String(role || "").trim().toUpperCase();
  return ROLE_ALIASES[normalized] || normalized;
}

export function canFileAction(user, action, targetOrganizationId) {
  if (!user || !targetOrganizationId) return false;

  const role = normalizeRole(user.role);
  if (role === "SUPER_ADMIN") return true;

  if (String(user.org || "") !== String(targetOrganizationId)) return false;

  switch (action) {
    case "file.list":
    case "file.read":
    case "file.download":
      return READ_ROLES.has(role);
    case "file.upload":
      return UPLOAD_ROLES.has(role);
    case "file.delete":
      return DELETE_ROLES.has(role);
    default:
      return false;
  }
}

export function sanitizePathSegment(value) {
  const safe = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  if (!safe || safe === "." || safe === "..") {
    throw new Error("Identificador inválido para caminho de armazenamento.");
  }

  return safe;
}

export function sanitizeFileName(fileName) {
  const raw = String(fileName || "arquivo")
    .replace(/[\\/]+/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._() -]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 180);

  return raw || "arquivo";
}

export function getFileExtension(fileName) {
  const safe = sanitizeFileName(fileName);
  const dot = safe.lastIndexOf(".");
  if (dot <= 0 || dot === safe.length - 1) return "";
  return safe.slice(dot + 1).toLowerCase();
}

export function validateUploadFile(file, maxBytes) {
  if (!file || typeof file.name !== "string" || typeof file.arrayBuffer !== "function") {
    return { ok: false, code: "FILE_REQUIRED", message: "Selecione um arquivo válido." };
  }

  const size = Number(file.size || 0);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, code: "FILE_EMPTY", message: "O arquivo está vazio." };
  }

  if (size > maxBytes) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: `O arquivo excede o limite de ${maxBytes} bytes.`,
    };
  }

  const extension = getFileExtension(file.name);
  if (!ALLOWED_FILE_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      code: "FILE_TYPE_NOT_ALLOWED",
      message: `A extensão .${extension || "desconhecida"} não é permitida.`,
    };
  }

  return {
    ok: true,
    extension,
    mimeType: String(file.type || "application/octet-stream"),
    sanitizedName: sanitizeFileName(file.name),
  };
}

export function buildOrganizationFolder(organizationId) {
  return `/organizations/${sanitizePathSegment(organizationId)}`;
}

export function buildStorageFolder(organizationId, projectId) {
  const organizationFolder = buildOrganizationFolder(organizationId);
  if (!projectId) return `${organizationFolder}/files`;
  return `${organizationFolder}/projects/${sanitizePathSegment(projectId)}/files`;
}

export function buildStoredFileName(fileId, originalName) {
  return `${sanitizePathSegment(fileId)}-${sanitizeFileName(originalName)}`;
}

export function buildDropboxFilePath({ organizationId, projectId, fileId, originalName }) {
  return `${buildStorageFolder(organizationId, projectId)}/${buildStoredFileName(fileId, originalName)}`;
}
