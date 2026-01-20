import { Home, Layers, Folder, BarChart2, Users, LogOut, SunMoon } from 'lucide-react'

export function Sidebar() {
  return (
    <aside className="w-16 bg-gray-900 text-white flex flex-col items-center py-4 space-y-6">
      {[Home, Layers, Folder, BarChart2, Users].map((Icon, idx) => (
        <div key={idx} className="relative group">
          <Icon className="w-5 h-5 cursor-pointer hover:text-blue-400" />
          <span className="absolute left-10 top-1/2 transform -translate-y-1/2 bg-white text-black text-xs px-2 py-1 rounded hidden group-hover:block">
            Tooltip
          </span>
        </div>
      ))}
      <div className="mt-auto">
        <SunMoon className="w-5 h-5 cursor-pointer hover:text-yellow-400" />
        <LogOut className="w-5 h-5 mt-4 cursor-pointer hover:text-red-500" />
      </div>
    </aside>
  )
}