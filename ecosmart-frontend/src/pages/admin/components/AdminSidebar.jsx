import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  MessageSquare,
  Trophy,
  Settings,
  LogOut,
  Monitor,
} from 'lucide-react'
import { useSessionPolling } from '../../../hooks/useSessionPolling'
import { logout } from '../../../services/api'

const AdminSidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  // FIX: Disable polling di admin sidebar untuk prevent redirect loop saat logout
  const { session } = useSessionPolling(false)

  const menuItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/chat', icon: MessageSquare, label: 'Chat AI' },
    { path: '/admin/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { path: '/admin/monitor', icon: Monitor, label: 'Monitoring' },
    { path: '/admin/settings', icon: Settings, label: 'Pengaturan' },
  ]

  const handleLogout = (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    // Kumpulkan semua log untuk disimpan
    const logs = []
    const log = (message, data = null) => {
      const logEntry = `[LOGOUT ADMIN] ${message}${data ? ': ' + JSON.stringify(data) : ''}`
      console.log(logEntry)
      logs.push(logEntry)
    }
    
    log('========== START LOGOUT ==========')
    log('Current URL', window.location.href)
    log('Current pathname', window.location.pathname)
    log('Session before logout', session)
    
    // CRITICAL: Clear session di backend TERLEBIH DAHULU - WAIT untuk memastikan session clear
    // Gunakan async/await untuk memastikan backend clear session sebelum redirect
    const clearSessionAndRedirect = async () => {
      try {
        log('Clearing session di backend...')
        // Coba ambil session dari check-session dulu untuk dapat rfid_uid
        const sessionCheck = await fetch('http://localhost:5001/api/check-session')
        const sessionData = await sessionCheck.json()
        log('Current session from backend', sessionData)
        
        // Clear session di backend - WAIT untuk response
        const logoutResponse = await fetch('http://localhost:5001/api/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            rfid_uid: session?.user?.rfid_uid || sessionData?.user?.rfid_uid || 'admin',
            role: 'admin' 
          })
        })
        
        const logoutData = await logoutResponse.json()
        log('Backend logout response status', logoutResponse.status)
        log('Backend logout data', logoutData)
        
        // Verifikasi session sudah clear
        await new Promise(resolve => setTimeout(resolve, 200)) // Tunggu 200ms
        const verifySession = await fetch('http://localhost:5001/api/check-session')
        const verifyData = await verifySession.json()
        log('Session after logout (should be inactive)', verifyData)
        
        // Simpan log ke localStorage
        localStorage.setItem('lastLogoutLog', JSON.stringify({
          timestamp: new Date().toISOString(),
          logs: logs,
          backendResponse: logoutData,
          sessionAfterLogout: verifyData
        }))
        
        // Redirect setelah session benar-benar clear
        redirectToWelcome()
      } catch (err) {
        log('Backend logout error', err.message)
        // Simpan log error juga
        localStorage.setItem('lastLogoutLog', JSON.stringify({
          timestamp: new Date().toISOString(),
          logs: logs,
          error: err.message
        }))
        // Tetap redirect meski error
        redirectToWelcome()
      }
    }
    
    function redirectToWelcome() {
      log('Redirecting to welcome...')
      const targetUrl = window.location.origin + '/welcome'
      log('Target URL', targetUrl)
      
      // Set logout timestamp untuk prevent re-login (sebelum redirect)
      const logoutTime = Date.now()
      if (window.__setLogoutTimestamp) {
        window.__setLogoutTimestamp(logoutTime)
        log('Logout timestamp set', new Date(logoutTime).toISOString())
      }
      
      // DELAY 1 DETIK untuk biarkan backend clear session dan log terlihat
      setTimeout(() => {
        try {
          log('Executing window.location.replace()...')
          window.location.replace(targetUrl)
        } catch (err) {
          log('Replace failed', err.message)
          window.location.href = targetUrl
        }
      }, 1000) // 1 detik delay untuk biarkan backend clear session
      
      log('========== END LOGOUT ==========')
    }
    
    // Panggil clear session (async) - ini akan memanggil redirectToWelcome setelah selesai
    clearSessionAndRedirect()
  }

  return (
    <motion.div
      className="w-64 bg-indigo-900 text-white flex flex-col"
      initial={{ x: -100 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 100 }}
    >
      <div className="p-6 border-b border-indigo-800">
        <h1 className="text-2xl font-bold">EcoSmart.AI</h1>
        <p className="text-indigo-300 text-sm mt-1">Admin Dashboard</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-indigo-800 text-white'
                  : 'text-indigo-200 hover:bg-indigo-800/50'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-indigo-800">
        <div className="mb-3 px-4 text-sm text-indigo-300">
          <p className="font-medium text-white">{session?.user?.name || 'Admin'}</p>
          <p className="text-xs">{session?.user?.role || 'admin'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-indigo-200 hover:bg-indigo-800/50 transition-colors"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </motion.div>
  )
}

export default AdminSidebar

