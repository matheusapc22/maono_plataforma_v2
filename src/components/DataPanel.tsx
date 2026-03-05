import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectDatasets, KEPLER_ID } from '../pages/Kepler/keplerBridge';
import { removeDataset, wrapTo } from '@kepler.gl/actions';

export function DataPanel({ onOpenImporter }: { onOpenImporter: () => void }) {
  const dispatch = useDispatch();
  const datasetsRaw = useSelector((state: any) => selectDatasets(state, KEPLER_ID));
  const [viewingDataset, setViewingDataset] = useState<any | null>(null);

  const availableDatasets = useMemo(() => {
    const list: any[] = [];
    if (!datasetsRaw) return list;
    const entries = typeof datasetsRaw.entrySeq === 'function' ? datasetsRaw.entrySeq().toArray() : Object.entries(datasetsRaw);
    
    for (const [dataId, ds] of entries as any) {
      const fields = ds?.fields || ds?.get?.('fields') || [];
      const fieldsArray = Array.isArray(fields) ? fields : fields.toArray ? fields.toArray() : [];
      let datasetLabel = dataId; 
      if (ds) {
         datasetLabel = ds.label || (ds.get && ds.get('label')) || (ds.info && ds.info.label) || (ds.getIn && ds.getIn(['info', 'label'])) || dataId;
      }
      list.push({ id: dataId, label: datasetLabel, fields: fieldsArray, rawDataset: ds });
    }
    return list;
  }, [datasetsRaw]);

  const DATASET_ACCENT_COLORS = ['#C5A059', '#E2D7C1', '#9CA3AF', '#CD9575', '#64748B'];

  const getDatasetAccentColor = (dataId: string) => {
    const index = availableDatasets.findIndex(d => d.id === dataId);
    const safeIndex = Math.max(0, index); 
    return DATASET_ACCENT_COLORS[safeIndex % DATASET_ACCENT_COLORS.length];
  };

  const handleDeleteDataset = (datasetId: string) => { 
    if(window.confirm("Atenção: Excluir esta base de dados apagará todas as camadas vinculadas a ela. Deseja continuar?")) {
      dispatch(wrapTo(KEPLER_ID, removeDataset(datasetId))); 
    }
  };

  return (
    <aside className="relative flex flex-col w-full h-full min-h-0 bg-gradient-to-b from-[#0a111f] to-[#030508] text-white overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#1a2b45] rounded-full blur-[140px] opacity-30 pointer-events-none z-0" />

      <div className="relative flex bg-transparent border-b border-[#1f2b3e]/60 shrink-0 px-6 py-4 z-10 items-center justify-between">
        <span className="text-[11px] font-bold tracking-widest uppercase text-gray-100">Bases de Dados</span>
      </div>

      <div className="relative flex flex-col gap-5 overflow-y-auto maono-scroll p-6 flex-1 min-h-0 touch-pan-y z-10">
        
        {/* BOTÃO MASTER DE IMPORTAÇÃO */}
        <button 
          onClick={onOpenImporter}
          className="w-full py-4 mb-2 bg-gradient-to-b from-[#172233] to-[#0d141f] border border-[#C5A059]/30 shadow-[0_5px_15px_rgba(0,0,0,0.4)] hover:border-[#C5A059] rounded-xl text-[#C5A059] font-bold text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 group"
        >
          <span className="text-lg leading-none font-light group-hover:scale-110 transition-transform">+</span> Importar Arquivo
        </button>

        {availableDatasets.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-[#1f2b3e] rounded-xl bg-[#0a0f18]/50">
            <span className="text-xs text-[#64748b]">Nenhum arquivo na memória.</span>
          </div>
        ) : (
          availableDatasets.map((ds) => {
            const accentColor = getDatasetAccentColor(ds.id);
            const numRows = ds.rawDataset?.dataContainer?.numRows() || ds.rawDataset?.allData?.length || 0;
            const numCols = ds.fields?.length || 0;

            return (
              <div key={ds.id} className="relative flex flex-col bg-gradient-to-b from-[#131c2a] to-[#0b1019] rounded-xl border border-[#1f2b3e] shadow-[0_5px_15px_rgba(0,0,0,0.3)] transition-all hover:border-[#C5A059]/30 group">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 rounded-l-xl z-10" style={{ backgroundColor: accentColor }}></div>
                <div className="flex items-center justify-between p-5 pl-6">
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-sm font-semibold text-gray-200 tracking-wide truncate" title={ds.label}>{ds.label}</span>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-[#64748b] bg-[#1a2435] px-2 py-0.5 rounded font-mono">{numRows.toLocaleString('pt-BR')} linhas</span>
                      <span className="text-[10px] text-[#64748b] bg-[#1a2435] px-2 py-0.5 rounded font-mono">{numCols} colunas</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setViewingDataset(ds)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a2435] text-[#8c9fba] hover:text-[#C5A059] hover:bg-[#C5A059]/10 transition-colors" title="Explorar Dados">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                    <button onClick={() => handleDeleteDataset(ds.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a2435] text-[#8c9fba] hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Excluir Base de Dados">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DATA EXPLORER */}
      {viewingDataset && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#030508]/90 backdrop-blur-md transition-all p-4">
          <div className="flex flex-col w-full max-w-6xl h-[85vh] bg-[#0a0f18] border border-[#1f2b3e] rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(197,160,89,0.15)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f2b3e]/80 bg-gradient-to-r from-[#131c2a] to-[#0a0f18] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${getDatasetAccentColor(viewingDataset.id)}30`, border: `1px solid ${getDatasetAccentColor(viewingDataset.id)}` }}>
                  <svg className="w-4 h-4" style={{ color: getDatasetAccentColor(viewingDataset.id) }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21-3.582-4-8-4s-8 1.79-8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                </div>
                <h2 className="text-xl font-medium text-gray-100 tracking-wide">{viewingDataset.label}</h2>
                <span className="px-2.5 py-1 bg-[#1a2435] text-[#8c9fba] text-[10px] rounded-full ml-3 border border-[#1f2b3e]">{viewingDataset.fields?.length} Colunas</span>
              </div>
              {/* 🚀 BOTÃO 'X' BLINDADO - DATA EXPLORER */}
              <button 
                onClick={() => setViewingDataset(null)} 
                style={{ color: '#FFFFFF' }}
                className="hover:text-[#C5A059] transition-colors p-2 rounded-full hover:bg-[#1f2b3e]/50 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto maono-scroll bg-[#0a0f18]">
              <table className="min-w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 z-20 shadow-md">
                  <tr>
                    <th className="w-14 bg-[#161f30] text-[#64748b] text-[10px] font-bold text-center py-3.5 border-b border-r border-[#1f2b3e] sticky left-0 z-30">#</th>
                    {viewingDataset.fields.map((f: any, idx: number) => (
                      <th key={idx} className="bg-[#131c2a] text-[#8c9fba] text-[10px] font-bold tracking-widest uppercase px-5 py-3.5 border-b border-r border-[#1f2b3e] hover:bg-[#1a2435] transition-colors max-w-[300px] truncate" title={f.name}>
                        <div className="flex flex-col gap-0.5">
                          <span className="truncate">{f.name}</span>
                          <span className="text-[8px] font-mono text-[#64748b]/60">{f.type}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-xs text-gray-300 font-mono">
                  {(() => {
                    const rows = [];
                    const dataContainer = viewingDataset.rawDataset?.dataContainer;
                    const allData = viewingDataset.rawDataset?.allData;
                    const numRows = Math.min(100, dataContainer ? dataContainer.numRows() : (allData ? allData.length : 0));
                    for (let i = 0; i < numRows; i++) {
                      const cells = viewingDataset.fields.map((_: any, j: number) => dataContainer ? dataContainer.valueAt(i, j) : allData[i][j]);
                      rows.push(
                        <tr key={i} className="hover:bg-[#131c2a]/60 transition-colors group">
                          <td className="w-14 bg-[#0d141f] text-[#64748b] text-center py-3 border-b border-r border-[#1f2b3e] sticky left-0 z-10 group-hover:bg-[#161f30] transition-colors">{i + 1}</td>
                          {cells.map((cell: any, cellIndex: number) => {
                            const cellContent = cell !== null && cell !== undefined ? String(cell) : '';
                            const isNull = !cellContent;
                            return (
                              <td key={cellIndex} className={`px-5 py-3 border-b border-r border-[#1f2b3e] max-w-[300px] truncate ${isNull ? 'bg-[#1a2435]/30' : ''}`} title={cellContent}>
                                {isNull ? <span className="text-[#64748b]/40 italic text-[11px]">NULL</span> : cellContent}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
              <div className="p-4 text-center text-xs text-[#64748b] bg-[#0a0f18]">Exibindo amostra limitada às primeiras 100 linhas.</div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </aside>
  );
}