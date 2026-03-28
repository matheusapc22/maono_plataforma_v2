import { useState } from "react";
import { useDispatch } from "react-redux";
import { wrapTo, toggleModal } from "@kepler.gl/actions";
import { Sidebar } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";
import { FilterPanel } from "../components/FilterPanel";
import { DataPanel } from "../components/DataPanel";
import { AnalyticsPanel } from "../components/AnalyticsPanel"; 
import { UserManagementPanel } from "../components/UserManagementPanel"; // 🚀 1. IMPORTAÇÃO DO PAINEL
import { KeplerPanelErrorBoundary } from "../components/KeplerPanelErrorBoundary";
import { MaonoDataImporter } from "../components/MaonoDataImporter";
import { MapOverlayControls } from "../components/MapOverlayControls"; 

const KEPLER_ID = "map";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [activePanel, setActivePanel] = useState("layers");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  
  // ESTADOS ELEVADOS: O layout agora controla as DUAS gavetas externas
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false); 

  const dispatch = useDispatch();

  const handleOpenData = () => {
    handlePanelSelect("dados");
  };

  const handlePanelSelect = (panel: string) => {
    dispatch(wrapTo(KEPLER_ID, toggleModal(null)));
    
    // Fecha as gavetas ao trocar de aba
    setIsAIPanelOpen(false); 
    setIsColumnsOpen(false);
    
    // 🚀 2. REMOVIDO o "users" daqui. Se ficasse aqui, o painel nunca abriria!
    if (panel === "home") {
      setActivePanel(panel);
      setIsPanelOpen(false);
      return;
    }

    if (activePanel === panel) {
      setIsPanelOpen(!isPanelOpen);
    } else {
      setActivePanel(panel);
      setIsPanelOpen(true);
    }
  };

  // 🚀 3. ADICIONADO "users" no array que permite o painel ser renderizado
  const isPanelActive = ["layers", "dados", "charts", "users"].includes(activePanel);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#020305]">
      <Sidebar activePanel={activePanel} onPanelSelect={handlePanelSelect} onOpenDataModal={handleOpenData} />

      <div className="flex flex-col flex-1 h-full min-w-0">
        <Topbar />

        <main className="flex flex-1 relative overflow-hidden bg-[#020305]">
          
          <div 
            className="absolute top-0 left-0 h-full z-50 transition-all duration-500 ease-out flex"
            style={{ 
              transform: isPanelOpen && isPanelActive ? 'translateX(0)' : 'translateX(-100%)', 
              // 🚀 4. LARGURA: Se for "charts" ou "users", ocupa 50% da tela para a tabela respirar
              width: ['charts', 'users'].includes(activePanel) ? '50%' : '380px' 
            }}
          >
            <div className="w-full h-full bg-[#04060a]/95 backdrop-blur-xl shadow-[20px_0_40px_rgba(0,0,0,0.8)] border-r border-[#161f30]">
              <KeplerPanelErrorBoundary>
                {activePanel === "layers" && <FilterPanel />}
                {activePanel === "dados" && <DataPanel onOpenImporter={() => setIsImporterOpen(true)} />}
                
                {/* 🚀 5. INSERÇÃO DO COMPONENTE NA ÁRVORE DE RENDERIZAÇÃO */}
                {activePanel === "users" && <UserManagementPanel />}
                
                {activePanel === "charts" && (
                  <AnalyticsPanel 
                    isAIPanelOpen={isAIPanelOpen} 
                    setIsAIPanelOpen={setIsAIPanelOpen} 
                    isColumnsOpen={isColumnsOpen}
                    setIsColumnsOpen={setIsColumnsOpen}
                  />
                )}
              </KeplerPanelErrorBoundary>
            </div>

            {isPanelActive && (
              <button 
                type="button"
                onClick={() => {
                  setIsPanelOpen(!isPanelOpen);
                  if (isPanelOpen) {
                    setIsAIPanelOpen(false);
                    setIsColumnsOpen(false);
                  }
                }}
                className="absolute top-29 flex items-center justify-center transition-all duration-500 ease-in-out cursor-pointer group outline-none z-50"
                style={{
                  right: activePanel === 'charts' 
                    ? (isAIPanelOpen ? '-428px' : isColumnsOpen ? '-328px' : '-21px')
                    : '-21px', 
                  width: '19px',
                  height: '50px', 
                  backgroundColor: '#0a0f18',
                  borderTop: '2px solid #C5A059',
                  borderRight: '2px solid #C5A059',
                  borderBottom: '2px solid #C5A059',
                  borderLeft: 'none', 
                  borderRadius: '0 12px 12px 0',
                  color: '#C5A059',
                  boxShadow: '4px 0 10px rgba(197,160,89,0.25), inset 2px 0 5px rgba(197,160,89,0.3)' 
                }}
              >
                <svg className="w-5 h-5 transition-transform group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 3px rgba(197,160,89,0.7))' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <MapOverlayControls />
          </div>
          
        </main>
      </div>

      <MaonoDataImporter isOpen={isImporterOpen} onClose={() => setIsImporterOpen(false)} />
    </div>
  );
}