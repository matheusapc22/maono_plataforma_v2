import { Sidebar } from '../components/Sidebar'
import { Topbar } from '../components/Topbar'
import { FilterPanel } from '../components/FilterPanel'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Topbar />
        <main className="flex flex-1 min-h-0">
          <FilterPanel />
          <div className="flex-1 bg-gray-100 min-h-0 relative overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
