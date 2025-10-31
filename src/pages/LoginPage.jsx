import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../styles/AuthPage.css'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signIn, error, clearError } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    clearError()
    
    // 简单的表单验证
    if (!email || !password) {
      alert('请填写所有必填字段')
      setIsSubmitting(false)
      return
    }

    // 调用登录方法
    const result = await signIn(email, password)
    
    setIsSubmitting(false)
    
    if (!result.success) {
      console.error('登录失败:', result.error)
    } else {
      // 登录成功后，显式导航到主页
      navigate('/')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>欢迎回来</h1>
        <p className="auth-subtitle">登录您的AI旅行规划师账号</p>
        
        {error && (
          <div className="auth-error">
            {error}
            <button className="error-close" onClick={clearError}>×</button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">邮箱</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入您的邮箱"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入您的密码"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? '登录中...' : '登录'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>还没有账号？ <Link to="/register">立即注册</Link></p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage