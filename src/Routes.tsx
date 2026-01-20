import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from './layout/AppLayout'

const KeplerAppRoutes = lazy(() => import('./pages/Kepler'))

const AppRoutes = () => {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-4">Carregando mapa...</div>}>
        <Routes>
          <Route path="/" element={<KeplerAppRoutes />} />
          <Route path="/map" element={<KeplerAppRoutes />} />
          <Route path="/:id" element={<KeplerAppRoutes />} />
          <Route path="/map/:provider" element={<KeplerAppRoutes />} />
        </Routes>
      </Suspense>
    </AppLayout>
  )
}

export default AppRoutes