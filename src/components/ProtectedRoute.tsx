import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { authenticated, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <div className="loadingState" style={{ minHeight: '100vh' }}>
        <div className="loadingSpinner" aria-hidden="true" />
        Checking session…
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
