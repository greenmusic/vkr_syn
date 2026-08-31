import axios from 'axios'
import { clearSession } from '../auth/session.js'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 30000,
  withCredentials: true,
})

let router = null

export const attachRouter = (appRouter) => {
  router = appRouter
}

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = String(error.config?.url || '')
    const isAuthEndpoint =
      url.includes('/login') ||
      url.includes('/register') ||
      url.includes('/me') ||
      url.includes('/bitrix24')

    if (status === 401 && !isAuthEndpoint) {
      clearSession()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  },
)

export default instance
