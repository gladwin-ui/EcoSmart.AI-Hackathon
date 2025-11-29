import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const checkSession = async () => {
  try {
    const response = await api.get('/api/check-session')
    return response.data
  } catch (error) {
    console.error('Error checking session:', error)
    return { active: false }
  }
}

export const logout = async (rfid_uid, role) => {
  try {
    const response = await api.post('/api/logout', { rfid_uid, role })
    return response.data
  } catch (error) {
    console.error('Error logging out:', error)
    return { status: 'error' }
  }
}

export const getDashboardData = async () => {
  try {
    const response = await api.get('/api/dashboard-data')
    return response.data
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return null
  }
}

export const getBinStatus = async () => {
  try {
    const response = await api.get('/api/bin-status')
    return response.data
  } catch (error) {
    console.error('Error fetching bin status:', error)
    return null
  }
}

export const updateBinStatus = async (status, distance_cm) => {
  try {
    const response = await api.post('/api/bin-update', { status, distance_cm })
    return response.data
  } catch (error) {
    console.error('Error updating bin status:', error)
    return null
  }
}

export const chatOpenAI = async (question) => {
  try {
    const response = await api.post('/api/chat-openai', { question })
    return response.data
  } catch (error) {
    console.error('Error chatting with OpenAI:', error)
    return { status: 'error', message: error.message }
  }
}

export const getMVPLeaderboard = async () => {
  try {
    const response = await api.get('/api/mvp-leaderboard')
    return response.data
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return null
  }
}

export const createUser = async (userData) => {
  try {
    const response = await api.post('/api/create-user', userData)
    return response.data
  } catch (error) {
    console.error('Error creating user:', error)
    return {
      status: 'error',
      message: error.response?.data?.message || 'Terjadi kesalahan saat membuat user',
    }
  }
}

export const scanTrash = async (imageBlob) => {
  try {
    const formData = new FormData()
    formData.append('image', imageBlob, 'trash.jpg')
    
    const response = await api.post('/api/scan-trash', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error) {
    console.error('Error scanning trash:', error)
    return {
      status: 'error',
      message: error.response?.data?.message || 'Terjadi kesalahan saat scan sampah',
    }
  }
}

export default api

