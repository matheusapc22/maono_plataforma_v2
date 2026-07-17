import {normalizeRole} from "../lib/file-policy.js";
import {
  ApiError, assertOrganizationAccess, ensureOrganizationStorage, jsonResponse, mapFileRow,
  requireAuth, requireOrganization, requireProjectInOrganization, safe, writeAudit,
} from "./context.js";

export function registerListAndProvisionRoutes(router) {
  router.get("/organizations/:id/files", safe(async (request, env) => {
    const user = await requireAuth(request, env);
    const organizationId = request.params.id;
    assertOrganizationAccess(user, "file.list", organizationId);
    await requireOrganization(env, organizationId);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const search = String(url.searchParams.get("search") || "").trim();
    if (projectId) await requireProjectInOrganization(env, projectId, organizationId);
    const conditions = ["f.organization_id = ?", "f.status = 'ACTIVE'"];
    const bindings = [organizationId];
    if (projectId) { conditions.push("f.project_id = ?"); bindings.push(projectId); }
    if (search) { conditions.push("lower(f.original_name) LIKE lower(?)"); bindings.push(`%${search}%`); }
    const result = await env.DB.prepare(`
      SELECT f.*, p.name AS project_name, u.email AS uploaded_by_email
      FROM organization_files f
      LEFT JOIN projects p ON p.id = f.project_id
      LEFT JOIN users u ON u.id = f.uploaded_by
      WHERE ${conditions.join(" AND ")}
      ORDER BY f.created_at DESC LIMIT 500
    `).bind(...bindings).all();
    return jsonResponse(request, env, {files: (result.results || []).map(mapFileRow)});
  }));

  router.post("/organizations/:id/storage/provision", safe(async (request, env) => {
    const user = await requireAuth(request, env);
    if (normalizeRole(user.role) !== "SUPER_ADMIN") {
      throw new ApiError("Apenas o Super Admin pode provisionar o armazenamento.", {status: 403, code: "STORAGE_PROVISION_FORBIDDEN", stage: "authorization"});
    }
    const organization = await requireOrganization(env, request.params.id);
    const storage = await ensureOrganizationStorage(env, organization);
    await writeAudit(env, request, user, "organization.storage.provision", "organization", organization.id, organization.id, storage);
    return jsonResponse(request, env, {message: "Armazenamento provisionado.", storage});
  }));
}
