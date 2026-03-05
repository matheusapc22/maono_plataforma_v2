import React, { useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as KeplerActions from "@kepler.gl/actions";

const KEPLER_ID = "map";

type Props = {
  filterIdx: number;
  dataId: string;
};

function tryUpdateFilter(dispatch: any, idx: number, prop: string, value: any) {
  const wrapToFn = (KeplerActions as any).wrapTo;
  const updateFilter = (KeplerActions as any).updateFilter;
  const setFilter = (KeplerActions as any).setFilter;

  if (typeof wrapToFn !== "function") return false;

  // Kepler 3.2 normalmente tem updateFilter
  if (typeof updateFilter === "function") {
    dispatch(wrapToFn(KEPLER_ID, updateFilter(idx, prop, value)));
    return true;
  }

  // fallback (algumas builds antigas)
  if (typeof setFilter === "function") {
    dispatch(wrapToFn(KEPLER_ID, setFilter(idx, prop, value)));
    return true;
  }

  return false;
}

export function FilterEditorMaono({ filterIdx, dataId }: Props) {
  const dispatch = useDispatch();

  const dataset = useSelector(
    (state: any) => state?.demo?.keplerGl?.[KEPLER_ID]?.visState?.datasets?.[dataId]
  );
  const filter = useSelector(
    (state: any) => state?.demo?.keplerGl?.[KEPLER_ID]?.visState?.filters?.[filterIdx]
  );

  const fields = useMemo(() => {
    const fs = dataset?.fields;
    return Array.isArray(fs) ? fs : [];
  }, [dataset]);

  const fieldIdx = filter?.fieldIdx ?? null;
  const filterType = filter?.type ?? "range";
  const value = filter?.value ?? (filterType === "multiSelect" ? [] : null);

  const onChangeField = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const next = e.target.value === "" ? null : Number(e.target.value);

      // 1) define qual coluna o filtro usa
      tryUpdateFilter(dispatch, filterIdx, "fieldIdx", next);

      // 2) “name” ajuda o Kepler a não considerar filtro “vazio”
      if (next != null) {
        const f = fields[next];
        const label = f?.displayName || f?.name || `field_${next}`;
        tryUpdateFilter(dispatch, filterIdx, "name", label);
      }
    },
    [dispatch, filterIdx, fields]
  );

  const onChangeType = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nextType = e.target.value;

      // muda o tipo do filtro
      tryUpdateFilter(dispatch, filterIdx, "type", nextType);

      // reseta valor para o tipo escolhido (evita estado inválido)
      const reset =
        nextType === "multiSelect" ? [] : nextType === "select" ? null : [0, 0];
      tryUpdateFilter(dispatch, filterIdx, "value", reset);
    },
    [dispatch, filterIdx]
  );

  const onChangeValueText = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const txt = e.target.value;

      // para demo rápida: value como string (ex.: select)
      tryUpdateFilter(dispatch, filterIdx, "value", txt ? [txt] : []);
    },
    [dispatch, filterIdx]
  );

  const onChangeRangeMin = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = Number(e.target.value);
      const cur = Array.isArray(value) ? value : [0, 0];
      const next: any = [Number.isFinite(n) ? n : cur[0], cur[1]];
      tryUpdateFilter(dispatch, filterIdx, "value", next);
    },
    [dispatch, filterIdx, value]
  );

  const onChangeRangeMax = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = Number(e.target.value);
      const cur = Array.isArray(value) ? value : [0, 0];
      const next: any = [cur[0], Number.isFinite(n) ? n : cur[1]];
      tryUpdateFilter(dispatch, filterIdx, "value", next);
    },
    [dispatch, filterIdx, value]
  );

  return (
    <div className="mt-2 p-3 rounded bg-gray-900 border border-gray-800">
      <div className="text-[11px] text-gray-400 mb-2">
        Editor Maõno (aplica no Kepler). DataId: <b>{dataId}</b>
      </div>

      <div className="space-y-2">
        <div>
          <div className="text-[11px] text-gray-400 mb-1">Campo</div>
          <select
            className="w-full bg-gray-800 text-gray-100 text-xs rounded px-2 py-2 border border-gray-700"
            value={fieldIdx ?? ""}
            onChange={onChangeField}
          >
            <option value="">Selecione…</option>
            {fields.map((f: any, i: number) => (
              <option key={f?.name ?? i} value={i}>
                {f?.displayName || f?.name || `Campo ${i}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-[11px] text-gray-400 mb-1">Tipo</div>
          <select
            className="w-full bg-gray-800 text-gray-100 text-xs rounded px-2 py-2 border border-gray-700"
            value={filterType}
            onChange={onChangeType}
            disabled={fieldIdx == null}
          >
            {/* básico / seguro */}
            <option value="range">range (numérico)</option>
            <option value="select">select (1 valor)</option>
            <option value="multiSelect">multiSelect (vários)</option>
          </select>
        </div>

        {filterType === "range" ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[11px] text-gray-400 mb-1">Mín</div>
              <input
                className="w-full bg-gray-800 text-gray-100 text-xs rounded px-2 py-2 border border-gray-700"
                type="number"
                onChange={onChangeRangeMin}
                disabled={fieldIdx == null}
              />
            </div>
            <div>
              <div className="text-[11px] text-gray-400 mb-1">Máx</div>
              <input
                className="w-full bg-gray-800 text-gray-100 text-xs rounded px-2 py-2 border border-gray-700"
                type="number"
                onChange={onChangeRangeMax}
                disabled={fieldIdx == null}
              />
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[11px] text-gray-400 mb-1">Valor</div>
            <input
              className="w-full bg-gray-800 text-gray-100 text-xs rounded px-2 py-2 border border-gray-700"
              placeholder="ex.: SP, 2024, etc."
              onChange={onChangeValueText}
              disabled={fieldIdx == null}
            />
          </div>
        )}

        <div className="text-[11px] text-gray-500">
          Dica: quando o filtro tiver <b>fieldIdx</b> e <b>value</b>, o Kepler já aplica na visualização.
        </div>
      </div>
    </div>
  );
}
