import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserPlus, Save, X } from 'lucide-react'
import { useSessionPolling } from '../hooks/useSessionPolling'
import { createUser } from '../services/api'

const RegisterUser = () => {
  const navigate = useNavigate()
  const { session } = useSessionPolling(false)
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    prodi: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Jika tidak ada session REGISTERING, redirect ke welcome
    if (!session || session.status !== 'REGISTERING') {
      navigate('/welcome', { replace: true })
    }
  }, [session, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim() || !formData.username.trim()) {
      setError('Nama lengkap dan username wajib diisi')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await createUser({
        rfid_uid: session.rfid_uid,
        name: formData.name.trim(),
        username: formData.username.trim(),
        prodi: formData.prodi.trim() || '',
        role: 'user', // Default role
      })

      if (response.status === 'success') {
        // Redirect ke welcome setelah berhasil
        setTimeout(() => {
          navigate('/welcome', { replace: true })
        }, 1500)
      } else {
        setError(response.message || 'Terjadi kesalahan saat mendaftarkan user')
        setIsSubmitting(false)
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.')
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate('/welcome', { replace: true })
  }

  if (!session || session.status !== 'REGISTERING') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="inline-block p-4 bg-indigo-100 rounded-full mb-4"
          >
            <UserPlus className="text-indigo-600" size={32} />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Registrasi User Baru</h1>
          <p className="text-gray-600 text-sm">
            RFID: <span className="font-mono font-semibold">{session.rfid_uid}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nama Lengkap */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Masukkan nama lengkap"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Masukkan username"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Prodi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Program Studi
            </label>
            <input
              type="text"
              value={formData.prodi}
              onChange={(e) => setFormData({ ...formData, prodi: e.target.value })}
              placeholder="Contoh: S1 Sistem Informasi"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Success Message */}
          {isSubmitting && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center"
            >
              Menyimpan data...
            </motion.div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={18} />
              <span>Batal</span>
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan'}</span>
            </button>
          </div>
        </form>

        {/* Info */}
        <p className="text-xs text-gray-500 text-center mt-6">
          Setelah registrasi, Anda dapat menggunakan kartu RFID ini untuk scan sampah
        </p>
      </motion.div>
    </div>
  )
}

export default RegisterUser

