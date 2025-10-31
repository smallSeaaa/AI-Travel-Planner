import { useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'
import supabase from './supabaseClient'
import { generateTravelPlan, getMockTravelPlan } from './services/llmService'
import './App.css'

// 主页组件
const HomePage = () => {
  const [tripDetails, setTripDetails] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
    peopleCount: '1',
    preferences: []
  })
  const [customPreference, setCustomPreference] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState(null)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (window.confirm('确定要退出登录吗？')) {
      await signOut()
      navigate('/login')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setTripDetails(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePreferenceToggle = (preference) => {
    setTripDetails(prev => {
      if (prev.preferences.includes(preference)) {
        return {
          ...prev,
          preferences: prev.preferences.filter(p => p !== preference)
        }
      } else {
        return {
          ...prev,
          preferences: [...prev.preferences, preference]
        }
      }
    })
  }

  const addCustomPreference = () => {
    if (customPreference.trim() && !tripDetails.preferences.includes(customPreference.trim())) {
      setTripDetails(prev => ({
        ...prev,
        preferences: [...prev.preferences, customPreference.trim()]
      }))
      setCustomPreference('')
    }
  }

  const removeCustomPreference = (preference) => {
    setTripDetails(prev => ({
      ...prev,
      preferences: prev.preferences.filter(p => p !== preference)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 表单验证
    if (!tripDetails.destination.trim()) {
      setError('请输入旅行目的地')
      return
    }
    if (!tripDetails.startDate || !tripDetails.endDate) {
      setError('请选择旅行起止日期')
      return
    }
    if (!tripDetails.budget || isNaN(tripDetails.budget) || tripDetails.budget <= 0) {
      setError('请输入有效的预算金额')
      return
    }
    if (!tripDetails.peopleCount || isNaN(tripDetails.peopleCount) || tripDetails.peopleCount <= 0) {
      setError('请输入有效的同行人数')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // 调用大语言模型API生成旅行计划
      console.log('提交的旅行需求:', tripDetails)
      
      // 调用LLM服务生成行程计划
      const plan = await generateTravelPlan(tripDetails)
      
      // 打印原始计划数据，帮助调试
      console.log('大模型原始返回结果:', plan)
      
      // 验证旅行计划格式是否完整
      if (validateTravelPlan(plan)) {
        // 进一步检查内部结构，特别是可能包含复杂对象的字段
        console.log('计划数据结构验证:', {
          destination: typeof plan.destination,
          duration: typeof plan.duration,
          travelers: typeof plan.travelers,
          budget: typeof plan.budget,
          accommodation: typeof plan.accommodation,
          transportation: typeof plan.transportation,
          dailyPlans: Array.isArray(plan.dailyPlans),
          tips: Array.isArray(plan.tips)
        })
        setGeneratedPlan(plan)
        setSuccess(true)
      } else {
        console.warn('收到的旅行计划格式不完整，使用模拟数据')
        setGeneratedPlan(getMockTravelPlan())
        setError('生成的旅行计划格式有误，已显示模拟数据供参考')
        setSuccess(true)
      }
      
      // 滚动到结果区域
      document.getElementById('trip-plan-section')?.scrollIntoView({ behavior: 'smooth' })
    } catch (err) {
      // 显示详细错误信息
      setError(`生成旅行计划失败: ${err.message || '未知错误'}`)
      console.error('Error:', err)
      // 设置模拟计划，确保用户体验
      setGeneratedPlan(getMockTravelPlan())
      setSuccess(true)
    } finally {
      setIsLoading(false)
    }
  }

  // 验证旅行计划格式是否完整
  const validateTravelPlan = (plan) => {
    if (!plan || typeof plan !== 'object') return false;
    
    // 检查必需的顶级字段（兼容两种格式）
    if (plan.overview && plan.itinerary) {
      // 新格式
      return true;
    } else if (plan.destination && plan.dailyPlans) {
      // 旧格式
      return true;
    }
    return false;
  };
  
  // 注意：已使用大语言模型API替代模拟数据生成
  // 相关逻辑已移至 llmService.js 中

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI旅行规划师</h1>
        <nav>
          <Link to="/">首页</Link>
          <a href="#">目的地</a>
          <a href="#">我的计划</a>
          <a href="#">关于我们</a>
          {user && (
            <div className="user-menu">
              <span className="user-email">{user.email}</span>
              <button className="logout-btn" onClick={handleLogout}>退出登录</button>
            </div>
          )}
        </nav>
      </header>
      
      <main className="App-content">
        {!success ? (
          <section className="trip-form-section">
            <h2>输入您的旅行需求</h2>
            <form onSubmit={handleSubmit} className="trip-form">
              <div className="form-group">
                <label htmlFor="destination">旅行目的地</label>
                <input
                  type="text"
                  id="destination"
                  name="destination"
                  value={tripDetails.destination}
                  onChange={handleInputChange}
                  placeholder="例如：日本东京"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startDate">开始日期</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={tripDetails.startDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate">结束日期</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={tripDetails.endDate}
                    onChange={handleInputChange}
                    min={tripDetails.startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="budget">预算（元）</label>
                  <input
                    type="number"
                    id="budget"
                    name="budget"
                    value={tripDetails.budget}
                    onChange={handleInputChange}
                    placeholder="例如：10000"
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="peopleCount">同行人数</label>
                  <input
                    type="number"
                    id="peopleCount"
                    name="peopleCount"
                    value={tripDetails.peopleCount}
                    onChange={handleInputChange}
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>旅行偏好</label>
                <div className="preferences-container">
                  {['美食', '购物', '文化', '自然', '历史', '冒险', '亲子', '艺术', '夜生活'].map(pref => (
                    <label key={pref} className="preference-checkbox">
                      <input
                        type="checkbox"
                        checked={tripDetails.preferences.includes(pref)}
                        onChange={() => handlePreferenceToggle(pref)}
                      />
                      <span>{pref}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>自定义偏好</label>
                <div className="custom-preference-container">
                  <input
                    type="text"
                    value={customPreference}
                    onChange={(e) => setCustomPreference(e.target.value)}
                    placeholder="例如：动漫、带孩子"
                    onKeyPress={(e) => e.key === 'Enter' && addCustomPreference()}
                  />
                  <button 
                    type="button" 
                    className="add-preference-btn"
                    onClick={addCustomPreference}
                    disabled={!customPreference.trim()}
                  >
                    添加
                  </button>
                </div>
                {tripDetails.preferences.filter(p => !['美食', '购物', '文化', '自然', '历史', '冒险', '亲子', '艺术', '夜生活'].includes(p)).map(pref => (
                  <span key={pref} className="custom-preference-tag">
                    {pref}
                    <button 
                      type="button" 
                      className="remove-preference-btn"
                      onClick={() => removeCustomPreference(pref)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {error && <p className="error-message">{error}</p>}
              <button 
                type="submit" 
                className="submit-button" 
                disabled={isLoading}
              >
                {isLoading ? '生成中...' : '生成旅行计划'}
              </button>
            </form>
          </section>
        ) : (
          <section className="trip-plan-section">
            <h2>您的个性化旅行计划</h2>
            <div className="plan-overview">
              <div className="plan-summary">
                <h3>{generatedPlan.destination}</h3>
                <div className="plan-details">
                  <span>行程天数：{generatedPlan.duration}</span>
                  <span>同行人数：{generatedPlan.travelers}人</span>
                  <span>预算：{generatedPlan.budget}</span>
                </div>
              </div>
              
              <div className="plan-highlights">
                <div className="highlight-card">
                  <h4>住宿建议</h4>
                  <p>{generatedPlan.accommodation}</p>
                </div>
                <div className="highlight-card">
                  <h4>交通建议</h4>
                  <p>{generatedPlan.transportation}</p>
                </div>
              </div>
            </div>

            <div className="daily-plans">
              <h3>每日行程安排</h3>
              {(generatedPlan.dailyPlans || []).map((dayPlan) => (
                <div key={dayPlan.day} className="day-plan-card">
                  <div className="day-header">
                    <h4>第{dayPlan.day}天</h4>
                    <span>{dayPlan.date}</span>
                  </div>
                  <div className="activities-list">
                    {(dayPlan.activities || []).map((activity, index) => (
                      <div key={index} className="activity-item">
                        <div className="activity-time">{activity.time}</div>
                        <div className="activity-content">
                          <span className={`activity-type ${activity.type}`}>{activity.type}</span>
                          <p className="activity-description">{activity.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="travel-tips">
              <h3>旅行小贴士</h3>
              <ul>
                {(generatedPlan.tips || []).map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>

            <button 
              className="regenerate-btn"
              onClick={() => setSuccess(false)}
            >
              生成新的旅行计划
            </button>
          </section>
        )}

        {!success && (
          <section className="features-section">
            <h2>我们的特点</h2>
            <div className="features-grid">
              <div className="feature-card">
                <h3>智能行程规划</h3>
                <p>根据您的喜好生成个性化旅行计划</p>
              </div>
              <div className="feature-card">
                <h3>实时预算计算</h3>
                <p>自动估算旅行费用，帮助您控制开支</p>
              </div>
              <div className="feature-card">
                <h3>景点推荐</h3>
                <p>基于您的兴趣推荐当地热门景点</p>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="App-footer">
        <p>© 2024 AI旅行规划师 - 让每一次旅行都充满惊喜</p>
        <div className="footer-links">
          <Link to="#">隐私政策</Link>
          <Link to="#">使用条款</Link>
          <Link to="#">联系我们</Link>
        </div>
      </footer>
    </div>
  )
}

// 应用入口组件
function App() {
  const { loading } = useAuth()

  if (loading) {
    return <LoadingSpinner message="正在加载应用..." />
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}

export default App