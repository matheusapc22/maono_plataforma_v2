import { useState } from "react";
import { useDispatch } from "react-redux";
import { wrapTo, toggleModal } from "@kepler.gl/actions";
import { Sidebar } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";
import { FilterPanel } from "../components/FilterPanel";
import { DataPanel } from "../components/DataPanel";
import { AnalyticsPanel } from "../components/AnalyticsPanel"; 
import { UserManagementPanel } from "../components/UserManagementPanel"; 
import OrganizationManagementPanel from "../components/OrganizationManagementPanel"; 
import { KeplerPanelErrorBoundary } from "../components/KeplerPanelErrorBoundary";
import { MaonoDataImporter } from "../components/MaonoDataImporter";
import { MapOverlayControls } from "../components/MapOverlayControls"; 

const KEPLER_ID = "map";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [activePanel, setActivePanel] = useState("layers");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false); 

  const dispatch = useDispatch();

  const handleOpenData = () => {
    handlePanelSelect("dados");
  };

  const handlePanelSelect = (panel: string) => {
    dispatch(wrapTo(KEPLER_ID, toggleModal(null)));
    
    setIsAIPanelOpen(false); 
    setIsColumnsOpen(false);
    
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

  const isPanelActive = ["layers", "dados", "charts", "users"].includes(activePanel);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#020305]">
      
      {/* 🚀 O ARSENAL DE FORÇA BRUTA: Desliga os controles teimosos do Kepler e do Mapbox na marra via CSS */}
      {activePanel === 'organizations' && (
        <style>{`
          .map-control,
          .mapboxgl-control-container,
          .maono-controls,
          #kepler-gl__map .map-control-panel {
             opacity: 0 !important;
             pointer-events: none !important;
             visibility: hidden !important;
             z-index: -1 !important;
             display: none !important;
          }
        `}</style>
      )}

      <Sidebar activePanel={activePanel} onPanelSelect={handlePanelSelect} onOpenDataModal={handleOpenData} />

      <div className="flex flex-col flex-1 h-full min-w-0 relative">
        <Topbar />

        <main className="flex flex-1 relative overflow-hidden bg-[#020305]">
          
          {/* PAINÉIS DESLIZANTES NORMAIS (Camadas, Filtros, Utilizadores...) */}
          <div 
            className="absolute top-0 left-0 h-full z-[9999] transition-all duration-500 ease-out flex"
            style={{ 
              transform: isPanelOpen && isPanelActive ? 'translateX(0)' : 'translateX(-100%)', 
              width: ['charts', 'users'].includes(activePanel) ? '50%' : '380px' 
            }}
          >
            <div className="w-full h-full bg-[#04060a]/95 backdrop-blur-xl shadow-[20px_0_40px_rgba(0,0,0,0.8)] border-r border-[#161f30] overflow-hidden">
              <KeplerPanelErrorBoundary>
                {activePanel === "layers" && <FilterPanel />}
                {activePanel === "dados" && <DataPanel onOpenImporter={() => setIsImporterOpen(true)} />}
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

            {/* Setinha de fechar (Apenas para os painéis normais) */}
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

          {/* 🚀 PAINEL DO CEO ABSOLUTO EM TELA CHEIA (Fixed para quebrar a prisão do React e sobrepor tudo) */}
          {activePanel === 'organizations' && (
            <div className="fixed top-0 left-20 right-0 bottom-0 z-[999999999] bg-[#020305] overflow-y-auto shadow-2xl">
              <OrganizationManagementPanel />
            </div>
          )}

          {/* CAPA DE INVISIBILIDADE DO MAPA */}
          <div 
            className={`flex-1 h-full w-full relative z-0 transition-opacity duration-300 ${
              activePanel === 'organizations' ? 'opacity-0 pointer-events-none invisible' : 'opacity-100 visible'
            }`}
          >
            {children}
            <MapOverlayControls />
          </div>
          
        </main>
      </div>

      <MaonoDataImporter isOpen={isImporterOpen} onClose={() => setIsImporterOpen(false)} />
    </div>
  );
}