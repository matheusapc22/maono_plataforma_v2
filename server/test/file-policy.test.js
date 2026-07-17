import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDropboxFilePath,
  buildOrganizationFolder,
  canFileAction,
  normalizeRole,
  sanitizeFileName,
  validateUploadFile,
} from "../src/lib/file-policy.js";

test("normaliza o papel legado MASTER para OWNER", () => {
  assert.equal(normalizeRole("MASTER"), "OWNER");
});

test("nega acesso entre organizações", () => {
  const user = { role: "EDITOR", org: "org-a" };
  assert.equal(canFileAction(user, "file.upload", "org-b"), false);
  assert.equal(canFileAction(user, "file.read", "org-b"), false);
});

test("aplica a matriz de permissões de arquivos", () => {
  assert.equal(canFileAction({ role: "VIEWER", org: "org-a" }, "file.read", "org-a"), true);
  assert.equal(canFileAction({ role: "VIEWER", org: "org-a" }, "file.upload", "org-a"), false);
  assert.equal(canFileAction({ role: "EDITOR", org: "org-a" }, "file.upload", "org-a"), true);
  assert.equal(canFileAction({ role: "EDITOR", org: "org-a" }, "file.delete", "org-a"), false);
  assert.equal(canFileAction({ role: "OWNER", org: "org-a" }, "file.delete", "org-a"), true);
  assert.equal(canFileAction({ role: "SUPER_ADMIN", org: "org-maono" }, "file.delete", "org-b"), true);
});

test("gera caminhos determinísticos e isolados por organização", () => {
  assert.equal(buildOrganizationFolder("org-123"), "/organizations/org-123");
  assert.equal(
    buildDropboxFilePath({
      organizationId: "org-123",
      projectId: "project-456",
      fileId: "file-789",
      originalName: "Mapa Região.geojson",
    }),
    "/organizations/org-123/projects/project-456/files/file-789-Mapa-Regiao.geojson"
  );
});

test("remove segmentos de caminho do nome do arquivo", () => {
  assert.equal(sanitizeFileName("../../Mapa Cliente.geojson"), "Mapa-Cliente.geojson");
});

test("valida extensão e limite de tamanho", () => {
  const allowed = validateUploadFile(
    { name: "dados.geojson", size: 100, type: "application/geo+json", arrayBuffer() {} },
    1_000
  );
  assert.equal(allowed.ok, true);

  const blocked = validateUploadFile(
    { name: "script.exe", size: 100, type: "application/octet-stream", arrayBuffer() {} },
    1_000
  );
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, "FILE_TYPE_NOT_ALLOWED");
});
