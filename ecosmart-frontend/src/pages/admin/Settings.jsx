import { motion } from 'framer-motion'
import { Phone } from 'lucide-react'

const Settings = () => {
  const handleWAClick = () => {
    window.open('https://wa.me/6281332007987', '_blank')
  }

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Pengaturan</h2>
          <p className="text-gray-600">Kelola sistem dan kontak</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Kontak Pengepul</h3>
          <p className="text-gray-600 mb-4">
            Hubungi petugas pengangkut sampah untuk koordinasi pengambilan
          </p>
          <button
            onClick={handleWAClick}
            className="flex items-center gap-3 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Phone size={20} />
            <span>Chat Pengepul (WA: 081332007987)</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default Settings

