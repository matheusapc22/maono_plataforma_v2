export function FilterPanel() {
  return (
    <aside className="w-64 p-4 bg-white border-r border-gray-200">
      <div className="mb-4">
        <label className="block mb-1 font-bold">UF</label>
        <select className="w-full border px-2 py-1 rounded">
          <option>Todos</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-bold">Cidade</label>
        <select className="w-full border px-2 py-1 rounded">
          <option>Todos</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-bold">População</label>
        <input type="range" className="w-full" />
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-bold">PIB</label>
        <input type="range" className="w-full" />
      </div>
      <button className="bg-blue-500 text-white px-4 py-2 rounded">Aplicar Filtros</button>
    </aside>
  )
}
