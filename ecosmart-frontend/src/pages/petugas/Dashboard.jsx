import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, Clock, Trash2, Loader2 } from 'lucide-react'
import { useSessionPolling } from '../../hooks/useSessionPolling'
import { getBinStatus, updateBinStatus, logout } from '../../services/api'

const PetugasDashboard = () => {
  const navigate = useNavigate()
  // FIX: Enable polling untuk deteksi session (sama seperti user)
  const { session } = useSessionPolling(true)
  const [binStatus, setBinStatus] = useState(null)
  const [countdown, setCountdown] = useState(60)
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    // FIX: Cek session dengan struktur yang fleksibel (sama seperti user)
    const isActive = session?.active || !!session?.user
    const userRole = session?.role || session?.user?.role
    
    if (!isActive || userRole !== 'petugas') {
      // Jangan redirect jika masih loading
      if (session === null) return
      navigate('/welcome', { replace: true })
      return
    }

    loadBinStatus()
    const interval = setInterval(loadBinStatus, 3000)

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          handleAutoLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(interval)
      clearInterval(countdownInterval)
    }
  }, [session, navigate])

  const loadBinStatus = async () => {
    const status = await getBinStatus()
    if (status) setBinStatus(status)
  }

  const handleAutoLogout = async () => {
    if (session?.user?.rfid_uid) {
      await logout(session.user.rfid_uid, 'petugas')
    }
    navigate('/welcome', { replace: true })
  }

  const handleResetBin = async () => {
    setIsResetting(true)
    try {
      await updateBinStatus('siap', 30)
      await loadBinStatus()
      setTimeout(() => {
        handleAutoLogout()
      }, 2000)
    } catch (error) {
      console.error('Error resetting bin:', error)
    } finally {
      setIsResetting(false)
    }
  }

  // FIX: Cek session dengan struktur yang fleksibel
  const isActive = session?.active || !!session?.user
  const userRole = session?.role || session?.user?.role
  
  if (!isActive || userRole !== 'petugas') {
    return null
  }

  const binCapacity = binStatus?.distance_cm
    ? Math.max(0, Math.min(100, ((30 - binStatus.distance_cm) / 30) * 100))
    : 0
  const isBinFull = binCapacity > 80
  const statusText = isBinFull ? 'PENUH' : 'AMAN'
  const statusColor = isBinFull ? 'red' : 'green'

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-8">
      {/* Countdown Timer */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-lg p-6 text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Clock className="text-orange-600" size={24} />
          <p className="text-gray-600">Sesi akan berakhir dalam</p>
        </div>
        <motion.div
          className="text-5xl font-bold text-orange-600"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {countdown}s
        </motion.div>
      </motion.div>

      {/* Bin Status Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl p-8 text-center"
      >
        <div className="mb-6">
          {isBinFull ? (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <AlertTriangle className="text-red-600 mx-auto mb-4" size={80} />
            </motion.div>
          ) : (
            <CheckCircle className="text-green-600 mx-auto mb-4" size={80} />
          )}
        </div>

        <motion.h2
          className={`text-6xl md:text-7xl font-bold mb-4 ${
            isBinFull ? 'text-red-600' : 'text-green-600'
          }`}
          animate={isBinFull ? { opacity: [1, 0.5, 1] } : {}}
          transition={isBinFull ? { duration: 1, repeat: Infinity } : {}}
        >
          {statusText}
        </motion.h2>

        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Kapasitas Tong Sampah</span>
            <span className="text-sm font-medium text-gray-800">
              {Math.round(binCapacity)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-6">
            <motion.div
              className={`h-6 rounded-full ${
                isBinFull ? 'bg-red-500' : 'bg-green-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${binCapacity}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {binStatus?.distance_cm && (
          <p className="text-sm text-gray-500">
            Jarak sensor: {binStatus.distance_cm.toFixed(1)} cm
          </p>
        )}
      </motion.div>

      {/* Action Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <button
          onClick={handleResetBin}
          disabled={isResetting}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold text-xl py-6 rounded-2xl shadow-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isResetting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 size={24} />
              </motion.div>
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <Trash2 size={24} />
              <span>SAYA SUDAH BERSIHKAN</span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  )
}

export default PetugasDashboard

