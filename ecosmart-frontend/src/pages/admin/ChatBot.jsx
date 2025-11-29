import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import { chatOpenAI } from '../../services/api'

const ChatBot = () => {
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)

  const handleChatSubmit = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || isChatLoading) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsChatLoading(true)

    try {
      const response = await chatOpenAI(userMessage)
      if (response.status === 'success') {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: response.answer },
        ])
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Maaf, terjadi kesalahan.' },
        ])
      }
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Maaf, terjadi kesalahan.' },
      ])
    } finally {
      setIsChatLoading(false)
    }
  }

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-md p-6 h-[calc(100vh-200px)] flex flex-col"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <MessageSquare size={24} />
          EcoSmart Assistant
        </h2>
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {chatMessages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
              <p>Mulai percakapan dengan EcoSmart Assistant</p>
              <p className="text-sm mt-2">
                Coba tanya: "Halo EcoSmart" atau "Analisis Sampah Hari Ini"
              </p>
            </div>
          )}
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-4 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <form onSubmit={handleChatSubmit} className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Tanyakan sesuatu..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isChatLoading}
          />
          <button
            type="submit"
            disabled={isChatLoading || !chatInput.trim()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Kirim
          </button>
        </form>
      </motion.div>
    </div>
  )
}

export default ChatBot

