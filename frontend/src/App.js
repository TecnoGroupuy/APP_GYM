import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import TrainerDashboard from './pages/TrainerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminSupervision from './pages/AdminSupervision';
import AuthModal from './components/AuthModal';
import './index.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const getApiErrorMessage = (data, fallback) => {
  if (data?.message) return data.message;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors[0]?.msg || fallback;
  }
  return fallback;
};

const InitialPasswordGate = () => {
  const { user, updateUser, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!user?.forcePasswordChange) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('La nueva contrase�a debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contrase�as no coinciden.');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('bootcamp_token');
      const response = await fetch(`${API_BASE_URL}/auth/change-initial-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(getApiErrorMessage(data, 'No se pudo cambiar la contrase�a'));
      updateUser({ ...data.user, forcePasswordChange: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contrase�a');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bootcamp-gray border border-bootcamp-orange/30 p-6 space-y-4">
        <h2 className="text-2xl font-black uppercase">Cambio de contrase�a</h2>
        <p className="text-sm text-gray-400">
          Primer ingreso detectado. Debes cambiar tu contrase�a para continuar.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Contrase�a actual"
            className="w-full input-bootcamp px-4 py-3 text-white"
            required
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nueva contrase�a"
            className="w-full input-bootcamp px-4 py-3 text-white"
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmar nueva contrase�a"
            className="w-full input-bootcamp px-4 py-3 text-white"
            required
          />

          {error ? <div className="text-sm text-red-400">{error}</div> : null}

          <button type="submit" disabled={saving} className="btn-bootcamp w-full disabled:opacity-60">
            {saving ? 'Guardando...' : 'Actualizar contrase�a'}
          </button>
        </form>

        <button onClick={logout} className="w-full py-2 border border-white/20 text-sm uppercase">
          Cerrar sesi�n
        </button>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, allowedRoles = ['user', 'trainer', 'admin'] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bootcamp-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-bootcamp-orange border-t-transparent rounded animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppContent = () => {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const openLogin = () => {
    setAuthMode('login');
    setAuthModalOpen(true);
  };

  const openRegister = () => {
    setAuthMode('register');
    setAuthModalOpen(true);
  };

  return (
    <>
      <Routes>
        <Route 
          path="/" 
          element={
            user ? 
            <Navigate to={
              user.role === 'admin' ? '/admin' :
              user.role === 'trainer' ? '/trainer' :
              '/dashboard'
            } replace /> : 
            <LandingPage onLoginClick={openLogin} onRegisterClick={openRegister} />
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['user']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/trainer"
          element={
            <ProtectedRoute allowedRoles={['trainer', 'admin']}>
              <TrainerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/supervision"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminSupervision />
            </ProtectedRoute>
          }
        />
      </Routes>

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        initialMode={authMode}
      />
      <InitialPasswordGate />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;

