import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Trash2, TrendingUp } from 'lucide-react'
import { getDashboardData, getBinStatus } from '../../services/api'

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null)
  const [binStatus, setBinStatus] = useState(null)

  useEffect(() => {
    loadDashboardData()
    loadBinStatus()

    const interval = setInterval(() => {
      loadDashboardData()
      loadBinStatus()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    const data = await getDashboardData()
    if (data) setDashboardData(data)
  }

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
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Dashboard Overview</h2>
          <p className="text-gray-600">Monitor aktivitas sistem real-time</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            className="bg-white rounded-xl shadow-md p-6"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Sampah</p>
                <p className="text-3xl font-bold text-gray-800">
                  {dashboardData?.stats?.total_logs || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Trash2 className="text-blue-600" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl shadow-md p-6"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Kertas/Tisu</p>
                <p className="text-3xl font-bold text-green-600">
                  {dashboardData?.stats?.kertas || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <BarChart3 className="text-green-600" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl shadow-md p-6"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Anorganik</p>
                <p className="text-3xl font-bold text-orange-600">
                  {dashboardData?.stats?.anorganik || 0}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="text-orange-600" size={24} />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bin Status */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Status Tong Sampah</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Kapasitas</span>
                <span className="text-sm font-medium text-gray-800">
                  {Math.round(binCapacity)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <motion.div
                  className={`h-4 rounded-full ${
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
          </div>
        </div>

        {/* Recent Logs */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Aktivitas Terkini</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 text-sm text-gray-600">Waktu</th>
                  <th className="text-left py-2 px-4 text-sm text-gray-600">User</th>
                  <th className="text-left py-2 px-4 text-sm text-gray-600">Jenis</th>
                  <th className="text-left py-2 px-4 text-sm text-gray-600">Lokasi</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.recent_logs?.slice(0, 10).map((log, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 text-sm text-gray-700">
                      {new Date(log.timestamp).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2 px-4 text-sm text-gray-700">
                      {log.user_name || 'N/A'}
                    </td>
                    <td className="py-2 px-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded ${
                          log.trash_type === 'KERTAS'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {log.trash_type}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-sm text-gray-700">{log.location_ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default AdminDashboard

