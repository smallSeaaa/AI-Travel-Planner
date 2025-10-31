import { createContext, useContext, useState, useEffect } from 'react'
import { auth } from '../supabaseClient'

// 创建认证上下文
const AuthContext = createContext()

// 导出上下文hook
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth必须在AuthProvider内部使用')
  }
  return context
}

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 初始化用户状态
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { success, user: currentUser } = await auth.getCurrentUser()
        if (success) {
          setUser(currentUser)
        }
      } catch (err) {
        console.error('获取用户信息失败:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

    // 监听认证状态变化
    const subscription = auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user)
        setError(null)
      } else {
        setUser(null)
      }
    })

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe()
      }
    }
  }, [])

  // 注册方法
  const signUp = async (email, password, userData) => {
    setLoading(true)
    setError(null)
    try {
      const result = await auth.signUp(email, password, userData)
      if (!result.success) {
        setError(result.error)
      }
      return result
    } finally {
      setLoading(false)
    }
  }

  // 登录方法
  const signIn = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const result = await auth.signIn(email, password)
      if (!result.success) {
        setError(result.error)
      }
      return result
    } finally {
      setLoading(false)
    }
  }

  // 登出方法
  const signOut = async () => {
    setLoading(true)
    const result = await auth.signOut()
    if (result.success) {
      setUser(null)
    }
    setLoading(false)
    return result
  }

  // 清除错误
  const clearError = () => {
    setError(null)
  }

  // 提供的上下文值
  const value = {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    clearError,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext