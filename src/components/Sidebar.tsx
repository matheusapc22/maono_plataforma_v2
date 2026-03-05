import { Home, Layers, Folder, BarChart2, Users, LogOut, SunMoon } from 'lucide-react'

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
    { id: 'home', icon: Home, label: 'Início', action: () => onPanelSelect('home') },
    { id: 'layers', icon: Layers, label: 'Camadas', action: () => onPanelSelect('layers') },
    // 🚀 CORREÇÃO DO ID: Mudou de 'data' para 'dados' para bater com o estado do AppLayout
    { id: 'dados', icon: Folder, label: 'Gestão de Dados', action: onOpenDataModal },
    { id: 'charts', icon: BarChart2, label: 'Análises', action: () => onPanelSelect('charts') },
    { id: 'users', icon: Users, label: 'Usuários', action: () => onPanelSelect('users') },
  ]

  return (
    // 🚀 FUNDO 1: Base preta/azul profundíssima com borda extremamente sutil
    <aside className="w-16 bg-[#04060a] text-white flex flex-col items-center py-4 space-y-6 z-[60] border-r border-[#161f30]">
      
      {/* 🚀 LOGO COM PROFUNDIDADE */}
      <div className="w-10 h-10 mb-2 rounded-full border border-[#2a3a54] bg-gradient-to-b from-[#111926] to-[#070a10] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] flex items-center justify-center text-[8px] text-gray-500 font-bold uppercase text-center">
        Logo
      </div>

      {menuItems.map((item) => {
        const Icon = item.icon
        const isActive = activePanel === item.id
        return (
          <div key={item.id} className="relative group w-full px-2">
            <button
              type="button"
              onClick={item.action}
              // 🚀 DOURADO PREMIUM E LUZ: Botão ativo ganha gradient, borda dourada fria e sombra luminosa interna/externa
              className={`w-full flex justify-center py-3 rounded-xl transition-all duration-500 ${
                isActive 
                  ? 'bg-gradient-to-b from-[#131c2a] to-[#0b1019] border border-[#C5A059]/40 text-[#C5A059] shadow-[inset_0_1px_0_rgba(197,160,89,0.2),0_0_15px_rgba(197,160,89,0.1)]' 
                  : 'border border-transparent text-gray-600 hover:text-gray-300 hover:bg-[#0a0f18]'
              }`}
              aria-label={item.label}
              title={item.label}
            >
              <Icon className="w-[20px] h-[20px] drop-shadow-md" />
            </button>
          </div>
        )
      })}

      <div className="mt-auto space-y-4 flex flex-col items-center w-full px-2">
        <button
          type="button"
          onClick={onToggleTheme}
          className="w-full flex justify-center py-3 rounded-xl hover:bg-[#0a0f18] text-gray-600 hover:text-[#C5A059] transition-colors"
          title="Tema"
        >
          <SunMoon className="w-[20px] h-[20px]" />
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex justify-center py-3 rounded-xl hover:bg-[#1a0f14] text-gray-600 hover:text-red-500 transition-colors"
          title="Sair"
        >
          <LogOut className="w-[20px] h-[20px]" />
        </button>
      </div>
    </aside>
  )
}