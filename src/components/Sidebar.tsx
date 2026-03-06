import { Home, Layers, Folder, BarChart2, Users, LogOut, SunMoon } from 'lucide-react'
import LogoSimbolo from '../assets/images/Logo_Simbolo.png' 

interface SidebarProps {
  activePanel: string
  onPanelSelect: (panel: string) => void
  onOpenDataModal: () => void
  onToggleTheme?: () => void
  onLogout?: () => void
}

export function Sidebar({
  activePanel,
  onPanelSelect,
  onOpenDataModal,
  onToggleTheme,
  onLogout
}: SidebarProps) {
  
  const menuItems = [
    { id: 'layers', icon: Layers, label: 'Camadas', action: () => onPanelSelect('layers') },
    { id: 'charts', icon: BarChart2, label: 'Análises', action: () => onPanelSelect('charts') }, 
    { id: 'dados', icon: Folder, label: 'Gestão de Dados', action: onOpenDataModal }, 
    { id: 'users', icon: Users, label: 'Usuários', action: () => onPanelSelect('users') },
    { id: 'home', icon: Home, label: 'Início', action: () => onPanelSelect('home') }, 
  ]

  return (
    // 🚀 AJUSTE: Removido o space-y global e ajustado o padding do topo (pt-8)
    <aside className="w-20 bg-[#04060a] text-white flex flex-col items-center pt-8 pb-6 z-[60] border-r border-[#161f30]">
      
      <img 
        src={LogoSimbolo} 
        alt="Maõno Logo" 
        // 🚀 AJUSTE CRÍTICO: Margem inferir (mb-20) aumentada para empurrar o menu para baixo
        className="w-10 h-auto mb-20 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" 
      />

      {/* 🚀 AJUSTE: gap-4 para deixar os ícones respirarem melhor entre si */}
      <div className="flex flex-col gap-4 w-full items-center">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activePanel === item.id
          return (
            <div key={item.id} className="relative group flex justify-center w-full">
              <button
                type="button"
                onClick={item.action}
                className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-500 ${
                  isActive 
                    ? 'bg-gradient-to-b from-[#131c2a] to-[#0b1019] border border-[#C5A059]/40 text-[#C5A059] shadow-[inset_0_1px_0_rgba(197,160,89,0.2),0_0_15px_rgba(197,160,89,0.1)]' 
                    : 'border border-transparent text-gray-600 hover:text-gray-300 hover:bg-[#0a0f18]'
                }`}
                aria-label={item.label}
                title={item.label}
              >
                <Icon className="w-[22px] h-[22px] drop-shadow-md" />
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-auto space-y-4 flex flex-col items-center w-full">
        <button
          type="button"
          onClick={onToggleTheme}
          className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-[#0a0f18] text-gray-600 hover:text-[#C5A059] transition-colors"
          title="Tema"
        >
          <SunMoon className="w-[22px] h-[22px]" />
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-[#1a0f14] text-gray-600 hover:text-red-500 transition-colors"
          title="Sair"
        >
          <LogOut className="w-[22px] h-[22px]" />
        </button>
      </div>
    </aside>
  )
}