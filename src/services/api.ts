// src/services/api.ts

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/+$/, "");

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  stage?: string;
  requestId?: string;

  constructor(
    message: string,
    options: { status: number; code?: string; stage?: string; requestId?: string }
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options.status;
    this.code = options.code;
    this.stage = options.stage;
    this.requestId = options.requestId;
  }
}

export type OrganizationFile = {
  id: string;
  organizationId: string;
  projectId?: string | null;
  projectName?: string | null;
  uploadedBy: string;
  uploadedByEmail?: string | null;
  originalName: string;
  storedName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  contentHash?: string | null;
  revision?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

async function parseResponseBody(response: Response) {
  const contentType = response.headers.get("Content-Type") || "";
  if (response.status === 204) return null;
  if (contentType.includes("application/json")) {
    try { return await response.json(); } catch { return null; }
  }
  return response.text();
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  const payload = await parseResponseBody(response);
  if (!response.ok) {
    const objectPayload = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    throw new ApiRequestError(String(objectPayload.error || payload || "Erro ao processar a requisição."), {
      status: response.status,
      code: objectPayload.code ? String(objectPayload.code) : undefined,
      stage: objectPayload.stage ? String(objectPayload.stage) : undefined,
      requestId: (objectPayload.requestId ? String(objectPayload.requestId) : undefined) || response.headers.get("X-Request-Id") || undefined,
    });
  }
  return payload as T;
}

function authHeaders(token: string, extra: HeadersInit = {}): HeadersInit {
  return {Authorization: `Bearer ${token}`, ...extra};
}

function getDownloadFileName(response: Response, fallback: string) {
  const disposition = response.headers.get("Content-Disposition") || "";
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try { return decodeURIComponent(encoded); } catch { return fallback; }
  }
  return fallback;
}

export const maonoApi = {
  getCatalog: async () => requestJson<{ datasets: unknown[] }>("/catalog"),
  login: async (email: string, password: string) => requestJson<{ token: string }>("/auth/login", {
    method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, password}),
  }),
  getMe: async (token: string) => requestJson<{ user: any }>("/auth/me", {headers: authHeaders(token)}),
  getOrganizations: async (token: string) => requestJson<{ organizations: any[] }>("/organizations", {headers: authHeaders(token)}),
  createOrganization: async (token: string, data: { name: string; max_users: number }) => requestJson<any>("/organizations", {
    method: "POST", headers: authHeaders(token, {"Content-Type": "application/json"}), body: JSON.stringify(data),
  }),
  updateOrganizationStatus: async (token: string, orgId: string, status: string) => requestJson<any>(`/organizations/${encodeURIComponent(orgId)}/status`, {
    method: "PUT", headers: authHeaders(token, {"Content-Type": "application/json"}), body: JSON.stringify({status}),
  }),
  provisionOrganizationStorage: async (token: string, orgId: string) => requestJson<any>(`/organizations/${encodeURIComponent(orgId)}/storage/provision`, {
    method: "POST", headers: authHeaders(token),
  }),
  getUsers: async (token: string) => requestJson<{ users: any[] }>("/users", {headers: authHeaders(token)}),
  createUser: async (token: string, data: any) => requestJson<any>("/users", {
    method: "POST", headers: authHeaders(token, {"Content-Type": "application/json"}), body: JSON.stringify(data),
  }),
  deleteUser: async (token: string, userId: string) => requestJson<any>(`/users/${encodeURIComponent(userId)}`, {
    method: "DELETE", headers: authHeaders(token),
  }),
  getProjects: async (token: string, organizationId?: string) => {
    const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : "";
    return requestJson<{ projects: any[] }>(`/projects${query}`, {headers: authHeaders(token)});
  },
  getOrganizationFiles: async (token: string, organizationId: string, options: { projectId?: string; search?: string } = {}) => {
    const params = new URLSearchParams();
    if (options.projectId) params.set("projectId", options.projectId);
    if (options.search) params.set("search", options.search);
    const query = params.toString() ? `?${params.toString()}` : "";
    return requestJson<{ files: OrganizationFile[] }>(`/organizations/${encodeURIComponent(organizationId)}/files${query}`, {headers: authHeaders(token)});
  },
  uploadOrganizationFile: async (token: string, organizationId: string, file: File, projectId?: string) => {
    const form = new FormData();
    form.set("file", file);
    if (projectId) form.set("projectId", projectId);
    return requestJson<{ file: OrganizationFile; idempotent?: boolean }>(`/organizations/${encodeURIComponent(organizationId)}/files`, {
      method: "POST", headers: authHeaders(token, {"Idempotency-Key": crypto.randomUUID()}), body: form,
    });
  },
  downloadOrganizationFile: async (token: string, fileId: string, fallbackName = "arquivo") => {
    const response = await fetch(`${API_URL}/files/${encodeURIComponent(fileId)}/download`, {headers: authHeaders(token)});
    if (!response.ok) {
      const payload = await parseResponseBody(response);
      const objectPayload = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
      throw new ApiRequestError(String(objectPayload.error || payload || "Não foi possível baixar o arquivo."), {
        status: response.status,
        code: objectPayload.code ? String(objectPayload.code) : undefined,
        stage: objectPayload.stage ? String(objectPayload.stage) : undefined,
        requestId: (objectPayload.requestId ? String(objectPayload.requestId) : undefined) || response.headers.get("X-Request-Id") || undefined,
      });
    }
    return {blob: await response.blob(), fileName: getDownloadFileName(response, fallbackName)};
  },
  deleteOrganizationFile: async (token: string, fileId: string) => requestJson<any>(`/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE", headers: authHeaders(token),
  }),
};
