import {deleteDropboxFileIfExists, downloadDropboxFile} from "../lib/dropbox.js";
import {
  ApiError, assertOrganizationAccess, auditStatement, getFileRecord, jsonResponse, now,
  requireAuth, responseHeaders, safe, writeAudit,
} from "./context.js";

export function registerDownloadDeleteRoutes(router) {
  router.get("/files/:id/download", safe(async (request, env) => {
    const user = await requireAuth(request, env);
    const fileRecord = await getFileRecord(env, request.params.id);
    if (!fileRecord || fileRecord.status !== "ACTIVE") throw new ApiError("Arquivo não encontrado.", {status: 404, code: "FILE_NOT_FOUND", stage: "file.download"});
    assertOrganizationAccess(user, "file.download", fileRecord.organization_id);
    const downloaded = await downloadDropboxFile(env, fileRecord.dropbox_path);
    await writeAudit(env, request, user, "file.download", "organization_file", fileRecord.id, fileRecord.organization_id, {projectId: fileRecord.project_id});
    return new Response(downloaded.bytes, {
      status: 200,
      headers: responseHeaders(request, env, {
        "Content-Type": fileRecord.mime_type || "application/octet-stream",
        "Content-Length": String(downloaded.bytes.byteLength),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileRecord.original_name)}`,
        "Cache-Control": "private, no-store",
      }),
    });
  }));

  router.delete("/files/:id", safe(async (request, env) => {
    const user = await requireAuth(request, env);
    const fileRecord = await getFileRecord(env, request.params.id);
    if (!fileRecord) throw new ApiError("Arquivo não encontrado.", {status: 404, code: "FILE_NOT_FOUND", stage: "file.delete"});
    assertOrganizationAccess(user, "file.delete", fileRecord.organization_id);
    if (fileRecord.status === "DELETED") return jsonResponse(request, env, {status: "ok", alreadyDeleted: true});
    await env.DB.prepare("UPDATE organization_files SET status = 'DELETE_PENDING', updated_at = ? WHERE id = ?")
      .bind(now(), fileRecord.id).run();
    try {
      await deleteDropboxFileIfExists(env, fileRecord.dropbox_path);
      const deletedAt = now();
      await env.DB.batch([
        env.DB.prepare(`
          UPDATE organization_files SET status = 'DELETED', deleted_at = ?, updated_at = ?, error_message = NULL WHERE id = ?
        `).bind(deletedAt, deletedAt, fileRecord.id),
        auditStatement(env, request, user, "file.delete", "organization_file", fileRecord.id, fileRecord.organization_id,
          {projectId: fileRecord.project_id, originalName: fileRecord.original_name}),
      ]);
    } catch (error) {
      await env.DB.prepare(`UPDATE organization_files SET status = 'ACTIVE', error_message = ?, updated_at = ? WHERE id = ?`)
        .bind(String(error?.message || error), now(), fileRecord.id).run();
      throw error;
    }
    return jsonResponse(request, env, {status: "ok"});
  }));
}
