import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Welcome from './pages/Welcome'
import RegisterUser from './pages/RegisterUser'
import AdminLayout from './layouts/AdminLayout'
import PetugasLayout from './layouts/PetugasLayout'
import UserLayout from './layouts/UserLayout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminChatBot from './pages/admin/ChatBot'
import AdminLeaderboard from './pages/admin/Leaderboard'
import AdminMonitoring from './pages/admin/Monitoring'
import AdminSettings from './pages/admin/Settings'
import PetugasDashboard from './pages/petugas/Dashboard'
import KioskScan from './pages/user/KioskScan'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/register" element={<RegisterUser />} />
        <Route path="/" element={<Navigate to="/welcome" replace />} />

        {/* Admin Routes (Nested with AdminLayout) */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="chat" element={<AdminChatBot />} />
          <Route path="leaderboard" element={<AdminLeaderboard />} />
          <Route path="monitor" element={<AdminMonitoring />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Petugas Routes (Nested with PetugasLayout) */}
        <Route path="/petugas" element={<PetugasLayout />}>
          <Route path="dashboard" element={<PetugasDashboard />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* User Routes (Nested with UserLayout) - Direct route like program lama */}
        <Route path="/user" element={<UserLayout />}>
          <Route index element={<KioskScan />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </Router>
  )
}

export default App

