// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project
// @ts-nocheck

import React from "react";
import { PanelHeaderFactory, Icons } from "@kepler.gl/components";
import { KEPLER_GL_VERSION } from "@kepler.gl/constants";
import Logo from "../../../assets/images/logo-2.png";
import { connect } from "react-redux";
import { loadFiles } from "@kepler.gl/actions";
import { useDispatch } from "react-redux";
import { CITY_OPTIONS } from "../constants/navigation";

const LAST_PROJECT_ID_KEY = "maono_last_project_id";
const LAST_PROJECT_NAME_KEY = "maono_last_project_name";
const LAST_CITY_KEY = "maono_last_city";

const apiBaseUrl =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

export function CustomPanelHeaderFactory(...deps) {
  const PanelHeader = PanelHeaderFactory(...deps);
  const defaultActionItems = PanelHeader.defaultProps.actionItems;

  console.log(defaultActionItems);

  const CustomKeplerLogo = () => {
    /*
     * Replaces <KeplerGlLogo /> component
     */
    return (
      <div className="flex flex-col">
        <img className="w-40 -mt-2" src={Logo} />
        <span className="text-[10px] ml-20 -mt-3 text-white">
          {KEPLER_GL_VERSION}
        </span>
      </div>
    );
  };

  const ShareButton = connect((root: any, own: any) => ({
    rootState: root,
    keplerGlId: own.id,
  }))((props: any) => {
    return (
      <button
        className="px-2 py-1 border rounded border-white text-white"
        title="Share URL"
        onClick={props?.onShareMap}
      >
        Share
      </button>
    );
  });

  const CityNavigator = () => {
    const dispatch = useDispatch();
    const [city, setCity] = React.useState(
      () => localStorage.getItem(LAST_CITY_KEY) || CITY_OPTIONS[0]
    );
    const [status, setStatus] = React.useState("");

    const loadCityProject = async (nextCity: string) => {
      const projectId = localStorage.getItem(LAST_PROJECT_ID_KEY);
      if (!projectId) {
        setStatus("Abra um projeto antes de filtrar.");
        return;
      }
      if (nextCity === CITY_OPTIONS[0]) {
        setStatus("");
        return;
      }

      setStatus("Aplicando filtro...");
      try {
        const response = await fetch(
          `${apiBaseUrl}/projects/${projectId}?city=${encodeURIComponent(
            nextCity
          )}&field=cidade`
        );
        if (!response.ok) {
          throw new Error("Falha ao carregar o projeto.");
        }
        const data = await response.json();
        const filename = `${data.name || "project"}.json`;
        const blob = new Blob([JSON.stringify(data.keplerJson)], {
          type: "application/json",
        });
        const file = new File([blob], filename, { type: "application/json" });
        localStorage.setItem(LAST_PROJECT_NAME_KEY, data.name || "Projeto");
        dispatch(loadFiles([file]));
        setStatus("");
      } catch (error) {
        setStatus("Não foi possível aplicar a cidade.");
      }
    };

    const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextCity = event.target.value;
      setCity(nextCity);
      localStorage.setItem(LAST_CITY_KEY, nextCity);
      await loadCityProject(nextCity);
    };

    return (
      <div className="flex items-center gap-2 text-white">
        <span className="text-xs uppercase tracking-wide text-white/70">
          Cidade
        </span>
        <select
          className="rounded border border-white/30 bg-transparent px-2 py-1 text-xs"
          value={city}
          onChange={handleChange}
        >
          {CITY_OPTIONS.map((option) => (
            <option key={option} value={option} className="text-black">
              {option}
            </option>
          ))}
        </select>
        {status ? (
          <span className="text-[10px] text-white/70">{status}</span>
        ) : null}
      </div>
    );
  };

  PanelHeader.defaultProps = {
    ...PanelHeader.defaultProps,
    logoComponent: CustomKeplerLogo,
    actionItems: [
      // {
      //   id: "bug",
      //   iconComponent: Icons.Bug,
      //   href: BUG_REPORT_LINK,
      //   blank: true,
      //   tooltip: "Bug Report",
      //   onClick: () => {},
      // },
      // {
      //   id: "docs",
      //   iconComponent: Icons.Docs2,
      //   href: USER_GUIDE_DOC,
      //   blank: true,
      //   tooltip: "User Guide",
      //   onClick: () => {},
      // },
      // defaultActionItems.find((item) => item.id === "storage"),
      {
        // ...defaultActionItems.find((item) => item.id === "save"),
        label: "",
        tooltip: "Share",
        id: "share-url-only",
        dropdownComponent: (p: any) => <ShareButton {...p} />,
        iconComponent: () => <></>,
      },
      {
        label: "",
        tooltip: "Cidade",
        id: "city-navigation",
        dropdownComponent: () => <CityNavigator />,
        iconComponent: () => <></>,
      },
    ],
  };
  return PanelHeader;
}

CustomPanelHeaderFactory.deps = PanelHeaderFactory.deps;

export function replacePanelHeader() {
  return [PanelHeaderFactory, CustomPanelHeaderFactory];
}
