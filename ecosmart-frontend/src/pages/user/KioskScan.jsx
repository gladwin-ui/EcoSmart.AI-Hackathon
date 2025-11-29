import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSessionPolling } from '../../hooks/useSessionPolling'
import { logout, getDashboardData, getBinStatus } from '../../services/api'

const KioskScan = () => {
  const navigate = useNavigate()
  const { session, isLoading } = useSessionPolling(true) // FIX: Enable polling untuk deteksi session!
  const videoRef = useRef(null)
  const streamRef = useRef(null) // Fix: gunakan streamRef bukan streamRef.current di cleanup
  const [videoStream, setVideoStream] = useState(null)
  const [lastLog, setLastLog] = useState(null)
  const [hasScanned, setHasScanned] = useState(false)
  const [autoLogoutTimer, setAutoLogoutTimer] = useState(null)
  const [binOverview, setBinOverview] = useState({
    status: 'siap',
    distance_cm: null,
    updated_at: null,
  })

  const isLoggingOut = useRef(false) // Prevent multiple logout calls

  const handleLogout = useCallback(async () => {
    // Prevent multiple logout calls
    if (isLoggingOut.current) {
      console.log('[LOGOUT] Logout sudah dalam proses, mengabaikan...')
      return
    }
    
    isLoggingOut.current = true
    console.log('[LOGOUT] Auto logout, clearing session...')
    
    // Set logout timestamp FIRST to prevent immediate re-login
    const logoutTime = Date.now()
    if (window.__setLogoutTimestamp) {
      window.__setLogoutTimestamp(logoutTime)
    }
    
    // Stop video stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setVideoStream(null)
    
    // CRITICAL: Clear session di backend TERLEBIH DAHULU (await)
    try {
      if (session?.user?.rfid_uid) {
        await logout(session.user.rfid_uid, 'user')
        console.log('[LOGOUT] Session cleared di backend')
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    // FORCE RELOAD langsung - tidak perlu delay, seperti restart npm
    window.location.href = '/welcome'
  }, [session, navigate])

  // Fetch dashboard data and bin status - like program lama
  useEffect(() => {
    if (!session?.active || session?.role !== 'user') return

    const fetchData = async () => {
      try {
        const data = await getDashboardData()
        if (data?.last_scan) {
          const newLog = data.last_scan
          setLastLog(newLog)
          
          // Auto-logout setelah scan berhasil - tunggu program ino selesai semua
          // Hanya trigger untuk trash scan yang valid (KERTAS, ANORGANIK), bukan ROLE_ logs
          const trashType = newLog?.trash_type
          if (trashType && !hasScanned && 
              trashType !== 'ROLE_USER_LOGOUT' && 
              !trashType.startsWith('ROLE_') &&
              (trashType === 'KERTAS' || trashType === 'ANORGANIK' || trashType === 'TISU')) {
            setHasScanned(true)
            // FIX: Delay lebih lama untuk biarkan user lihat saldo bertambah
            // Timing: ino selesai (8s) + lihat saldo (5s) = 13 detik total
            console.log(`[AUTO-LOGOUT] Scan terdeteksi: ${trashType}, akan logout dalam 13 detik (setelah ino selesai + lihat saldo)...`)
            const timer = setTimeout(() => {
              console.log('[AUTO-LOGOUT] Program ino selesai dan user sudah lihat saldo, auto logout...')
              handleLogout()
            }, 13000) // 13 detik: 8s untuk ino selesai + 5s untuk lihat saldo bertambah
            setAutoLogoutTimer(timer)
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      }
    }

    const fetchBinStatus = async () => {
      try {
        const status = await getBinStatus()
        if (status) {
          setBinOverview(status)
        }
      } catch (error) {
        console.error('Error fetching bin status:', error)
      }
    }

    fetchData()
    fetchBinStatus()
    const interval = setInterval(() => {
      fetchData()
      fetchBinStatus()
    }, 2000) // Poll every 2 seconds untuk deteksi scan lebih cepat
    return () => clearInterval(interval)
  }, [session?.active, session?.role, hasScanned, handleLogout])

  // Cleanup auto-logout timer
  useEffect(() => {
    return () => {
      if (autoLogoutTimer) {
        clearTimeout(autoLogoutTimer)
      }
    }
  }, [autoLogoutTimer])

  // Setup video stream when user session is active - SEDERHANA seperti program lama
  useEffect(() => {
    // FIX: Tunggu loading selesai dulu, baru cek session
    if (isLoading) {
      return
    }
    
    // FIX: Cek session.active ATAU session.user (karena struktur bisa berbeda)
    const isActive = session?.active || !!session?.user
    const userRole = session?.role || session?.user?.role
    
    if (isActive && userRole === 'user' && !streamRef.current) {
      console.log('[CAMERA] Meminta akses kamera...')
      // Langsung pakai getUserMedia seperti program lama - browser akan pilih kamera default (OBS Virtual Cam)
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          console.log('[CAMERA] Stream diterima')
          streamRef.current = stream
          setVideoStream(stream)
          console.log('[CAMERA] Stream disimpan ke state')
        })
        .catch((err) => {
          console.error('[CAMERA ERROR] Tidak bisa akses kamera:', err)
        })
    }

    // FIX: Tidak ada cleanup di sini - biarkan useEffect terpisah handle cleanup
  }, [session, isLoading]) // FIX: hapus videoStream dari dependency untuk prevent loop

  // Update video element when stream changes - seperti program lama
  useEffect(() => {
    if (videoRef.current && videoStream) {
      console.log('[CAMERA] Setting srcObject ke video element')
      videoRef.current.srcObject = videoStream
      console.log('[CAMERA] Video element updated')
    }
  }, [videoStream])

  // Fix: cleanup stream jika role bukan user atau session tidak aktif (seperti program lama)
  useEffect(() => {
    const isActive = session?.active || !!session?.user
    const userRole = session?.role || session?.user?.role
    
    if ((!isActive || userRole !== 'user') && streamRef.current) {
      console.log('[CAMERA] Cleanup: stopping stream (role bukan user atau session tidak aktif)')
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setVideoStream(null)
    }
  }, [session])

  // Don't redirect here - let useSessionPolling handle it
  // This prevents redirect loop

  // Langsung tampilkan seperti program lama - tidak perlu loading state
  // useSessionPolling akan handle redirect jika session tidak aktif
  const scanMessage = lastLog?.trash_type ? `Terdeteksi: ${lastLog.trash_type}` : 'Silakan scan sampah sekarang.'
  const saldoMessage = lastLog
    ? `Saldo bertambah: Rp ${(3000).toLocaleString('id-ID')}`
    : 'Saldo akan muncul setelah pilah benar.'
  
  // Fallback jika session belum ready
  const userName = session?.user?.name || session?.name || 'Pahlawan Daur Ulang'
  const userSaldo = session?.user?.saldo || session?.saldo || 0

  return (
    <div className="min-h-screen p-6">
      <motion.div
        className="space-y-6 rounded-3xl border border-slate-100 bg-white p-6 text-slate-900 shadow-2xl max-w-6xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">User Kiosk</p>
            <h2 className="text-2xl font-semibold text-slate-900">
              👋 Halo, {userName}!
            </h2>
          </div>
          <div className="rounded-2xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-600">
            Saldo: Rp {userSaldo.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[3fr_1fr]">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 min-h-[600px]">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover min-h-[600px]"
              style={{ display: videoStream ? 'block' : 'none' }}
            />
            {!videoStream && (
              <div className="flex h-[600px] items-center justify-center text-sm text-white/60 absolute inset-0">
                Kamera sedang menyalakan...
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70 p-5 text-white pointer-events-none">
              <motion.p
                className="text-xs uppercase tracking-[0.4em] text-white/70"
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                EcoSmart sedang membaca sampah Anda
              </motion.p>
              <p className="mt-2 font-semibold text-lg">{scanMessage}</p>
              <p className="text-sm text-white/70">{saldoMessage}</p>
            </div>
          </div>
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-center text-sm font-semibold text-emerald-700">
              Status current: {binOverview.status || 'siap'}
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase text-slate-500">Jarak</p>
              <p className="text-2xl font-bold text-slate-900">
                {binOverview.distance_cm ? `${binOverview.distance_cm} cm` : '—'}
              </p>
              <p className="text-xs text-slate-400">
                {binOverview.updated_at ? new Date(binOverview.updated_at).toLocaleTimeString() : 'Menunggu update'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full rounded-2xl border border-rose-500 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-500/20 transition-colors"
            >
              Logout & kembali ke welcome
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default KioskScan
