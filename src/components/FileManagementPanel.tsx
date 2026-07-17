import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileText,
  FolderSync,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { ApiRequestError, maonoApi, type OrganizationFile } from "../services/api";

type Organization = {
  id: string;
  name: string;
  status?: string;
  dropbox_folder_path?: string | null;
  storage_status?: string | null;
  storage_error?: string | null;
};

type Project = {
  id: string;
  name: string;
  organizationId?: string;
};

type UserSession = {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  organization_name?: string;
};

const UPLOAD_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "OWNER", "MASTER", "EDITOR"]);
const DELETE_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "OWNER", "MASTER"]);

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function normalizeRole(role?: string) {
  return String(role || "VIEWER").toUpperCase();
}

function describeError(error: unknown) {
  if (error instanceof ApiRequestError) {
    const details = [
      error.code ? `código ${error.code}` : null,
      error.stage ? `etapa ${error.stage}` : null,
      error.requestId ? `requisição ${error.requestId}` : null,
    ].filter(Boolean);
    return details.length ? `${error.message} (${details.join(" · ")})` : error.message;
  }
  return error instanceof Error ? error.message : "Erro inesperado.";
}

export default function FileManagementPanel() {
  const token = localStorage.getItem("@maono:token") || "";
  const [session, setSession] = useState<UserSession | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [files, setFiles] = useState<OrganizationFile[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [isBooting, setIsBooting] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [busyFileId, setBusyFileId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const role = normalizeRole(session?.role);
  const canUpload = UPLOAD_ROLES.has(role);
  const canDelete = DELETE_ROLES.has(role);
  const isSuperAdmin = role === "SUPER_ADMIN";

  const activeOrganizationId = selectedOrganizationId || session?.organization_id || "";
  const activeOrganization = useMemo(
    () => organizations.find((organization) => organization.id === activeOrganizationId) || null,
    [activeOrganizationId, organizations]
  );

  const filteredFiles = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return files;
    return files.filter((file) =>
      [file.originalName, file.projectName, file.uploadedByEmail, file.extension]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [files, search]);

  const loadSession = useCallback(async () => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setIsBooting(true);
    setError(null);
    try {
      const me = await maonoApi.getMe(token);
      const currentUser = me.user as UserSession;
      setSession(currentUser);

      if (normalizeRole(currentUser.role) === "SUPER_ADMIN") {
        const result = await maonoApi.getOrganizations(token);
        const availableOrganizations = (result.organizations || []) as Organization[];
        setOrganizations(availableOrganizations);
        setSelectedOrganizationId((current) => current || availableOrganizations[0]?.id || "");
      } else {
        const ownOrganization: Organization = {
          id: currentUser.organization_id,
          name: currentUser.organization_name || "Minha organização",
          storage_status: "READY",
        };
        setOrganizations([ownOrganization]);
        setSelectedOrganizationId(currentUser.organization_id);
      }
    } catch (loadError) {
      setError(describeError(loadError));
    } finally {
      setIsBooting(false);
    }
  }, [token]);

  const loadWorkspace = useCallback(async () => {
    if (!token || !activeOrganizationId) return;

    setIsLoading(true);
    setError(null);
    try {
      const [fileResult, projectResult] = await Promise.all([
        maonoApi.getOrganizationFiles(token, activeOrganizationId),
        maonoApi.getProjects(token, activeOrganizationId),
      ]);
      setFiles(fileResult.files || []);
      setProjects((projectResult.projects || []) as Project[]);
    } catch (loadError) {
      setError(describeError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [activeOrganizationId, token]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!isBooting && activeOrganizationId) loadWorkspace();
  }, [activeOrganizationId, isBooting, loadWorkspace]);

  const handleUpload = async () => {
    if (!selectedFile || !activeOrganizationId || !token) return;

    setIsUploading(true);
    setMessage(null);
    setError(null);
    try {
      await maonoApi.uploadOrganizationFile(
        token,
        activeOrganizationId,
        selectedFile,
        selectedProjectId || undefined
      );
      setSelectedFile(null);
      setSelectedProjectId("");
      const input = document.getElementById("organization-file-input") as HTMLInputElement | null;
      if (input) input.value = "";
      setMessage("Arquivo enviado e catalogado com sucesso.");
      await loadWorkspace();
    } catch (uploadError) {
      setError(describeError(uploadError));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (file: OrganizationFile) => {
    if (!token) return;
    setBusyFileId(file.id);
    setError(null);
    try {
      const result = await maonoApi.downloadOrganizationFile(token, file.id, file.originalName);
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(describeError(downloadError));
    } finally {
      setBusyFileId(null);
    }
  };

  const handleDelete = async (file: OrganizationFile) => {
    if (!token || !canDelete) return;
    if (!window.confirm(`Excluir definitivamente o arquivo “${file.originalName}”?`)) return;

    setBusyFileId(file.id);
    setMessage(null);
    setError(null);
    try {
      await maonoApi.deleteOrganizationFile(token, file.id);
      setMessage("Arquivo excluído do Dropbox e marcado como removido no catálogo.");
      await loadWorkspace();
    } catch (deleteError) {
      setError(describeError(deleteError));
    } finally {
      setBusyFileId(null);
    }
  };

  const handleProvisionStorage = async () => {
    if (!token || !activeOrganizationId || !isSuperAdmin) return;
    setIsLoading(true);
    setMessage(null);
    setError(null);
    try {
      await maonoApi.provisionOrganizationStorage(token, activeOrganizationId);
      setMessage("Pasta da organização sincronizada com o Dropbox.");
      await loadSession();
    } catch (provisionError) {
      setError(describeError(provisionError));
    } finally {
      setIsLoading(false);
    }
  };

  if (isBooting) {
    return (
      <div className="flex h-full items-center justify-center bg-[#020305] text-[#C5A059]">
        <RefreshCw className="mr-3 h-5 w-5 animate-spin" />
        Carregando arquivos e permissões...
      </div>
    );
  }

  return (
    <section className="min-h-full bg-[#020305] px-6 py-7 text-slate-100 lg:px-10">
      <header className="mb-6 flex flex-col gap-4 border-l-2 border-[#C5A059] pl-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#C5A059]">
            Maõno Maps · armazenamento organizacional
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">Arquivos e Documentos</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Os binários ficam no Dropbox App Folder. O D1 mantém metadados, vínculo com organização e projeto, estado da operação e auditoria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-[#C5A059]/30 bg-[#C5A059]/10 px-3 py-2 text-xs font-bold text-[#E7C979]">
            {session?.email} · {role}
          </span>
          <button
            type="button"
            onClick={loadWorkspace}
            disabled={isLoading || !activeOrganizationId}
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-[#0a0f18] px-3 py-2 text-xs font-bold text-slate-200 hover:border-[#C5A059]/50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-500/35 bg-emerald-950/25 p-4 text-sm text-emerald-200">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="mb-5 grid gap-4 rounded-xl border border-[#182235] bg-[#070b12] p-4 lg:grid-cols-[1.2fr_1fr_auto]">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Organização
          <select
            value={activeOrganizationId}
            disabled={!isSuperAdmin}
            onChange={(event) => {
              setSelectedOrganizationId(event.target.value);
              setSelectedProjectId("");
              setMessage(null);
            }}
            className="mt-2 w-full rounded-md border border-[#243047] bg-[#0a0f18] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-[#C5A059] disabled:opacity-70"
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-lg border border-[#182235] bg-[#05080d] p-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Armazenamento</p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <FolderSync className="h-4 w-4 text-[#C5A059]" />
            <span className="font-bold text-slate-200">
              {activeOrganization?.storage_status || "PENDING"}
            </span>
          </div>
          {activeOrganization?.storage_error && (
            <p className="mt-2 line-clamp-2 text-xs text-red-300">{activeOrganization.storage_error}</p>
          )}
        </div>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={handleProvisionStorage}
            disabled={!activeOrganizationId || isLoading}
            className="self-end rounded-md border border-[#C5A059]/40 bg-[#17140c] px-4 py-2.5 text-xs font-extrabold text-[#E7C979] hover:bg-[#211c10] disabled:opacity-50"
          >
            Sincronizar pasta
          </button>
        )}
      </div>

      <div className="mb-5 grid gap-4 rounded-xl border border-[#182235] bg-[#070b12] p-4 xl:grid-cols-[1.2fr_1fr_auto]">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Arquivo
          <input
            id="organization-file-input"
            type="file"
            disabled={!canUpload || isUploading}
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            className="mt-2 block w-full rounded-md border border-dashed border-[#34425c] bg-[#0a0f18] px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-[#C5A059] file:px-3 file:py-1.5 file:text-xs file:font-black file:text-[#08090B] disabled:opacity-50"
          />
          <span className="mt-2 block normal-case tracking-normal text-slate-600">
            GeoJSON, JSON, CSV, XLSX, PDF, imagens e pacotes geográficos. Limite padrão: 25 MB.
          </span>
        </label>

        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Projeto relacionado (opcional)
          <select
            value={selectedProjectId}
            disabled={!canUpload || isUploading}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            className="mt-2 w-full rounded-md border border-[#243047] bg-[#0a0f18] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-[#C5A059] disabled:opacity-50"
          >
            <option value="">Arquivo geral da organização</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleUpload}
          disabled={!canUpload || !selectedFile || isUploading || !activeOrganizationId}
          className="inline-flex self-end items-center justify-center gap-2 rounded-md bg-[#C5A059] px-5 py-2.5 text-sm font-black text-[#08090B] hover:bg-[#E0BE70] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {isUploading ? "Enviando..." : "Enviar arquivo"}
        </button>
      </div>

      {!canUpload && (
        <p className="mb-4 rounded-md border border-slate-800 bg-[#070b12] px-4 py-3 text-xs text-slate-500">
          Seu perfil possui acesso de leitura. O backend bloqueará upload e exclusão mesmo que a interface seja alterada.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-[#182235] bg-[#070b12]">
        <div className="flex flex-col gap-3 border-b border-[#182235] p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-black text-slate-100">Catálogo da organização</h2>
            <p className="mt-1 text-xs text-slate-500">{files.length} arquivo(s) ativo(s)</p>
          </div>
          <label className="relative block md:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, projeto ou usuário"
              className="w-full rounded-md border border-[#243047] bg-[#0a0f18] py-2 pl-9 pr-3 text-sm text-slate-200 outline-none focus:border-[#C5A059]"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#0a0f18] text-[10px] uppercase tracking-wider text-[#C5A059]">
              <tr>
                <th className="px-4 py-3">Arquivo</th>
                <th className="px-4 py-3">Projeto</th>
                <th className="px-4 py-3">Tamanho</th>
                <th className="px-4 py-3">Enviado por</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#182235]">
              {filteredFiles.map((file) => (
                <tr key={file.id} className="hover:bg-[#0b111b]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded-md border border-[#C5A059]/20 bg-[#C5A059]/5 p-2 text-[#C5A059]">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="max-w-[320px] truncate font-bold text-slate-100" title={file.originalName}>
                          {file.originalName}
                        </p>
                        <p className="mt-1 text-[10px] uppercase text-slate-600">.{file.extension} · {file.status}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{file.projectName || "Organização"}</td>
                  <td className="px-4 py-3 text-slate-400">{formatBytes(file.sizeBytes)}</td>
                  <td className="px-4 py-3 text-slate-400">{file.uploadedByEmail || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(file.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(file)}
                        disabled={busyFileId === file.id}
                        className="rounded-md border border-[#243047] p-2 text-slate-400 hover:border-[#C5A059]/50 hover:text-[#C5A059] disabled:opacity-40"
                        title="Baixar"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(file)}
                          disabled={busyFileId === file.id}
                          className="rounded-md border border-red-900/60 p-2 text-red-400 hover:border-red-500/60 hover:bg-red-950/30 disabled:opacity-40"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredFiles.length === 0 && (
          <div className="flex flex-col items-center px-6 py-16 text-center text-slate-500">
            <FileText className="mb-4 h-10 w-10 text-slate-700" />
            <p className="font-bold text-slate-300">Nenhum arquivo encontrado</p>
            <p className="mt-2 max-w-md text-sm">
              Envie o primeiro documento da organização ou ajuste o texto da busca.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
