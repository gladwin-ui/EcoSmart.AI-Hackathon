import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useSessionPolling } from '../../../hooks/useSessionPolling'
import { logout } from '../../../services/api'

const PetugasNavbar = () => {
  const navigate = useNavigate()
  const { session } = useSessionPolling(false)

  const handleLogout = (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    // Kumpulkan semua log untuk disimpan
    const logs = []
    const log = (message, data = null) => {
      const logEntry = `[LOGOUT PETUGAS] ${message}${data ? ': ' + JSON.stringify(data) : ''}`
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
            rfid_uid: session?.user?.rfid_uid || sessionData?.user?.rfid_uid || 'petugas',
            role: 'petugas' 
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
    <div className="bg-white shadow-md p-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">EcoSmart.AI</h1>
        <p className="text-sm text-gray-600">
          Petugas: {session?.user?.name || 'Petugas'}
        </p>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
      >
        <LogOut size={18} />
        <span>Logout</span>
      </button>
    </div>
  )
}

export default PetugasNavbar

