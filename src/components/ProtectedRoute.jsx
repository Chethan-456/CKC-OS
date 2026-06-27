import { Navigate } from 'react-router-dom';
import { useAuth } from '../pages/auth.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // If still loading session state, render nothing or a spinner
  if (loading) {
    return null; // Or a loading spinner if preferred, though AppRoutes handles global loading
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}