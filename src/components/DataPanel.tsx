import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectDatasets, KEPLER_ID } from '../pages/Kepler/keplerBridge';
import { removeDataset, wrapTo, addDataToMap } from '@kepler.gl/actions';
import { processCsvData } from '@kepler.gl/processors'; // 🚀 IMPORT CRUCIAL AQUI
import { 
  Database, UploadCloud, Search, Filter, Save, Layers, 
  ChevronRight, Plus, X, CheckCircle2, CloudLightning
} from 'lucide-react';

// ==========================================
// 🗄️ CATÁLOGO MAÕNO (Fase MVT / Serverless)
// ==========================================
const MOCK_DATASETS = [
  {
    id: 'ds_tiles_teste', 
    name: 'Tiles Teste (Cloudflare R2)', 
    type: 'SERVERLESS MVT', 
    rows: 'Transmissão Contínua',
    description: 'Prova de Conceito de Arquitetura Serverless. Fatias vetorizadas sendo transmitidas via HTTP Range Requests diretamente para a GPU.',
    columns: ['* Todas as propriedades encapsuladas no Protobuf']
  }
];

export function DataPanel({ onOpenImporter }: { onOpenImporter: () => void }) {
  const dispatch = useDispatch();
  
  // 🚀 LÓGICA DE ESTADO DO KEPLER
  const datasetsRaw = useSelector((state: any) => selectDatasets(state, KEPLER_ID));
  const [viewingDataset, setViewingDataset] = useState<any | null>(null);
  const [editingDataId, setEditingDataId] = useState<string | null>(null);
  const [editingDataName, setEditingDataName] = useState<string>('');
  const [forceRenderCounter, setForceRenderCounter] = useState(0); 

  // 🚀 LÓGICA DE NAVEGAÇÃO
  const [activeTab, setActiveTab] = useState<'KEPLER' | 'CATALOG' | 'BUILDER'>('CATALOG'); // Já começa no catálogo para facilitar o teste
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatalogDataset, setSelectedCatalogDataset] = useState<any | null>(null);
  const [queryFilters, setQueryFilters] = useState<{ col: string, op: string, val: string }[]>([]);

  // ============================================================================
  // MEMÓRIA E RENDERIZAÇÃO DE DATASETS ATIVOS
  // ============================================================================
  const availableDatasets = useMemo(() => {
    const list: any[] = [];
    if (!datasetsRaw) return list;
    const entries = typeof datasetsRaw.entrySeq === 'function' ? datasetsRaw.entrySeq().toArray() : Object.entries(datasetsRaw);
    const customLabels = (window as any).__MAONO_CUSTOM_LABELS__ || {};
    
    for (const [dataId, ds] of entries as any) {
      const fields = ds?.fields || ds?.get?.('fields') || [];
      const fieldsArray = Array.isArray(fields) ? fields : fields.toArray ? fields.toArray() : [];
      let datasetLabel = dataId; 
      if (ds) {
         datasetLabel = ds.label || (ds.get && ds.get('label')) || (ds.info && ds.info.label) || (ds.getIn && ds.getIn(['info', 'label'])) || dataId;
      }
      if (customLabels[dataId]) datasetLabel = customLabels[dataId];
      list.push({ id: dataId, label: datasetLabel, fields: fieldsArray, rawDataset: ds });
    }
    return list;
  }, [datasetsRaw, forceRenderCounter]); 

  const DATASET_ACCENT_COLORS = ['#C5A059', '#E2D7C1', '#9CA3AF', '#CD9575', '#64748B'];
  const getDatasetAccentColor = (dataId: string) => {
    // Se for o nosso MVT da nuvem, força a cor principal
    if(dataId === 'empresas_mvt_data') return '#C5A059';
    const index = availableDatasets.findIndex(d => d.id === dataId);
    return DATASET_ACCENT_COLORS[Math.max(0, index) % DATASET_ACCENT_COLORS.length];
  };

  const handleDeleteDataset = (datasetId: string) => { 
    if(window.confirm("Atenção: Excluir esta base de dados apagará todas as camadas vinculadas a ela. Deseja continuar?")) {
      dispatch(wrapTo(KEPLER_ID, removeDataset(datasetId))); 
      // Desliga o MVT se ele for deletado
      if (datasetId === 'empresas_mvt_data') {
        (window as any).__MAONO_SHOW_MVT__ = false;
      }
    }
  };

  const startEditingData = (datasetId: string, currentName: string) => {
    setEditingDataId(datasetId);
    setEditingDataName(currentName);
  };

  const saveDataName = (dataset: any) => {
    if (editingDataId && editingDataName.trim() !== '') {
      try {
        const win = window as any;
        win.__MAONO_CUSTOM_LABELS__ = win.__MAONO_CUSTOM_LABELS__ || {};
        win.__MAONO_CUSTOM_LABELS__[dataset.id] = editingDataName;
        if (dataset.rawDataset) {
            dataset.rawDataset.label = editingDataName;
            if (dataset.rawDataset.info) dataset.rawDataset.info.label = editingDataName;
        }
        setForceRenderCounter(prev => prev + 1);
      } catch (e) {}
    }
    setEditingDataId(null);
  };

  // ============================================================================
  // LÓGICA DE INJEÇÃO DO CLOUDFLARE R2
  // ============================================================================
  const filteredCatalog = MOCK_DATASETS.filter(ds => ds.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleUsarBaseCatalog = (dataset: any) => {
    if (dataset.id === 'ds_tiles_teste') {
      console.log("🚀 Ativando Engine MVT...");
      
      // 1. Sinalizador Global para o arquivo index.tsx ativar a camada no Deck.gl
      (window as any).__MAONO_SHOW_MVT__ = true;
      
      try {
        // 2. Cria um CSV fantasma com os extremos do Brasil (Norte e Sul)
        // Isso força a câmera a subir e mostrar o país inteiro, revelando onde o MVT existe.
        const dummyCsv = 'lat,lng\n5.2743,-60.2116\n-33.7511,-53.3691';
        const processedData = processCsvData(dummyCsv);

        // 3. Injeta o Dataset Fantasma validado rigorosamente pelo Kepler
        dispatch(wrapTo(KEPLER_ID, addDataToMap({
          datasets: {
            info: { 
              id: 'empresas_mvt_data', // Atenção: NÃO mude este ID, o index.tsx depende dele!
              label: 'Tiles de Teste (Nuvem)' 
            },
            data: processedData
          },
          // 🚀 autoCreateLayers: false ADICIONADO AQUI!
          options: { centerMap: true, keepExistingConfig: true, autoCreateLayers: false },
          config: { visState: { layers: [] } }
        })));
      } catch (error) {
        console.error("Erro na injeção Redux:", error);
      }
      
      // 4. Muda a aba para o usuário ver o arquivo ativo
      setActiveTab('KEPLER');
      return;
    }
  };

  const handleSaveProject = () => {
    alert("Função restrita na fase MVT Alpha.");
  };

  // ============================================================================
  // RENDERIZAÇÃO
  // ============================================================================
  return (
    <div className="w-full h-full flex flex-col text-white bg-[#020305] relative overflow-hidden">
      
      {/* HEADER DAS ABAS */}
      <div className="flex items-center justify-between p-6 border-b border-[#1f2b3e] shrink-0 bg-[#0a0f18] z-10">
        <div className="flex gap-4">
          <button onClick={() => setActiveTab('KEPLER')} className={`pb-1 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'KEPLER' ? 'border-[#C5A059] text-[#C5A059]' : 'border-transparent text-[#64748b] hover:text-[#8c9fba]'}`}>Bases no Mapa</button>
          <button onClick={() => setActiveTab('CATALOG')} className={`pb-1 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'CATALOG' ? 'border-[#C5A059] text-[#C5A059]' : 'border-transparent text-[#64748b] hover:text-[#8c9fba]'}`}>Catálogo</button>
          <button onClick={() => setActiveTab('BUILDER')} className={`pb-1 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'BUILDER' ? 'border-[#C5A059] text-[#C5A059]' : 'border-transparent text-[#64748b] hover:text-[#8c9fba]'}`}>Novo Projeto</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto maono-scroll relative z-10">
        
        {/* ======================================= */}
        {/* ABA 1: GERENCIADOR DE CAMADAS NO MAPA   */}
        {/* ======================================= */}
        {activeTab === 'KEPLER' && (
          <div className="p-6 flex flex-col gap-5">
            <button onClick={onOpenImporter} className="w-full py-4 mb-2 bg-gradient-to-b from-[#172233] to-[#0d141f] border border-[#C5A059]/30 shadow-[0_5px_15px_rgba(0,0,0,0.4)] hover:border-[#C5A059] rounded-xl text-[#C5A059] font-bold text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 group">
              <span className="text-lg leading-none font-light group-hover:scale-110 transition-transform">+</span> Importar Arquivo
            </button>
            
            {availableDatasets.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-[#1f2b3e] rounded-xl bg-[#0a0f18]/50"><span className="text-xs text-[#64748b]">Nenhum arquivo na memória. Vá ao Catálogo.</span></div>
            ) : (
              availableDatasets.map((ds) => {
                const accentColor = getDatasetAccentColor(ds.id);
                const isMVT = ds.id === 'empresas_mvt_data';
                const numRows = ds.rawDataset?.dataContainer?.numRows() || ds.rawDataset?.allData?.length || 0;
                const numCols = ds.fields?.length || 0;

                return (
                  <div key={ds.id} className="relative flex flex-col bg-gradient-to-b from-[#131c2a] to-[#0b1019] rounded-xl border border-[#1f2b3e] shadow-[0_5px_15px_rgba(0,0,0,0.3)] transition-all hover:border-[#C5A059]/30 group">
                    <div className="absolute top-0 left-0 bottom-0 w-1.5 rounded-l-xl z-10" style={{ backgroundColor: accentColor }}></div>
                    <div className="flex items-center justify-between p-5 pl-6">
                      <div className="flex flex-col min-w-0 pr-4 flex-1">
                        {editingDataId === ds.id ? (
                            <input type="text" value={editingDataName} onChange={(e) => setEditingDataName(e.target.value)} onBlur={() => saveDataName(ds)} onKeyDown={(e) => { if (e.key === 'Enter') saveDataName(ds); }} autoFocus className="bg-[#0a0f18] border border-[#C5A059] text-sm text-gray-200 px-2 py-0.5 rounded outline-none w-full shadow-[0_0_8px_rgba(197,160,89,0.3)]" onClick={(e) => e.stopPropagation()} />
                        ) : (
                            <div className="flex items-center gap-2 cursor-pointer w-max" onClick={() => startEditingData(ds.id, ds.label)}>
                               <span className="text-sm font-semibold text-gray-200 tracking-wide truncate transition-colors group-hover:text-white" title={ds.label}>{ds.label}</span>
                               <button className="opacity-0 group-hover:opacity-100 text-[#64748b] hover:text-[#C5A059] transition-all shrink-0"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                            </div>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          {isMVT ? (
                            <span className="text-[10px] text-[#C5A059] bg-[#C5A059]/10 border border-[#C5A059]/30 px-2 py-0.5 rounded font-mono uppercase tracking-widest flex items-center gap-1">
                              <CloudLightning className="w-3 h-3" /> Conexão Ativa
                            </span>
                          ) : (
                            <>
                              <span className="text-[10px] text-[#64748b] bg-[#1a2435] px-2 py-0.5 rounded font-mono">{numRows.toLocaleString('pt-BR')} linhas</span>
                              <span className="text-[10px] text-[#64748b] bg-[#1a2435] px-2 py-0.5 rounded font-mono">{numCols} colunas</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!isMVT && (
                          <button onClick={() => setViewingDataset(ds)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a2435] text-[#8c9fba] hover:text-[#C5A059] hover:bg-[#C5A059]/10 transition-colors" title="Explorar Dados"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                        )}
                        <button onClick={() => handleDeleteDataset(ds.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a2435] text-[#8c9fba] hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Remover Base do Mapa"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ======================================= */}
        {/* ABA 2: CATÁLOGO DA PLATAFORMA           */}
        {/* ======================================= */}
        {activeTab === 'CATALOG' && (
          <div className="p-6">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <input type="text" placeholder="Buscar base curada..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[#131c2a] border border-[#1f2b3e] rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#C5A059] transition-colors" />
            </div>
            
            <div className="space-y-4">
              {filteredCatalog.map(ds => (
                <div key={ds.id} className="relative p-5 bg-gradient-to-br from-[#0a0f18] to-[#05080c] rounded-xl border border-[#C5A059]/40 shadow-[0_0_20px_rgba(197,160,89,0.1)] hover:border-[#C5A059] transition-all group overflow-hidden">
                  
                  {/* Fundo iluminado sutil */}
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#C5A059]/10 rounded-full blur-3xl group-hover:bg-[#C5A059]/20 transition-all pointer-events-none"></div>

                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <h3 className="font-bold text-sm text-[#C5A059] flex items-center gap-2">
                      <CloudLightning className="w-4 h-4" /> {ds.name}
                    </h3>
                    <span className="bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] px-2 py-1 rounded text-[9px] font-mono tracking-wider">{ds.rows}</span>
                  </div>
                  <p className="text-xs text-[#8c9fba] leading-relaxed mb-4 relative z-10">{ds.description}</p>
                  
                  <button onClick={() => handleUsarBaseCatalog(ds)} className="w-full py-2.5 bg-[#C5A059] hover:bg-[#E2C275] text-[#0a0f18] text-[10px] font-extrabold uppercase tracking-widest rounded-lg flex items-center justify-center gap-1 transition-all shadow-[0_0_15px_rgba(197,160,89,0.3)] hover:shadow-[0_0_20px_rgba(197,160,89,0.5)]">
                    USAR BASE SERVERLESS <ChevronRight className="w-3 h-3" />
                  </button>
                  
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA 3: QUERY BUILDER (Em Manutenção) */}
        {activeTab === 'BUILDER' && (
          <div className="p-6 flex flex-col h-full items-center justify-center text-[#64748b]">
            <Layers className="w-10 h-10 mb-4 opacity-20" />
            <p className="text-sm">Query Builder indisponível para dados Serverless MVT.</p>
          </div>
        )}

      </div>

      {/* MODAL DATA EXPLORER (MANTIDO INTACTO) */}
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
              <button onClick={() => setViewingDataset(null)} style={{ color: '#FFFFFF' }} className="hover:text-[#C5A059] transition-colors p-2 rounded-full hover:bg-[#1f2b3e]/50 cursor-pointer">
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
                        <div className="flex flex-col gap-0.5"><span className="truncate">{f.name}</span><span className="text-[8px] font-mono text-[#64748b]/60">{f.type}</span></div>
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
    </div>
  );
}