import { motion } from 'framer-motion'
import { Leaf, Trash2 } from 'lucide-react'
import { useSessionPolling } from '../hooks/useSessionPolling'

const Welcome = () => {
  // Disable polling redirect di Welcome page - biarkan useSessionPolling handle
  const { session, isLoading } = useSessionPolling(true, 1000)
  
  // Jangan redirect manual di sini, biarkan useSessionPolling handle

  const floatingVariants = {
    animate: {
      y: [0, -20, 0],
      rotate: [0, 5, -5, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center relative overflow-hidden">
      {/* Floating Background Icons */}
      <motion.div
        className="absolute top-20 left-20 text-green-200 opacity-50"
        variants={floatingVariants}
        animate="animate"
      >
        <Leaf size={120} />
      </motion.div>
      <motion.div
        className="absolute bottom-20 right-20 text-green-200 opacity-50"
        variants={floatingVariants}
        animate="animate"
        style={{ transitionDelay: '2s' }}
      >
        <Trash2 size={100} />
      </motion.div>
      <motion.div
        className="absolute top-1/2 left-10 text-green-200 opacity-20"
        variants={floatingVariants}
        animate="animate"
        style={{ transitionDelay: '1s' }}
      >
        <Leaf size={80} />
      </motion.div>

      {/* Main Content */}
      <motion.div
        className="text-center z-10 px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="mb-8"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
        >
          <div className="inline-block p-6 bg-white rounded-full shadow-lg">
            <Leaf className="text-green-500" size={64} />
          </div>
        </motion.div>

        <motion.h1
          className="text-5xl md:text-6xl font-bold text-gray-800 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Selamat Datang di
          <br />
          <span className="text-green-600">EcoSmart.AI</span>
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl text-gray-600 mb-8 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Tempelkan Kartu RFID Anda pada Alat
        </motion.p>

        <motion.div
          className="flex items-center justify-center gap-2 text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <motion.div
            className="w-2 h-2 bg-green-500 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.7, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <span className="text-sm">Menunggu kartu RFID...</span>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Welcome

