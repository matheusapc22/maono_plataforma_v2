import { Sidebar } from '../components/Sidebar'
import { Topbar } from '../components/Topbar'
import { FilterPanel } from '../components/FilterPanel'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Topbar />
        <main className="flex flex-1">
          <FilterPanel />
          <div className="flex-1 bg-gray-100">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
