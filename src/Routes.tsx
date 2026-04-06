// src/Routes.tsx
import { lazy, Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router';
import AppLayout from './layout/AppLayout';
import Login from './pages/login';

const KeplerAppRoutes = lazy(() => import('./pages/Kepler'));

// ==========================================
// 🛡️ O GUARDIÃO DA PLATAFORMA (ProtectedRoute)
// ==========================================
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  // O Guardião verifica se a chave mestra (Token) está no cofre do navegador
  const token = localStorage.getItem("@maono:token");
  
  // Se não tiver token, manda de volta para a tela de login
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // Se tiver token, libera a passagem (renderiza a tela do mapa)
  return children;
};

const AppRoutes = () => {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#030508] text-[#C5A059] font-bold tracking-widest uppercase">
        Carregando Plataforma...
      </div>
    }>
      <Routes>
        {/* ==========================================
            🔓 ROTA PÚBLICA (Sem Menu Lateral)
            ========================================== */}
        <Route path="/login" element={<Login />} />

        {/* ==========================================
            🔐 ROTAS PRIVADAS (Com Menu Lateral)
            ========================================== */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<KeplerAppRoutes />} />
                  <Route path="/map" element={<KeplerAppRoutes />} />
                  <Route path="/:id" element={<KeplerAppRoutes />} />
                  <Route path="/map/:provider" element={<KeplerAppRoutes />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;