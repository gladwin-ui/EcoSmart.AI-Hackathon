import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getMVPLeaderboard } from '../../services/api'

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState(null)

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    const data = await getMVPLeaderboard()
    if (data) setLeaderboard(data)
  }

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">MVP Leaderboard</h2>
          <p className="text-gray-600">Top performers per program studi</p>
        </div>

        {leaderboard?.leaderboard?.map((prodi, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {prodi.prodi || 'Tidak Diketahui'}
              </h3>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Saldo</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {prodi.total_saldo?.toLocaleString('id-ID') || 0}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {leaderboard?.users_by_prodi?.[prodi.prodi]
                ?.slice(0, 5)
                .map((user, uIdx) => (
                  <div
                    key={uIdx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                          uIdx === 0
                            ? 'bg-yellow-500'
                            : uIdx === 1
                            ? 'bg-gray-400'
                            : uIdx === 2
                            ? 'bg-orange-600'
                            : 'bg-gray-300'
                        }`}
                      >
                        {uIdx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.rfid_uid}</p>
                      </div>
                    </div>
                    <p className="font-bold text-indigo-600">
                      {user.saldo?.toLocaleString('id-ID') || 0} pts
                    </p>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

export default Leaderboard

