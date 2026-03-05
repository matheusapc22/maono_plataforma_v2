import { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { wrapTo, toggleModal } from "@kepler.gl/actions";
import { Sidebar } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";
import { FilterPanel } from "../components/FilterPanel";
import { DataPanel } from "../components/DataPanel"; // 🚀 Importamos a Nova Tela
import { KeplerPanelErrorBoundary } from "../components/KeplerPanelErrorBoundary";
import { MaonoDataImporter } from "../components/MaonoDataImporter"; 

const KEPLER_ID = "map";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [activePanel, setActivePanel] = useState("layers");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  const dispatch = useDispatch();

  // Quando clicar na pasta na barra lateral, abre a aba de Dados
  const handleOpenData = () => {
    handlePanelSelect("dados");
  };

  const handlePanelSelect = (panel: string) => {
    dispatch(wrapTo(KEPLER_ID, toggleModal(null)));
    
    if (panel === "home" || panel === "charts" || panel === "users") {
      setActivePanel(panel);
      setIsPanelOpen(false);
      return;
    }
    if (activePanel === panel) setIsPanelOpen(!isPanelOpen);
    else { setActivePanel(panel); setIsPanelOpen(true); }
  };

  // 🚀 O painel flutuante fica aberto tanto se for "layers" (Filtros) quanto "dados" (Arquivos)
  const isPanelActive = ["layers", "dados"].includes(activePanel);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#020305]">
      <Sidebar
        activePanel={activePanel}
        onPanelSelect={handlePanelSelect}
        onOpenDataModal={handleOpenData} // 🚀 Roteia a pasta para a aba "dados"
      />

      <div className="flex flex-col flex-1 h-full min-w-0">
        <Topbar />

        <main className="flex flex-1 relative overflow-hidden bg-[#020305]">
          
          <div 
            className="absolute top-0 left-0 h-full z-50 transition-transform duration-500 ease-out flex"
            style={{ transform: isPanelOpen && isPanelActive ? 'translateX(0)' : 'translateX(-380px)' }}
          >
            <div className="w-[380px] h-full bg-[#04060a]/95 backdrop-blur-xl shadow-[20px_0_40px_rgba(0,0,0,0.8)] border-r border-[#161f30]">
              <KeplerPanelErrorBoundary>
                {/* 🚀 RENDERIZAÇÃO CONDICIONAL DA BARRA LATERAL */}
                {activePanel === "layers" && <FilterPanel />}
                {activePanel === "dados" && <DataPanel onOpenImporter={() => setIsImporterOpen(true)} />}
              </KeplerPanelErrorBoundary>
            </div>

            {isPanelActive && (
              <button 
                type="button"
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className="absolute top-6 -right-8 w-8 h-12 bg-gradient-to-b from-[#131c2a] to-[#0b1019] border-y border-r border-[#1f2b3e] rounded-r flex items-center justify-center text-[#8a6d3b] hover:text-[#C5A059] hover:border-[#C5A059]/40 transition-all cursor-pointer shadow-[5px_5px_20px_rgba(0,0,0,0.6)] group"
              >
                <svg className="w-4 h-4 drop-shadow-[0_0_5px_rgba(197,160,89,0.5)] transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isPanelOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  )}
                </svg>
              </button>
            )}
          </div>

          <div className="flex-1 h-full w-full relative z-0">
            {children}
          </div>
          
        </main>
      </div>

      <MaonoDataImporter 
        isOpen={isImporterOpen} 
        onClose={() => setIsImporterOpen(false)} 
      />

    </div>
  );
}