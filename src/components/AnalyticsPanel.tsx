import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { 
  TrendingUp, Activity, Zap, ShieldCheck, Database, Filter, 
  Sparkles, X, Send, GripVertical, MousePointerClick,
  LayoutList, GitMerge, Calculator 
} from 'lucide-react';

import { useKeplerData } from '../hooks/useKeplerData';
import { evaluateFormula } from '../utils/formulaEngine';

// 🚀 RECEBE O CONTROLE DE AMBAS AS GAVETAS DO PAI
interface AnalyticsPanelProps {
  isAIPanelOpen: boolean;
  setIsAIPanelOpen: (isOpen: boolean) => void;
  isColumnsOpen: boolean; 
  setIsColumnsOpen: (isOpen: boolean) => void;
}

export function AnalyticsPanel({ isAIPanelOpen, setIsAIPanelOpen, isColumnsOpen, setIsColumnsOpen }: AnalyticsPanelProps) {
  
  const allDatasets = useKeplerData();
  const [activeDatasetId, setActiveDatasetId] = useState<string>("");

  const activeDataset = useMemo(() => {
    if (activeDatasetId) return allDatasets.find(d => d.id === activeDatasetId) || allDatasets[0];
    return allDatasets[0] || { id: '', label: 'Nenhuma base', columns: [], data: [] };
  }, [allDatasets, activeDatasetId]);

  const availableColumns = activeDataset?.columns || [];
  const realData = activeDataset?.data || [];

  const [kpi1, setKpi1] = useState({ title: "Contagem de Linhas", op: "CONTAGEM", col: "" });
  const [kpi2, setKpi2] = useState({ title: "Soma Total", op: "SOMA", col: "" });
  const [kpi3, setKpi3] = useState({ title: "Valores Únicos (Distinta)", op: "CONTAGEM_DISTINTA", col: "" });
  const [kpi4, setKpi4] = useState({ title: "Média Global", op: "MÉDIA", col: "" });

  const [isDataSelectorOpen, setIsDataSelectorOpen] = useState(false);
  const [isFilterWizardOpen, setIsFilterWizardOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<{ column: string, value: string } | null>(null);
  
  const [filterCol, setFilterCol] = useState("");
  const [filterVal, setFilterVal] = useState("");

  const filteredData = useMemo(() => {
    if (!activeFilter || !activeFilter.column || !activeFilter.value) return realData;
    return realData.filter(row => String(row[activeFilter.column]) === activeFilter.value);
  }, [realData, activeFilter]);

  const uniqueValuesForFilter = useMemo(() => {
    if (!filterCol || realData.length === 0) return [];
    const vals = new Set(realData.map(r => String(r[filterCol])));
    return Array.from(vals).filter(v => v !== 'null' && v !== 'undefined' && v !== '').slice(0, 50); 
  }, [realData, filterCol]);

  // LÓGICA DE DRAG & DROP
  const handleDragStart = (e: React.DragEvent, columnName: string) => {
    e.dataTransfer.setData("colName", columnName);
  };

  const handleDrop = (e: React.DragEvent, targetKpi: number) => {
    e.preventDefault();
    const columnName = e.dataTransfer.getData("colName");
    if (!columnName) return;

    if (targetKpi === 1) setKpi1(prev => ({ ...prev, col: columnName }));
    if (targetKpi === 2) setKpi2(prev => ({ ...prev, col: columnName }));
    if (targetKpi === 3) setKpi3(prev => ({ ...prev, col: columnName }));
    if (targetKpi === 4) setKpi4(prev => ({ ...prev, col: columnName }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const renderKpiCard = (kpiData: any, setKpi: any, kpiIndex: number) => {
    const hasColumn = kpiData.col !== "";
    const displayValue = hasColumn 
      ? evaluateFormula(`${kpiData.op}(${kpiData.col})`, filteredData)
      : (kpiData.op === "CONTAGEM" ? evaluateFormula(`CONTAGEM()`, filteredData) : "—");

    return (
      <div 
        onDrop={(e) => handleDrop(e, kpiIndex)}
        onDragOver={handleDragOver}
        className={`bg-[#0a0f18] p-5 rounded-2xl border transition-all relative group overflow-hidden flex flex-col justify-between ${
          hasColumn ? 'border-[#1f2b3e] shadow-lg' : 'border-dashed border-[#C5A059]/40 bg-[#C5A059]/5 hover:bg-[#C5A059]/10'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[#64748b]">
            <Activity className="w-4 h-4" />
            <span className="text-[9px] uppercase font-bold tracking-widest">{kpiData.title}</span>
          </div>
          {hasColumn && (
            <button onClick={() => setKpi(prev => ({...prev, col: ""}))} className="text-[#64748b] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        <p className={`text-2xl font-bold ${hasColumn || kpiData.op === "CONTAGEM" ? 'text-[#C5A059]' : 'text-[#64748b] text-sm font-normal'}`}>
          {hasColumn || kpiData.op === "CONTAGEM" ? displayValue : 'Arraste uma coluna aqui'}
        </p>
        
        <p className="text-[9px] text-[#64748b] mt-2 italic font-mono bg-[#131c2a] py-1 px-2 rounded-md inline-block max-w-full truncate">
          {kpiData.op}({hasColumn ? kpiData.col : '...'})
        </p>
      </div>
    );
  };

  return (
    // 🚀 REMOVIDO o `overflow-hidden` do container global para as gavetas poderem vazar para fora!
    <div className="w-full h-full relative text-white flex bg-[#020305]">
      
      {/* =========================================
          📊 ÁREA ESQUERDA: DASHBOARD PRINCIPAL
      ============================================= */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-1 p-8 overflow-y-auto maono-scroll">
          
          <div className="flex items-center justify-between mb-10 border-b border-[#1f2b3e] pb-6">
            <div className="flex items-center gap-3">
              <Activity className="text-[#C5A059] w-7 h-7" />
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Intelligence Dashboard</h2>
                <p className="text-[#64748b] text-xs">Arraste os dados para construir suas métricas</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setIsDataSelectorOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#0a0f18] hover:bg-[#131c2a] border border-[#C5A059]/30 hover:border-[#C5A059] text-[#C5A059] text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(197,160,89,0.15)]"
              >
                <Database className="w-3.5 h-3.5" />
                Selecionar Base
              </button>

              <button 
                onClick={() => activeDatasetId && setIsFilterWizardOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 bg-[#0a0f18] border text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-md ${
                  activeDatasetId 
                    ? 'border-[#1f2b3e] hover:border-[#C5A059]/80 text-[#8c9fba] hover:text-[#C5A059] cursor-pointer' 
                    : 'border-[#161f30] text-[#334155] cursor-not-allowed opacity-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" /> Filtrar
              </button>

              {activeFilter && (
                <button onClick={() => setActiveFilter(null)} className="flex items-center gap-1.5 px-3 py-2 bg-[#C5A059]/10 border border-[#C5A059]/50 text-[#C5A059] text-[9px] font-bold uppercase tracking-wider rounded-xl hover:bg-red-900/30 hover:border-red-500 hover:text-red-400 transition-colors">
                  <Filter className="w-3 h-3" /> {activeFilter.value} <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-10">
            {renderKpiCard(kpi1, setKpi1, 1)}
            {renderKpiCard(kpi2, setKpi2, 2)}
            {renderKpiCard(kpi3, setKpi3, 3)}
            {renderKpiCard(kpi4, setKpi4, 4)}
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8 opacity-50 grayscale pointer-events-none">
            <div className="bg-[#0a0f18] h-64 rounded-2xl border border-[#1f2b3e] flex items-center justify-center"><span className="text-xs text-[#64748b] uppercase font-bold">Gráfico Dinâmico em Breve</span></div>
            <div className="bg-[#0a0f18] h-64 rounded-2xl border border-[#1f2b3e] flex items-center justify-center"><span className="text-xs text-[#64748b] uppercase font-bold">Gráfico Dinâmico em Breve</span></div>
          </div>
        </div>

        <button 
          onClick={() => { setIsAIPanelOpen(true); setIsColumnsOpen(false); }} 
          className={`absolute bottom-8 right-8 p-4 bg-gradient-to-tr from-[#E2C275] to-[#C5A059] text-[#04060a] rounded-full shadow-[0_0_25px_rgba(197,160,89,0.5)] hover:scale-110 z-30 transition-all ${isAIPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <Sparkles className="w-6 h-6 fill-current" />
        </button>
      </div>

      {/* =========================================
          🛠️ SIDEBAR DIREITA (TOOLBAR FIXA 60px)
      ============================================= */}
      <div className="w-[60px] h-full bg-[#04060a] border-l border-[#161f30] flex flex-col items-center py-6 z-20 shrink-0 shadow-[-10px_0_20px_rgba(0,0,0,0.3)]">
        
        <button 
          onClick={() => { setIsColumnsOpen(!isColumnsOpen); setIsAIPanelOpen(false); }}
          className={`p-3 rounded-xl transition-all relative group ${
            isColumnsOpen 
              ? 'bg-[#C5A059]/10 text-[#C5A059] shadow-[inset_0_0_10px_rgba(197,160,89,0.1)]' 
              : 'text-[#64748b] hover:bg-[#131c2a] hover:text-[#8c9fba]'
          }`}
          title="Campos de Dados"
        >
          <LayoutList className="w-5 h-5" />
          {isColumnsOpen && <span className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#C5A059] rounded-r-full"></span>}
        </button>

        <div className="w-6 h-px bg-[#1f2b3e] my-4"></div>

        <button className="p-3 rounded-xl text-[#64748b]/40 cursor-not-allowed hover:bg-[#131c2a]/30 mb-2" title="Em Breve: Cruzamento de Bases">
          <GitMerge className="w-5 h-5" />
        </button>
        <button className="p-3 rounded-xl text-[#64748b]/40 cursor-not-allowed hover:bg-[#131c2a]/30" title="Em Breve: Cálculos Avançados">
          <Calculator className="w-5 h-5" />
        </button>
      </div>

      {/* =========================================
          🗂️ GAVETA 1: COLUNAS "PARA FORA" (300px)
      ============================================= */}
      {/* 🚀 Fica oculta atrás da Sidebar. Quando isColumnsOpen, desliza 100% PARA FORA do painel */}
      <div 
        className={`absolute top-0 right-0 h-full w-[300px] bg-[#0a0f18]/95 backdrop-blur-xl border-y border-r border-[#C5A059]/30 rounded-r-2xl z-10 transition-all duration-500 ease-in-out flex flex-col ${
          isColumnsOpen ? 'shadow-[20px_0_50px_rgba(0,0,0,0.8)] opacity-100' : 'shadow-none opacity-0 pointer-events-none'
        }`}
        style={{ transform: isColumnsOpen ? 'translateX(100%)' : 'translateX(0)' }}
      >
        <div className="p-5 border-b border-[#1f2b3e] bg-gradient-to-r from-[#0a0f18] to-[#131c2a] rounded-tr-2xl flex justify-between items-start">
          <div>
            <h3 className="font-bold tracking-widest uppercase text-[#C5A059] text-[10px] mb-1">Fonte de Dados</h3>
            <p className="text-xs text-white truncate w-48" title={activeDataset.label}>{activeDataset.label}</p>
            <span className="text-[9px] text-[#11A872] mt-1 block">{filteredData.length} linhas</span>
          </div>
          <button onClick={() => setIsColumnsOpen(false)} className="text-[#64748b] hover:text-[#C5A059]"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto maono-scroll p-4 space-y-2">
          <p className="text-[10px] uppercase font-bold text-[#64748b] mb-4 tracking-widest flex items-center gap-1">
            <MousePointerClick className="w-3 h-3" /> Arraste para o Painel
          </p>
          
          {availableColumns.length === 0 ? (
             <div className="text-center p-4 border border-dashed border-[#1f2b3e] rounded-xl"><p className="text-[10px] text-[#64748b]">Nenhuma base conectada.</p></div>
          ) : (
            availableColumns.map(col => (
              <div 
                key={col} 
                draggable 
                onDragStart={(e) => handleDragStart(e, col)}
                className="bg-[#131c2a] border border-[#1f2b3e] hover:border-[#C5A059] p-3 rounded-lg flex items-center gap-3 cursor-grab active:cursor-grabbing hover:shadow-[0_0_10px_rgba(197,160,89,0.2)] transition-all group"
              >
                <GripVertical className="w-4 h-4 text-[#64748b] group-hover:text-[#C5A059]" />
                <span className="text-xs text-[#8c9fba] group-hover:text-white truncate" title={col}>{col}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =========================================
          🤖 GAVETA 2: IA "PARA FORA" (400px)
      ============================================= */}
      <div 
        className={`absolute top-0 right-0 h-full w-[400px] bg-[#0a0f18]/95 backdrop-blur-xl border-y border-r border-[#C5A059]/30 rounded-r-2xl z-10 transition-all duration-500 ease-in-out flex flex-col ${
          isAIPanelOpen ? 'shadow-[20px_0_50px_rgba(0,0,0,0.8)] opacity-100' : 'shadow-none opacity-0 pointer-events-none'
        }`}
        style={{ transform: isAIPanelOpen ? 'translateX(100%)' : 'translateX(0)' }}
      >
         <div className="p-6 border-b border-[#1f2b3e] flex justify-between items-center bg-gradient-to-r from-[#0a0f18] to-[#131c2a] rounded-tr-2xl">
          <div className="flex items-center gap-3 text-[#C5A059]">
            <div className="p-2 bg-[#C5A059]/10 rounded-lg"><Sparkles className="w-5 h-5" /></div>
            <h3 className="font-bold tracking-widest uppercase text-xs">Maõno Copilot</h3>
          </div>
          <button onClick={() => setIsAIPanelOpen(false)} className="p-2 text-[#64748b] hover:text-[#C5A059]"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 p-6 text-sm"><p className="text-[#8c9fba]">IA conectada aos dados...</p></div>
      </div>

      {/* =========================================
          MODAIS SIMPLIFICADOS
      ============================================= */}
      {isDataSelectorOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#020305]/80 backdrop-blur-sm">
          <div className="w-[400px] bg-[#0a0f18] border border-[#C5A059]/30 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[#1f2b3e] flex justify-between items-center bg-[#131c2a]">
              <div className="flex items-center gap-3"><Database className="w-5 h-5 text-[#C5A059]" /><h3 className="font-bold tracking-widest uppercase text-xs text-white">Selecionar Base Ativa</h3></div>
              <button onClick={() => setIsDataSelectorOpen(false)} className="text-[#64748b] hover:text-[#C5A059]"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <select 
                value={activeDatasetId} 
                onChange={e => { 
                  setActiveDatasetId(e.target.value); 
                  setIsDataSelectorOpen(false); 
                  setIsColumnsOpen(true); // Abre a gaveta externa automaticamente!
                }} 
                className="w-full bg-[#131c2a] border border-[#1f2b3e] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#C5A059] cursor-pointer"
              >
                <option value="">Selecione uma base ativa no mapa...</option>
                {allDatasets.map(ds => <option key={ds.id} value={ds.id}>{ds.label} ({ds.data.length} linhas)</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {isFilterWizardOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#020305]/80 backdrop-blur-sm">
          <div className="w-[400px] bg-[#0a0f18] border border-[#1f2b3e] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
             <div className="p-5 border-b border-[#1f2b3e] flex justify-between items-center bg-[#131c2a]">
              <div className="flex items-center gap-3"><Filter className="w-5 h-5 text-[#8c9fba]" /><h3 className="font-bold tracking-widest uppercase text-xs text-white">Filtrar Base (Drill-Down)</h3></div>
              <button onClick={() => setIsFilterWizardOpen(false)} className="text-[#64748b] hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#8c9fba] mb-2">Filtrar por qual coluna?</label>
                <select value={filterCol} onChange={e => {setFilterCol(e.target.value); setFilterVal('');}} className="w-full bg-[#131c2a] border border-[#1f2b3e] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#8c9fba]">
                  <option value="">Selecione...</option>
                  {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              {filterCol && (
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#8c9fba] mb-2">Escolha o valor</label>
                  <select value={filterVal} onChange={e => setFilterVal(e.target.value)} className="w-full bg-[#131c2a] border border-[#1f2b3e] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#8c9fba]">
                    <option value="">Ver todos...</option>
                    {uniqueValuesForFilter.map(val => <option key={val} value={val}>{val}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-[#1f2b3e] bg-[#0a0f18] flex justify-end">
              <button 
                onClick={() => {
                  if (filterCol && filterVal) setActiveFilter({ column: filterCol, value: filterVal });
                  else setActiveFilter(null);
                  setIsFilterWizardOpen(false);
                }} 
                className="w-full py-3 bg-[#172233] hover:bg-[#1f2b3e] text-white border border-[#1f2b3e] rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                Aplicar Filtro Local
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}