let cachedToken = null;
let cachedTokenExpiresAt = 0;

export class DropboxApiError extends Error {
  constructor(message, { status = 502, code = "DROPBOX_ERROR", stage = "dropbox", details = null } = {}) {
    super(message);
    this.name = "DropboxApiError";
    this.status = status;
    this.code = code;
    this.stage = stage;
    this.details = details;
  }
}

function requireDropboxEnv(env) {
  const missing = ["DROPBOX_APP_KEY", "DROPBOX_APP_SECRET", "DROPBOX_REFRESH_TOKEN"].filter(
    (key) => !env?.[key]
  );

  if (missing.length) {
    throw new DropboxApiError("Credenciais do Dropbox não configuradas.", {
      status: 500,
      code: "DROPBOX_CONFIG_MISSING",
      stage: "dropbox.config",
      details: { missing },
    });
  }
}

async function readJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function getPathRootHeader(env) {
  return env?.DROPBOX_ROOT_NAMESPACE_ID
    ? { "Dropbox-API-Path-Root": JSON.stringify({ ".tag": "namespace_id", namespace_id: env.DROPBOX_ROOT_NAMESPACE_ID }) }
    : {};
}

export async function getDropboxAccessToken(env) {
  requireDropboxEnv(env);

  const now = Date.now();
  if (cachedToken && cachedTokenExpiresAt - 60_000 > now) return cachedToken;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: env.DROPBOX_REFRESH_TOKEN,
    client_id: env.DROPBOX_APP_KEY,
    client_secret: env.DROPBOX_APP_SECRET,
  });

  const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = await readJsonSafe(response);
  if (!response.ok || !payload?.access_token) {
    throw new DropboxApiError("Não foi possível renovar o token do Dropbox.", {
      status: 502,
      code: "DROPBOX_TOKEN_REFRESH_FAILED",
      stage: "dropbox.token",
      details: payload,
    });
  }

  cachedToken = payload.access_token;
  cachedTokenExpiresAt = now + Number(payload.expires_in || 14_400) * 1000;
  return cachedToken;
}

async function dropboxRpc(env, endpoint, body, stage) {
  const token = await getDropboxAccessToken(env);
  const response = await fetch(`https://api.dropboxapi.com/2/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...getPathRootHeader(env),
    },
    body: JSON.stringify(body || {}),
  });

  const payload = await readJsonSafe(response);
  if (!response.ok) {
    throw new DropboxApiError(`Falha na API do Dropbox (${endpoint}).`, {
      status: response.status >= 500 ? 502 : response.status,
      code: "DROPBOX_RPC_FAILED",
      stage,
      details: payload,
    });
  }

  return payload;
}

function errorText(error) {
  try {
    return JSON.stringify(error?.details || error || {}).toLowerCase();
  } catch {
    return String(error || "").toLowerCase();
  }
}

function isFolderAlreadyPresent(error) {
  const text = errorText(error);
  return text.includes("path/conflict/folder") || (text.includes("conflict") && text.includes("folder"));
}

function isPathNotFound(error) {
  const text = errorText(error);
  return text.includes("path/not_found") || text.includes("not_found");
}

function normalizeDropboxPath(path) {
  const normalized = `/${String(path || "").replace(/^\/+|\/+$/g, "")}`;
  if (normalized === "/") {
    throw new DropboxApiError("Caminho do Dropbox inválido.", {
      status: 500,
      code: "DROPBOX_PATH_INVALID",
      stage: "dropbox.path",
    });
  }
  return normalized;
}

export async function ensureDropboxFolder(env, path) {
  const normalized = normalizeDropboxPath(path);
  const segments = normalized.split("/").filter(Boolean);
  let current = "";

  for (const segment of segments) {
    current += `/${segment}`;
    try {
      await dropboxRpc(
        env,
        "files/create_folder_v2",
        { path: current, autorename: false },
        "dropbox.create_folder"
      );
    } catch (error) {
      if (!isFolderAlreadyPresent(error)) throw error;
    }
  }

  return normalized;
}

export async function uploadDropboxFile(env, path, bytes, { mode = "add" } = {}) {
  const normalized = normalizeDropboxPath(path);
  const token = await getDropboxAccessToken(env);

  const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({
        path: normalized,
        mode,
        autorename: false,
        mute: false,
        strict_conflict: true,
      }),
      "Content-Type": "application/octet-stream",
      ...getPathRootHeader(env),
    },
    body: bytes,
  });

  const payload = await readJsonSafe(response);
  if (!response.ok) {
    throw new DropboxApiError("Não foi possível enviar o arquivo ao Dropbox.", {
      status: response.status >= 500 ? 502 : response.status,
      code: "DROPBOX_UPLOAD_FAILED",
      stage: "dropbox.upload",
      details: payload,
    });
  }

  return payload;
}

export async function downloadDropboxFile(env, path) {
  const normalized = normalizeDropboxPath(path);
  const token = await getDropboxAccessToken(env);

  const response = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({ path: normalized }),
      ...getPathRootHeader(env),
    },
  });

  if (!response.ok) {
    const payload = await readJsonSafe(response);
    throw new DropboxApiError("Não foi possível baixar o arquivo do Dropbox.", {
      status: response.status === 409 ? 404 : response.status >= 500 ? 502 : response.status,
      code: "DROPBOX_DOWNLOAD_FAILED",
      stage: "dropbox.download",
      details: payload,
    });
  }

  let metadata = null;
  const metadataHeader = response.headers.get("Dropbox-API-Result");
  if (metadataHeader) {
    try {
      metadata = JSON.parse(metadataHeader);
    } catch {
      metadata = null;
    }
  }

  return { bytes: await response.arrayBuffer(), metadata };
}

export async function deleteDropboxFileIfExists(env, path) {
  const normalized = normalizeDropboxPath(path);
  try {
    return await dropboxRpc(
      env,
      "files/delete_v2",
      { path: normalized },
      "dropbox.delete"
    );
  } catch (error) {
    if (isPathNotFound(error)) return null;
    throw error;
  }
}
