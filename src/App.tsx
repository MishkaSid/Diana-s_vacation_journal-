import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { DestinationPage } from './pages/DestinationPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  const { authenticated, checking, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    void logout().then(() => {
      navigate('/login', { replace: true });
    });
  };

  if (checking) {
    return (
      <div className="loadingState" style={{ minHeight: '100vh' }}>
        <div className="loadingSpinner" aria-hidden="true" />
        Checking session…
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={authenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage onLogout={handleLogout} />} />
        <Route
          path="/destination/:id"
          element={<DestinationPage onLogout={handleLogout} />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
