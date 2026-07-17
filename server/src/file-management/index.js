import {registerListAndProvisionRoutes} from "./routes-list.js";
import {registerUploadRoute} from "./routes-upload.js";
import {registerDownloadDeleteRoutes} from "./routes-download-delete.js";
export {ensureOrganizationStorage} from "./context.js";

export function registerFileManagementRoutes(router) {
  registerListAndProvisionRoutes(router);
  registerUploadRoute(router);
  registerDownloadDeleteRoutes(router);
}
