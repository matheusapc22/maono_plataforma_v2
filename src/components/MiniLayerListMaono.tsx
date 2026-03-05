// src/components/MiniLayerListMaono.tsx
import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as KeplerActions from "@kepler.gl/actions";

type AnyState = any;

function getVisState(state: AnyState) {
  // Pelo código atual do projeto, o keplerGl fica em state.demo.keplerGl e a instância é "map"
  return state?.demo?.keplerGl?.map?.visState;
}

type UiLayerItem = {
  layer: any;
  idx: number; // índice real dentro de visState.layers
};

export function MiniLayerListMaono() {
  const dispatch = useDispatch();

  // ⚠️ Importante: separar em seletores simples evita warnings de "selector returned a different result"
  const layers = useSelector((state: AnyState) => getVisState(state)?.layers ?? []);
  const layerOrder = useSelector((state: AnyState) => getVisState(state)?.layerOrder ?? []);

  // Monta uma lista "UI-first": topo do mapa primeiro.
  // layerOrder pode vir como IDs (string) ou índices (number). Suportamos os 2.
  const uiLayers: UiLayerItem[] = useMemo(() => {
    if (!Array.isArray(layers) || layers.length === 0) return [];

    // Se não tiver layerOrder, cai no array puro (topo = último)
    if (!Array.isArray(layerOrder) || layerOrder.length === 0) {
      return layers
        .map((layer: any, idx: number) => ({ layer, idx }))
        .slice()
        .reverse();
    }

    const byId = new Map<string, { layer: any; idx: number }>();
    layers.forEach((l: any, idx: number) => byId.set(l?.id, { layer: l, idx }));

    const out: UiLayerItem[] = [];

    for (const item of layerOrder) {
      if (typeof item === "string") {
        const hit = byId.get(item);
        if (hit) out.push(hit);
      } else if (typeof item === "number") {
        const l = layers[item];
        if (l) out.push({ layer: l, idx: item });
      }
    }

    // Kepler: [fundo -> topo] | UI: [topo -> fundo]
    const reversed = out.slice().reverse();

    // fallback robusto
    return reversed.length
      ? reversed
      : layers.map((layer: any, idx: number) => ({ layer, idx })).reverse();
  }, [layers, layerOrder]);

  const onToggleVisible = (idx: number) => {
    const wrap = (KeplerActions as any).wrapTo;
    const toggle =
      (KeplerActions as any).toggleLayerForMap ||
      (KeplerActions as any).toggleLayerVisibility ||
      (KeplerActions as any).toggleLayer;

    if (typeof wrap === "function" && typeof toggle === "function") {
      dispatch(wrap("map", toggle(idx)));
    } else {
      // fallback silencioso (não quebra UI)
      console.warn("[MiniLayerListMaono] toggle action not found in @kepler.gl/actions");
    }
  };

  const onRemove = (idx: number) => {
    const wrap = (KeplerActions as any).wrapTo;
    const remove = (KeplerActions as any).removeLayer;

    if (typeof wrap === "function" && typeof remove === "function") {
      dispatch(wrap("map", remove(idx)));
    } else {
      console.warn("[MiniLayerListMaono] removeLayer not found in @kepler.gl/actions");
    }
  };

  const onOpacity = (layer: any, next: number) => {
    const wrap = (KeplerActions as any).wrapTo;
    const change = (KeplerActions as any).layerVisConfigChange;

    if (typeof wrap === "function" && typeof change === "function") {
      // opacity do Kepler costuma ser 0..1
      dispatch(wrap("map", change(layer, { opacity: next })));
    } else {
      console.warn("[MiniLayerListMaono] layerVisConfigChange not found in @kepler.gl/actions");
    }
  };

  /**
   * ✅ Sprint 4.2 — Interceptação de Configuração (patch mínimo)
   * Abre o painel profundo do Kepler para a layer selecionada,
   * usando o idx REAL (nunca índice visual).
   */
  const onConfigure = (idx: number) => {
    const wrap = (KeplerActions as any).wrapTo;

    const selectLayer =
      (KeplerActions as any).setSelectedLayer ||
      (KeplerActions as any).selectLayer;

    const showPanel =
      (KeplerActions as any).showLayerPanel ||
      (KeplerActions as any).openLayerPanel;

    if (typeof wrap !== "function") {
      console.warn("[MiniLayerListMaono] wrapTo not found in @kepler.gl/actions");
      return;
    }

    try {
      // 1) seleciona layer (muitas versões precisam disso)
      if (typeof selectLayer === "function") {
        dispatch(wrap("map", selectLayer(idx)));
      }

      // 2) abre painel profundo (se existir)
      if (typeof showPanel === "function") {
        dispatch(wrap("map", showPanel(idx)));
      }

      if (typeof selectLayer !== "function" && typeof showPanel !== "function") {
        console.warn("[MiniLayerListMaono] showLayerPanel/selectLayer actions not found");
      }
    } catch {
      console.warn("[MiniLayerListMaono] failed to open layer config panel");
    }
  };

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Camadas
        </h3>
        <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
          {uiLayers.length}
        </span>
      </div>

      {uiLayers.length === 0 ? (
        <div className="p-4 text-center text-xs text-gray-600 border border-dashed border-gray-700 rounded-lg">
          Nenhuma camada ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {uiLayers.map(({ layer, idx }) => {
            const label = layer?.config?.label ?? layer?.id ?? "Layer";
            const isVisible = !!layer?.config?.isVisible;

            const currentOpacity =
              layer?.config?.visConfig?.opacity ??
              layer?.visConfig?.opacity ??
              1;

            const colorArr = layer?.config?.color;
            const dotColor =
              Array.isArray(colorArr) && colorArr.length >= 3
                ? `rgb(${colorArr[0]}, ${colorArr[1]}, ${colorArr[2]})`
                : "#9CA3AF"; // gray-400 fallback

            return (
              <div
                key={layer?.id ?? idx}
                className="group rounded-lg border border-gray-800 bg-gray-800/50 p-3 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span
                      className="text-sm font-medium text-gray-200 truncate"
                      title={label}
                    >
                      {label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleVisible(idx)}
                      className={`p-1.5 rounded hover:bg-gray-700 ${
                        !isVisible ? "text-gray-600" : "text-blue-400"
                      }`}
                      title={isVisible ? "Ocultar" : "Mostrar"}
                      type="button"
                    >
                      {isVisible ? "👁️" : "🚫"}
                    </button>

                    {/* ✅ Sprint 4.2: Configurar (abre painel profundo do Kepler) */}
                    <button
                      onClick={() => onConfigure(idx)}
                      className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-blue-300"
                      title="Configurar"
                      type="button"
                    >
                      ⚙️
                    </button>

                    <button
                      onClick={() => onRemove(idx)}
                      className="p-1.5 rounded hover:bg-red-900/30 text-gray-500 hover:text-red-400"
                      title="Remover"
                      type="button"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-10">Opac.</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={Number(currentOpacity)}
                    onChange={(e) => onOpacity(layer, Number(e.target.value))}
                    className="h-1 w-full bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-[10px] text-gray-500 w-10 text-right">
                    {Math.round(Number(currentOpacity) * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
