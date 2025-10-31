import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../styles/AuthPage.css'

const RegisterPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signUp, error, clearError } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    clearError()
    
    // 表单验证
    if (!email || !password || !confirmPassword || !username) {
      alert('请填写所有必填字段')
      setIsSubmitting(false)
      return
    }

    if (password !== confirmPassword) {
      alert('两次输入的密码不一致')
      setIsSubmitting(false)
      return
    }

    if (password.length < 6) {
      alert('密码长度至少为6位')
      setIsSubmitting(false)
      return
    }

    // 调用注册方法
    const userData = { username }
    const result = await signUp(email, password, userData)
    
    setIsSubmitting(false)
    
    if (result.success) {
      alert('注册成功！请检查您的邮箱以验证账号')
      // 注册成功后，导航到登录页
      navigate('/login')
    } else {
      console.error('注册失败:', result.error)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>创建账号</h1>
        <p className="auth-subtitle">加入AI旅行规划师，开启智能旅行体验</p>
        
        {error && (
          <div className="auth-error">
            {error}
            <button className="error-close" onClick={clearError}>×</button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入您的用户名"
              required
              disabled={isSubmitting}
            />
          </div>
          
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
              placeholder="请设置密码（至少6位）"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">确认密码</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入密码"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? '注册中...' : '注册'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>已有账号？ <Link to="/login">立即登录</Link></p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage