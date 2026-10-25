import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { Navbar } from './components/layout/Navbar.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { PurchasesPage } from './pages/PurchasesPage.js';

/**
 * Route table.
 *
 * Everything meaningful sits behind <ProtectedRoute>, which matches the API:
 * the vehicle endpoints all require a token, so an anonymous visitor has
 * nothing to show.
 */
export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="flex min-h-screen flex-col">
          <Navbar />

          <main className="flex-1">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/purchases" element={<PurchasesPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="border-t border-ink-700/60 py-6">
            <p className="text-center text-xs text-ink-500">
              Apex Motors - a TDD kata build. React, Tailwind, Express and SQLite.
            </p>
          </footer>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
