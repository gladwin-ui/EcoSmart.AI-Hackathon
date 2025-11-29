import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getBinStatus } from '../../services/api'

const Monitoring = () => {
  const [binStatus, setBinStatus] = useState(null)

  useEffect(() => {
    loadBinStatus()
    const interval = setInterval(loadBinStatus, 2000) // Update every 2 seconds
    return () => clearInterval(interval)
  }, [])

  const loadBinStatus = async () => {
    const status = await getBinStatus()
    if (status) setBinStatus(status)
  }

  const binCapacity = binStatus?.distance_cm
    ? Math.max(0, Math.min(100, ((30 - binStatus.distance_cm) / 30) * 100))
    : 0
  const isBinFull = binCapacity > 80

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Real-time Monitoring</h2>
          <p className="text-gray-600">Status tong sampah real-time dari sensor Ultrasonic</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Kapasitas Tong Sampah</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Kapasitas</span>
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
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isBinFull ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                  }`}
                />
                <span className="text-sm text-gray-700">
                  {isBinFull ? 'PENUH - Perlu Pengangkutan' : 'AMAN - Masih Tersedia'}
                </span>
              </div>
              {binStatus?.distance_cm && (
                <p className="text-sm text-gray-500">
                  Jarak sensor: {binStatus.distance_cm.toFixed(1)} cm
                </p>
              )}
              {binStatus?.updated_at && (
                <p className="text-xs text-gray-400">
                  Terakhir update: {new Date(binStatus.updated_at).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Monitoring

