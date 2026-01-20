export function Topbar() {
  return (
    <header className="h-12 bg-gray-800 text-white flex justify-between items-center px-4">
      <div className="font-bold">Maono</div>
      <div className="flex items-center gap-4">
        <button className="text-xs">EN</button>
        <button className="text-xs">🌗</button>
        <button className="text-xs">👤</button>
      </div>
    </header>
  )
}