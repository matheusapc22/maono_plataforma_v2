// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project
// @ts-nocheck

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch } from "react-redux";
import styled from "styled-components";
import { loadFiles } from "@kepler.gl/actions";

const TOKEN_KEY = "maono_token";
const LAST_PROJECT_ID_KEY = "maono_last_project_id";
const LAST_PROJECT_NAME_KEY = "maono_last_project_name";

const Container = styled.div`
  padding: 16px 12px 8px;
  color: ${(props) => props.theme.labelColor};
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Row = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const Input = styled.input`
  background: ${(props) => props.theme.secondaryInputBgd};
  border: 1px solid ${(props) => props.theme.secondaryInputBorderColor};
  border-radius: 4px;
  color: ${(props) => props.theme.labelColor};
  padding: 6px 10px;
  flex: 1;
`;

const Button = styled.button`
  background: ${(props) => props.theme.primaryBtnBgd};
  color: ${(props) => props.theme.primaryBtnColor};
  border: 0;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
`;

const SecondaryButton = styled.button`
  background: transparent;
  color: ${(props) => props.theme.labelColor};
  border: 1px solid ${(props) => props.theme.secondaryInputBorderColor};
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
`;

const ProjectList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ProjectCard = styled.div`
  background: ${(props) => props.theme.panelBackground};
  border: 1px solid ${(props) => props.theme.secondaryInputBorderColor};
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const ProjectTitle = styled.div`
  font-weight: 600;
`;

const CityMapWrapper = styled.div`
  border: 1px solid ${(props) => props.theme.secondaryInputBorderColor};
  border-radius: 6px;
  overflow: hidden;
`;

const Muted = styled.div`
  opacity: 0.8;
  font-size: 0.85em;
`;

const ErrorText = styled.div`
  color: ${(props) => props.theme.errorColor};
  font-size: 0.85em;
`;

const defaultMapCenter = [-14.235, -51.9253];

const apiBaseUrl =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

async function requestJson(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      throw new Error(data.error || "Erro ao conectar ao servidor.");
    }
    const message = await response.text();
    throw new Error(message || "Erro ao conectar ao servidor.");
  }

  return response.json();
}

export default function MyProjects() {
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [projects, setProjects] = useState([]);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [cityField, setCityField] = useState("cidade");
  const [cityResult, setCityResult] = useState(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const headers = useMemo(
    () => ({ Authorization: token ? `Bearer ${token}` : "" }),
    [token]
  );

  const loadProjects = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      const data = await requestJson("/projects", { headers });
      setProjects(data.projects ?? []);
    } catch (err) {
      setError(err.message);
    }
  }, [headers, token]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) {
      return;
    }
    const leaflet = window.L;
    if (!leaflet) {
      return;
    }

    const map = leaflet
      .map(mapContainerRef.current)
      .setView(defaultMapCenter, 4);
    leaflet
      .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      })
      .addTo(map);
    mapInstanceRef.current = map;
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !cityResult) {
      return;
    }
    const leaflet = window.L;
    if (!leaflet) {
      return;
    }
    mapInstanceRef.current.setView([cityResult.lat, cityResult.lon], 11);
    if (markerRef.current) {
      markerRef.current.remove();
    }
    markerRef.current = leaflet
      .marker([cityResult.lat, cityResult.lon])
      .addTo(mapInstanceRef.current)
      .bindPopup(cityResult.name)
      .openPopup();
  }, [cityResult]);

  const handleAuth = async (mode) => {
    if (!email || !password) {
      setError("Informe email e senha.");
      return;
    }
    setStatus(mode === "login" ? "Entrando..." : "Criando conta...");
    setError("");
    try {
      const data = await requestJson(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setEmail("");
      setPassword("");
      setStatus("Autenticado!");
      await loadProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setStatus("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setProjects([]);
  };

  const handleCitySearch = async () => {
    if (!cityQuery.trim()) {
      setError("Informe uma cidade para localizar.");
      return;
    }
    setStatus("Buscando cidade...");
    setError("");
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          cityQuery
        )}`
      );
      const data = await response.json();
      if (!data.length) {
        setError("Cidade não encontrada.");
        setCityResult(null);
        return;
      }
      const first = data[0];
      setCityResult({
        name: first.display_name,
        lat: Number(first.lat),
        lon: Number(first.lon),
      });
    } catch (err) {
      setError("Falha ao buscar cidade.");
    } finally {
      setStatus("");
    }
  };

  const handleOpenProject = async (projectId) => {
    setStatus("Carregando projeto...");
    setError("");
    try {
      const params = new URLSearchParams();
      if (cityResult?.name) {
        params.set("city", cityQuery.trim());
        params.set("field", cityField.trim() || "cidade");
      }
      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await requestJson(`/projects/${projectId}${query}`, {
        headers,
      });
      const filename = `${data.name || "project"}.json`;
      const blob = new Blob([JSON.stringify(data.keplerJson)], {
        type: "application/json",
      });
      const file = new File([blob], filename, { type: "application/json" });
      localStorage.setItem(LAST_PROJECT_ID_KEY, projectId);
      localStorage.setItem(LAST_PROJECT_NAME_KEY, data.name || "Projeto");
      dispatch(loadFiles([file]));
    } catch (err) {
      setError(err.message);
    } finally {
      setStatus("");
    }
  };

  return (
    <Container>
      <Section>
        <ProjectTitle>Filtro por cidade</ProjectTitle>
        <Row>
          <Input
            value={cityQuery}
            onChange={(event) => setCityQuery(event.target.value)}
            placeholder="Digite a cidade"
          />
        </Row>
        <Row>
          <Input
            value={cityField}
            onChange={(event) => setCityField(event.target.value)}
            placeholder="Campo do JSON (ex: cidade)"
          />
          <SecondaryButton onClick={handleCitySearch}>
            Localizar
          </SecondaryButton>
        </Row>
        <CityMapWrapper>
          <div
            ref={mapContainerRef}
            style={{ height: 200, width: "100%" }}
          />
        </CityMapWrapper>
        <Muted>
          O filtro por cidade aplica o valor informado a todas as camadas ao
          abrir o projeto.
        </Muted>
      </Section>
      {!token ? (
        <Section>
          <Row>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
            />
          </Row>
          <Row>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Senha"
            />
          </Row>
          <Row>
            <Button onClick={() => handleAuth("login")}>Entrar</Button>
            <SecondaryButton onClick={() => handleAuth("signup")}>
              Criar conta
            </SecondaryButton>
          </Row>
          {status ? <Muted>{status}</Muted> : null}
          {error ? <ErrorText>{error}</ErrorText> : null}
        </Section>
      ) : (
        <Section>
          <Row>
            <Button onClick={loadProjects}>Atualizar</Button>
            <SecondaryButton onClick={handleLogout}>Sair</SecondaryButton>
          </Row>
          {status ? <Muted>{status}</Muted> : null}
          {error ? <ErrorText>{error}</ErrorText> : null}
          <ProjectList>
            {projects.length === 0 ? (
              <Muted>Você ainda não possui projetos.</Muted>
            ) : (
              projects.map((project) => (
                <ProjectCard key={project.id}>
                  <div>
                    <ProjectTitle>{project.name}</ProjectTitle>
                    <Muted>Atualizado: {project.updatedAt}</Muted>
                  </div>
                  <Button onClick={() => handleOpenProject(project.id)}>
                    Abrir
                  </Button>
                </ProjectCard>
              ))
            )}
          </ProjectList>
        </Section>
      )}
    </Container>
  );
}
