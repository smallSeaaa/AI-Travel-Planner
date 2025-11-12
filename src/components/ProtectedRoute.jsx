import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'
import { getUserSystemConfig } from '../services/systemConfigService'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [configChecked, setConfigChecked] = useState(false)

  // 当用户未登录且加载完成时，重定向到登录页
  // 当用户已登录但没有系统配置时，重定向到系统配置页面
  useEffect(() => {
    const checkUserConfig = async () => {
      // 用户未登录时重定向到登录页
      if (!user) {
        navigate('/login', { replace: true })
        return
      }

      // 用户已登录，检查是否有系统配置
      try {
        // 注意：getUserSystemConfig不接受参数，它会自己获取当前用户
        const result = await getUserSystemConfig()
        // 检查配置是否成功获取且数据不为空
        if (result.success && (!result.data || Object.keys(result.data).length === 0) && window.location.pathname !== '/user-profile') {
          // 显示提示信息
          alert('您还未进行系统配置，请先完成配置以获得最佳体验')
          navigate('/user-profile', { replace: true })
        }
      } catch (error) {
        console.error('检查系统配置失败:', error)
        // 即使检查失败，也让用户访问系统，但在控制台记录错误
      } finally {
        setConfigChecked(true)
      }
    }

    // 只有当加载完成后才检查配置
    if (!loading) {
      checkUserConfig()
    }
  }, [user, loading, navigate])

  // 加载状态显示
  if (loading || !configChecked) {
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