import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar   from './components/Navbar';
import Login    from './pages/Login';
import Dashboard from './pages/Dashboard';
import PickTeam  from './pages/PickTeam';
import Leaderboard from './pages/Leaderboard';
import Admin    from './pages/Admin';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin } = useAuth();
  if (!user)                    return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin)    return <Navigate to="/dashboard" replace />;
  return children;
}

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/pick/:matchId" element={
        <ProtectedRoute>
          <Layout><PickTeam /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/leaderboard" element={
        <ProtectedRoute>
          <Layout><Leaderboard /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <Layout><Admin /></Layout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
