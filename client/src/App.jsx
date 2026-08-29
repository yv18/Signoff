import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';

import Aurora from './components/Aurora.jsx';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';
import CookieBanner from './components/CookieBanner.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import Editor from './pages/Editor.jsx';
import Legal from './pages/Legal.jsx';

export default function App() {
  const { pathname } = useLocation();
  const hideFooter = pathname === '/editor' || pathname === '/login' || pathname === '/register';

  return (
    <>
      <Aurora />
      <Box sx={{ position: 'relative', zIndex: 2, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <Nav />
        <Box sx={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/register" element={<Auth mode="register" />} />
            <Route path="/editor" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
            <Route path="/privacy" element={<Legal doc="privacy" />} />
            <Route path="/terms" element={<Legal doc="terms" />} />
            <Route path="/cookies" element={<Legal doc="cookies" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
        {!hideFooter && <Footer />}
      </Box>
      <CookieBanner />
    </>
  );
}
