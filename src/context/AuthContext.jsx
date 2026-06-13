import { createContext, useContext, useState, useCallback } from 'react'
import { auth as authApi } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = useCallback(async (login, password) => {
    setLoading(true)
    setError(null)
    try {
      const res = await authApi.login(login, password)
      setLoading(false)
      if (res.success) {
        setUser(res.user)
        return { success: true }
      } else {
        setError(res.error)
        return { success: false, error: res.error }
      }
    } catch (err) {
      setLoading(false)
      const msg = err?.message || String(err) || 'Erreur IPC inconnue'
      setError('Erreur : ' + msg)
      return { success: false, error: msg }
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setError(null)
  }, [])

  const changePassword = useCallback(async (oldPwd, newPwd) => {
    return authApi.changePassword(user.id, oldPwd, newPwd)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
