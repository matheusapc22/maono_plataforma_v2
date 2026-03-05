import React, { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { addDataToMap, wrapTo } from '@kepler.gl/actions';
import { processCsvData, processGeojson } from '@kepler.gl/processors';
import { KEPLER_ID } from '../pages/Kepler/keplerBridge';

interface MaonoDataImporterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MaonoDataImporter({ isOpen, onClose }: MaonoDataImporterProps) {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'reading' | 'processing'>('idle');
  const [fileName, setFileName] = useState('');
  
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[][]>([]);
  const [keplerProcessedData, setKeplerData] = useState<any>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setFileName('');
    setPreviewHeaders([]);
    setPreviewRows([]);
    setKeplerData(null);
    setUploadStatus('idle');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // 🚀 O NOVO ESCUDO DE DADOS: Parser Anti-Desalinhamento
  const formatBrazilianCsv = (text: string): string => {
    const lines = text.split('\n');
    const firstLine = lines[0] || '';
    
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiColonCount = (firstLine.match(/;/g) || []).length;

    // Se o delimitador primário for o Ponto-e-Vírgula
    if (semiColonCount > commaCount) {
      return lines.map(line => {
        if (!line.trim()) return line; // Pula linhas vazias
        
        const columns = line.split(';');
        
        const processedCols = columns.map(col => {
          let val = col;
          let trimmedVal = val.trim();
          
          // 1. Transforma decimais BR em decimais US (Ex: -21,554 -> -21.554)
          if (/^-?\d+,\d+$/.test(trimmedVal)) {
            val = trimmedVal.replace(',', '.');
          }
          
          // 2. Protege textos que têm vírgula nativa colocando aspas duplas (Ex: Endereços)
          // Impede o Efeito Avalanche que empurrava as colunas de Lat/Lng para fora
          if (val.includes(',') && !val.startsWith('"')) {
            val = `"${val}"`;
          }
          
          return val;
        });
        
        // Agora podemos juntar com vírgula com 100% de segurança
        return processedCols.join(',');
      }).join('\n');
    }
    
    return text;
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setUploadStatus('reading');

    setTimeout(() => {
      const reader = new FileReader();

      reader.onload = (e) => {
        setUploadStatus('processing');

        setTimeout(() => {
          let text = e.target?.result as string;
          try {
            let data;
            if (file.name.toLowerCase().endsWith('.csv')) {
              // Applica a Blindagem Matemática antes do Kepler ler
              text = formatBrazilianCsv(text);
              data = processCsvData(text);
            } else if (file.name.toLowerCase().endsWith('.geojson') || file.name.toLowerCase().endsWith('.json')) {
              data = processGeojson(JSON.parse(text));
            } else {
              alert("Formato não suportado. Envie CSV ou GeoJSON.");
              setUploadStatus('idle');
              return;
            }

            const headers = data.fields.map((f: any) => f.name);
            const rows = data.rows.slice(0, 15); 

            setPreviewHeaders(headers);
            setPreviewRows(rows);
            setKeplerData(data);
            setUploadStatus('idle'); 
          } catch (error) {
            console.error("Erro ao processar arquivo:", error);
            alert("Falha ao ler o arquivo. Verifique a formatação.");
            setUploadStatus('idle');
          }
        }, 50); 
      };
      reader.readAsText(file);
    }, 50);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const confirmImport = () => {
    if (!keplerProcessedData) return;

    dispatch(wrapTo(KEPLER_ID, addDataToMap({
      datasets: {
        info: { 
          label: fileName.replace(/\.[^/.]+$/, ""),
          id: `dataset_${Date.now()}` 
        },
        data: keplerProcessedData
      },
      options: { centerMap: true, readOnly: false },
      // O Kepler fará o Auto-Binding automático pois as colunas agora estão alinhadas
      config: {} 
    })));

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#030508]/90 backdrop-blur-md transition-all duration-300 p-4">
      
      <div className="flex flex-col w-full max-w-6xl h-[85vh] min-h-[600px] bg-[#0a0f18] border border-[#1f2b3e] rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(197,160,89,0.15)] overflow-hidden relative">
        
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f2b3e]/80 bg-gradient-to-r from-[#131c2a] to-[#0a0f18] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#C5A059]/10 border border-[#C5A059]/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21-3.582-4-8-4s-8 1.79-8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
            </div>
            <h2 className="text-xl font-medium text-gray-100 tracking-wide">
              {keplerProcessedData ? 'Validação de Dados' : 'Importar Nova Base'}
            </h2>
          </div>
          
          {/* 🚀 BOTÃO 'X' BLINDADO COM INLINE STYLE */}
          <button 
            onClick={handleClose} 
            style={{ color: '#FFFFFF' }} 
            className="hover:text-[#C5A059] transition-colors p-2 rounded-full hover:bg-[#1f2b3e]/50 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {uploadStatus !== 'idle' && (
          <div className="absolute inset-0 top-[73px] flex flex-col items-center justify-center bg-[#0a0f18]/95 backdrop-blur-sm z-50">
            <div className="w-16 h-16 border-4 border-[#1f2b3e] border-t-[#C5A059] rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(197,160,89,0.3)]"></div>
            <span className="text-[#C5A059] text-sm font-bold tracking-widest uppercase mb-2">
              {uploadStatus === 'reading' ? 'Lendo Arquivo...' : 'Mapeando Colunas e Geometrias...'}
            </span>
            <span className="text-[#8c9fba] text-xs">Isso pode levar alguns segundos dependendo do peso dos dados.</span>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col bg-[#0a0f18]">
          {!keplerProcessedData && uploadStatus === 'idle' ? (
            
            <div className="flex-1 p-8 flex items-center justify-center">
              <div 
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center w-full max-w-3xl h-full max-h-[500px] border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 group ${isDragging ? 'border-[#C5A059] bg-[#C5A059]/5 scale-[0.98]' : 'border-[#1f2b3e] bg-[#0a111f] hover:border-[#C5A059]/50 hover:bg-[#131c2a]/50'}`}
              >
                <input 
                  type="file" 
                  accept=".csv, .json, .geojson" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      processFile(e.target.files[0]);
                      e.target.value = ''; 
                    }
                  }} 
                />
                
                <div className="w-24 h-24 mb-6 rounded-full bg-[#131c2a] group-hover:bg-[#C5A059]/10 flex items-center justify-center transition-colors shadow-inner">
                  <svg className={`w-12 h-12 transition-colors ${isDragging ? 'text-[#C5A059]' : 'text-[#64748b] group-hover:text-[#C5A059]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                
                <span className="text-gray-200 text-2xl font-light mb-3">Arraste e solte o arquivo aqui</span>
                <span className="text-[#64748b] text-sm">ou clique para procurar no seu computador</span>
                
                <div className="flex gap-6 mt-10">
                  <div className="flex flex-col items-center gap-2">
                    <span className="px-5 py-2 bg-[#1a2435] text-[#8c9fba] border border-[#1f2b3e] text-[11px] font-bold rounded uppercase tracking-wider">CSV</span>
                    <span className="text-[10px] text-[#64748b]">Tabelas / Planilhas</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="px-5 py-2 bg-[#1a2435] text-[#8c9fba] border border-[#1f2b3e] text-[11px] font-bold rounded uppercase tracking-wider">GEOJSON</span>
                    <span className="text-[10px] text-[#64748b]">Polígonos e Malhas</span>
                  </div>
                </div>
              </div>
            </div>

          ) : keplerProcessedData ? (
            
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 py-4 bg-[#0d141f] border-b border-[#1f2b3e] shrink-0">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span className="text-[#C5A059] font-medium text-sm">{fileName}</span>
                  <span className="px-2.5 py-1 bg-[#1a2435] text-[#8c9fba] text-[10px] rounded-full ml-3 border border-[#1f2b3e]">{previewHeaders.length} Colunas Mapeadas</span>
                </div>
                <span className="text-xs text-[#64748b] italic">Amostra: {previewRows.length} de {keplerProcessedData.rows.length} linhas</span>
              </div>
              
              <div className="flex-1 overflow-auto maono-scroll bg-[#0a0f18]">
                <table className="min-w-full text-left border-collapse whitespace-nowrap">
                  <thead className="sticky top-0 z-20 shadow-md">
                    <tr>
                      <th className="w-14 bg-[#161f30] text-[#64748b] text-[10px] font-bold text-center py-3.5 border-b border-r border-[#1f2b3e] sticky left-0 z-30">#</th>
                      {previewHeaders.map((header, idx) => (
                        <th key={idx} className="bg-[#131c2a] text-[#8c9fba] text-[10px] font-bold tracking-widest uppercase px-5 py-3.5 border-b border-r border-[#1f2b3e] hover:bg-[#1a2435] transition-colors max-w-[300px] truncate" title={header}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-xs text-gray-300 font-mono">
                    {previewRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-[#131c2a]/60 transition-colors group">
                        <td className="w-14 bg-[#0d141f] text-[#64748b] text-center py-3 border-b border-r border-[#1f2b3e] sticky left-0 z-10 group-hover:bg-[#161f30] transition-colors">
                          {rowIndex + 1}
                        </td>
                        {row.map((cell, cellIndex) => {
                          const cellContent = cell !== null && cell !== undefined ? String(cell) : '';
                          const isNull = !cellContent;
                          return (
                            <td key={cellIndex} className={`px-5 py-3 border-b border-r border-[#1f2b3e] max-w-[300px] truncate ${isNull ? 'bg-[#1a2435]/30' : ''}`} title={cellContent}>
                              {isNull ? <span className="text-[#64748b]/40 italic text-[11px]">NULL</span> : cellContent}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        {/* Rodapé (Ações) - 🚀 BOTOES BLINDADOS CONTRA O KEPLER */}
        {keplerProcessedData && uploadStatus === 'idle' && (
          <div className="flex items-center justify-end gap-4 px-6 py-5 border-t border-[#1f2b3e]/80 bg-[#0a111f] shrink-0">
            <button 
              onClick={resetState} 
              style={{ color: '#FFFFFF', backgroundColor: '#1f2b3e', border: '1px solid #3a4a64' }}
              className="px-6 py-2.5 text-xs font-bold hover:bg-[#2a3a54] transition-colors uppercase tracking-widest rounded-lg shadow-md"
            >
              Cancelar
            </button>
            
            <button 
              onClick={confirmImport} 
              style={{ color: '#000000', backgroundColor: '#C5A059' }}
              className="px-8 py-3 text-xs font-extrabold hover:bg-[#dfb96f] rounded-lg uppercase tracking-widest shadow-[0_0_20px_rgba(197,160,89,0.5)] transition-all transform hover:-translate-y-0.5"
            >
              Confirmar & Mapear Arquivo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}