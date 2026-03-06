import React, { useState, useEffect } from 'react';
import { X, Save, Database, FunctionSquare } from 'lucide-react';

interface FormulaEditorProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  currentFormula: string;
  onApply: (newFormula: string) => void;
  availableColumns: string[];
}

export function FormulaEditor({ isOpen, onClose, targetName, currentFormula, onApply, availableColumns }: FormulaEditorProps) {
  const [tempFormula, setTempFormula] = useState(currentFormula);

  // Sincroniza o texto do editor quando abrimos KPIs diferentes
  useEffect(() => {
    setTempFormula(currentFormula);
  }, [currentFormula, isOpen]);

  // Função para facilitar a digitação inserindo o texto onde o cursor parou
  const insertText = (text: string) => {
    setTempFormula(prev => prev + text);
  };

  return (
    <div 
      className={`absolute top-0 right-0 h-full w-[350px] bg-[#0a0f18]/95 backdrop-blur-xl border-y border-r border-[#C5A059]/30 rounded-r-2xl z-30 transition-all duration-500 ease-in-out flex flex-col ${
        isOpen ? 'shadow-[20px_0_50px_rgba(0,0,0,0.8)] opacity-100' : 'shadow-none opacity-0 pointer-events-none'
      }`}
      style={{ transform: isOpen ? 'translateX(100%)' : 'translateX(0)' }}
    >
      {/* HEADER DO EDITOR */}
      <div className="p-5 border-b border-[#1f2b3e] flex justify-between items-center bg-gradient-to-r from-[#0a0f18] to-[#131c2a] rounded-tr-2xl">
        <div className="flex items-center gap-3 text-[#C5A059]">
          <FunctionSquare className="w-5 h-5" />
          <div>
            <h3 className="font-bold tracking-widest uppercase text-[10px]">Editor de Fórmulas</h3>
            <p className="text-[#64748b] text-[9px] uppercase tracking-wider mt-0.5">
              Editando: <span className="text-white font-bold">{targetName}</span>
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 text-[#64748b] hover:text-[#C5A059] hover:bg-[#C5A059]/10 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* CORPO DO EDITOR (Com rolagem) */}
      <div className="flex-1 p-6 overflow-y-auto maono-scroll space-y-8">
        
        {/* Input da Sintaxe */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-[#8c9fba] mb-3 tracking-widest">Sintaxe da Fórmula</label>
          <input 
            type="text" 
            value={tempFormula}
            onChange={(e) => setTempFormula(e.target.value.toUpperCase())} // Força maiúsculo
            className="w-full bg-[#131c2a] border border-[#1f2b3e] focus:border-[#C5A059] rounded-xl px-4 py-3 text-[#C5A059] text-sm font-mono outline-none transition-colors shadow-inner"
            placeholder="Ex: SUM(faturamento)"
          />
        </div>

        {/* Botões de Funções (Helpers) */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-[#8c9fba] mb-3 tracking-widest">Funções Básicas</label>
          <div className="flex flex-wrap gap-2">
            {['COUNT()', 'SUM()', 'AVG()'].map(fn => (
              <button 
                key={fn} 
                onClick={() => insertText(fn.replace('()', '('))} // Insere já abrindo o parênteses
                className="px-3 py-1.5 bg-[#172233] hover:bg-[#C5A059]/20 border border-[#1f2b3e] hover:border-[#C5A059] text-[#8c9fba] hover:text-[#C5A059] text-[10px] font-mono rounded-lg transition-all"
              >
                {fn}
              </button>
            ))}
          </div>
        </div>

        {/* Colunas do Arquivo Real do Usuário */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[#8c9fba] mb-3 tracking-widest">
            <Database className="w-3 h-3" /> Colunas Detectadas
          </label>
          
          {availableColumns.length === 0 ? (
            <div className="p-4 border border-dashed border-[#1f2b3e] rounded-xl bg-[#0a0f18] text-center">
              <p className="text-[#64748b] text-[10px] italic">Nenhum dado importado no mapa ainda.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableColumns.map(col => (
                <button 
                  key={col} 
                  onClick={() => insertText(col + ')')} // Insere o nome e já fecha o parênteses
                  className="px-3 py-1.5 bg-[#0a0f18] hover:bg-[#C5A059]/10 border border-[#1f2b3e] hover:border-[#C5A059] text-[#64748b] hover:text-[#C5A059] text-[10px] rounded-lg transition-all"
                >
                  {col}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER (Botão Salvar) */}
      <div className="p-5 border-t border-[#1f2b3e] bg-[#0a0f18] rounded-br-2xl">
        <button 
          onClick={() => { onApply(tempFormula); onClose(); }}
          className="w-full py-3.5 bg-gradient-to-r from-[#172233] to-[#0d141f] border border-[#C5A059]/30 hover:border-[#C5A059] text-[#C5A059] text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg flex justify-center items-center gap-2"
        >
          <Save className="w-4 h-4" /> Aplicar Fórmula
        </button>
      </div>
    </div>
  );
}