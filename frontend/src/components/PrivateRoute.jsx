import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';

export default function PrivateRoute({ children }) {
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!accessToken) {
    return <Navigate to="/contratid/login" replace />;
  }

  return children;
}
