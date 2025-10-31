import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // 当用户未登录且加载完成时，重定向到登录页
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true })
    }
  }, [user, loading, navigate])

  // 加载状态显示
  if (loading) {
    return <LoadingSpinner message="正在验证您的身份..." />
  }

  // 用户已登录，渲染受保护内容
  if (user) {
    return <>{children}</>
  }

  // 其他情况返回null
  return null
}

export default ProtectedRoute