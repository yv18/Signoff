import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user, booting } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  return children;
}
