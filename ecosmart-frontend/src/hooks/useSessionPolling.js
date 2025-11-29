import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { checkSession } from '../services/api'

export const useSessionPolling = (enabled = true, interval = 1000) => {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const hasRedirected = useRef(false)
  const lastPathRef = useRef(location.pathname)
  const logoutTimestampRef = useRef(null) // Track logout time to prevent immediate re-login

  useEffect(() => {
    if (!enabled) return

    const pollSession = async () => {
      try {
        const data = await checkSession()
        
        // CRITICAL: Skip session update jika baru saja logout (prevent immediate re-login)
        // Check if session timestamp is before logout timestamp
        if (logoutTimestampRef.current && data.active && data.user?.timestamp) {
          const sessionTime = new Date(data.user.timestamp).getTime()
          const logoutTime = logoutTimestampRef.current
          if (sessionTime <= logoutTime) {
            console.log('[SESSION] Skipping old session (before logout)')
            setSession({ active: false }) // Force inactive
            setIsLoading(false)
            return
          }
        }
        
        setSession(data)
        setIsLoading(false)

        // Handle REGISTERING status (Smart Registration)
        if (
          data.active &&
          data.status === 'REGISTERING' &&
          (location.pathname === '/welcome' || location.pathname === '/') &&
          !hasRedirected.current
        ) {
          hasRedirected.current = true
          navigate('/register', { replace: true })
          return
        }

        // Auto redirect based on role - FIX: redirect dari welcome ATAU jika role berbeda
        // BUT: Skip redirect jika baru saja logout (prevent immediate re-login)
        if (data.active && data.role && !hasRedirected.current) {
          // Check if this is a new session (after logout)
          const isNewSession = !logoutTimestampRef.current || 
            (data.user?.timestamp && new Date(data.user.timestamp).getTime() > logoutTimestampRef.current)
          
          // CRITICAL: Skip redirect jika masih dalam waktu 5 detik setelah logout (lebih lama untuk prevent re-login)
          const timeSinceLogout = logoutTimestampRef.current ? Date.now() - logoutTimestampRef.current : Infinity
          if (timeSinceLogout < 5000) {
            console.log('[SESSION] Skipping redirect - baru saja logout (< 5 detik)')
            return
          }
          
          if (isNewSession) {
            const roleRoute = `/${data.role}`
            const currentRole = location.pathname.split('/')[1] // Extract role from path
            
            // Redirect jika:
            // 1. Di welcome page, atau
            // 2. Role berbeda dengan path saat ini (misal: di /user tapi scan admin)
            if (location.pathname === '/welcome' || location.pathname === '/' || currentRole !== data.role) {
              hasRedirected.current = true
              console.log(`[SESSION] Redirecting to ${roleRoute} from ${location.pathname}`)
              navigate(roleRoute, { replace: true })
              return
            }
          } else {
            console.log('[SESSION] Skipping redirect - session is from before logout')
          }
        }

        // If session is inactive and we're on a dashboard, redirect to welcome
        if (!data.active && (
            location.pathname.startsWith('/admin') || 
            location.pathname.startsWith('/petugas') || 
            location.pathname.startsWith('/user') ||
            location.pathname === '/register'
        )) {
          hasRedirected.current = false
          logoutTimestampRef.current = null // Clear logout timestamp when session is inactive
          navigate('/welcome', { replace: true })
        }
      } catch (error) {
        console.error('Session polling error:', error)
        setIsLoading(false)
      }
    }

    pollSession()
    const intervalId = setInterval(pollSession, interval)
    return () => clearInterval(intervalId)
  }, [enabled, interval, navigate, location.pathname])

  // Reset redirect flag when location changes - prevent loop
  useEffect(() => {
    const currentPath = location.pathname
    const lastPath = lastPathRef.current
    
    // Reset flag jika kembali ke welcome atau path berubah
    if ((currentPath === '/welcome' || currentPath === '/') && lastPath !== currentPath) {
      hasRedirected.current = false
      console.log(`[SESSION] Reset redirect flag at ${currentPath}`)
    }
    
    // Reset flag jika role berubah (misal: dari /user ke /admin)
    const currentRole = currentPath.split('/')[1]
    const lastRole = lastPath.split('/')[1]
    if (currentRole !== lastRole && currentRole && lastRole) {
      hasRedirected.current = false
      console.log(`[SESSION] Role changed from ${lastRole} to ${currentRole}, reset flag`)
    }
    
    lastPathRef.current = currentPath
  }, [location.pathname])

  // Export function to set logout timestamp (for logout handlers)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__setLogoutTimestamp = (timestamp) => {
        logoutTimestampRef.current = timestamp
        console.log('[SESSION] Logout timestamp set:', new Date(timestamp).toISOString())
      }
    }
  }, [])

  return { session, isLoading }
}
