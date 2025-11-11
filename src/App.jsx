import { useState, useEffect } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MyPlansPage from './pages/MyPlansPage'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'
import supabase from './supabaseClient'
import { generateTravelPlan } from './services/llmService'
import { travelPlanService } from './services/travelPlanService'
import { processSpeechInput } from './services/speechRecognitionService'
import './App.css'

// 主页组件
const HomePage = () => {
  const [tripDetails, setTripDetails] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [dbInitialized, setDbInitialized] = useState(false)
  const [dbError, setDbError] = useState(null)
  // 语音输入相关状态
  const [isRecording, setIsRecording] = useState(false)
  const [recording, setRecording] = useState(null)
  const [speechText, setSpeechText] = useState('')
  const [speechError, setSpeechError] = useState(null)
  
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (window.confirm('确定要退出登录吗？')) {
      await signOut()
      navigate('/login')
    }
  }

  const handleInputChange = (e) => {
    setTripDetails(e.target.value)
  }
  
  // 处理语音输入开始
  const handleStartSpeechInput = async () => {
    try {
      setSpeechError(null)
      setSpeechText('正在录音...')
      setIsRecording(true)
      
      // 启动语音识别
      const speechProcess = await processSpeechInput()
      setRecording(speechProcess)
    } catch (err) {
      console.error('语音输入启动失败:', err)
      setSpeechError('无法启动语音输入，请检查麦克风权限')
      setIsRecording(false)
      setTimeout(() => setSpeechError(null), 3000)
    }
  }
  
  // 处理语音输入结束
  const handleStopSpeechInput = async () => {
    try {
      if (recording) {
        setSpeechText('正在识别...')
        
        // 停止录音并获取识别结果
        const result = await recording.stop()
        
        setSpeechText(result.originalText)
        // 直接将语音识别结果作为输入文本
        setTripDetails(result.originalText)
        
        setIsRecording(false)
        setRecording(null)
        
        // 3秒后清除提示文本
        setTimeout(() => setSpeechText(''), 3000)
      }
    } catch (err) {
      console.error('语音识别失败:', err)
      setSpeechError('语音识别失败，请重试')
      setIsRecording(false)
      setRecording(null)
      setTimeout(() => {
        setSpeechError(null)
        setSpeechText('')
      }, 3000)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 表单验证 - 只检查是否有输入内容
    if (!tripDetails.trim()) {
      setError('请输入您的旅行需求')
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
      
      // 使用大语言模型返回的实际结果，不再进行格式验证
      console.log('使用大语言模型返回的实际旅行计划')
      setGeneratedPlan(plan)
      setSuccess(true)
      
      // 滚动到结果区域
      document.getElementById('trip-plan-section')?.scrollIntoView({ behavior: 'smooth' })
    } catch (err) {
      // 显示详细错误信息
      setError(`生成旅行计划失败: ${err.message || '未知错误'}`)
      console.error('Error:', err)
      // 重置保存状态
      setSaveSuccess(false)
      setSaveError(null)
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
  
  // 保存旅行计划
  const handleSavePlan = async () => {
    if (!user) {
      setSaveError('请先登录后再保存旅行计划')
      setTimeout(() => setSaveError(null), 3000)
      return
    }

    if (dbError) {
      setSaveError(`数据库错误: ${dbError}`)
      setTimeout(() => setSaveError(null), 5000)
      return
    }
    
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    
    try {
      // 记录用户信息以便调试
      console.log('当前用户:', { id: user.id, email: user.email, type: typeof user.id })
      
      // 从duration中提取数字部分（处理"3天"这种格式）
      const durationValue = generatedPlan.duration && typeof generatedPlan.duration === 'string' 
        ? parseInt(generatedPlan.duration.match(/\d+/)?.[0] || '0')
        : Number(generatedPlan.duration) || 0;
        
      // 确保travelers也是整数
      const travelersValue = generatedPlan.travelers && typeof generatedPlan.travelers === 'string'
        ? parseInt(generatedPlan.travelers.match(/\d+/)?.[0] || '0')
        : Number(generatedPlan.travelers) || 0;
        
      // 确保budget是数字
      const budgetValue = generatedPlan.budget && typeof generatedPlan.budget === 'string'
        ? parseFloat(generatedPlan.budget.replace(/[^\d.]/g, ''))
        : Number(generatedPlan.budget) || 0;
      
      // 使用auth.uid()让Supabase自动获取当前认证用户ID，符合RLS策略要求
      // 不手动设置user_id，让Supabase自动填充，这样能更好地符合RLS策略
      const { data, error } = await supabase.from('travel_plans').insert({
        // 移除手动设置的user_id，让Supabase自动填充
        destination: generatedPlan.destination || '未知',
        duration: durationValue,
        travelers: travelersValue,
        budget: budgetValue,
        accommodation: JSON.stringify(generatedPlan.accommodation),
        transportation: JSON.stringify(generatedPlan.transportation),
        daily_plans: JSON.stringify(generatedPlan.dailyPlans),
        tips: JSON.stringify(generatedPlan.tips),
        original_request: JSON.stringify(tripDetails), // 转换为JSON字符串保存
        created_at: new Date().toISOString()
      }).select()
      
      if (error) {
        if (error.code === 'PGRST205') {
          setSaveError('数据库表不存在，请联系管理员创建travel_plans表')
        } else {
          setSaveError(`保存失败: ${error.message}`)
        }
        setTimeout(() => setSaveError(null), 5000)
      } else {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (err) {
      setSaveError(`保存失败: ${err.message || '未知错误'}`)
      setTimeout(() => setSaveError(null), 3000)
    } finally {
      setIsSaving(false)
    }
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
          <Link to="/my-plans">我的计划</Link>
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
                <label htmlFor="tripDetails">旅行需求</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <textarea
                    id="tripDetails"
                    name="tripDetails"
                    value={tripDetails}
                    onChange={handleInputChange}
                    placeholder="例如：我想去日本，5天，预算1万元，喜欢美食和动漫，带孩子"
                    rows="4"
                    style={{ flex: 1, padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
                  />
                  <button
                    type="button"
                    style={{
                      backgroundColor: isRecording ? '#F44336' : '#4CAF50',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      fontSize: '1.5rem',
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      minWidth: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: isRecording ? 'pulse 1s infinite' : 'none'
                    }}
                    onClick={isRecording ? handleStopSpeechInput : handleStartSpeechInput}
                    title={isRecording ? '点击停止录音' : '点击开始语音输入'}
                  >
                    🎤
                  </button>
                </div>
                {speechText && <div style={{ color: '#4CAF50', fontStyle: 'italic', marginTop: '0.5rem', fontSize: '0.9rem' }}>{speechText}</div>}
                {speechError && <div style={{ color: '#F44336', marginTop: '0.5rem', fontSize: '0.9rem' }}>{speechError}</div>}
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>请在文本框中输入您的旅行需求，或点击麦克风图标使用语音输入</div>
              </div>

              {error && <p className="error-message">{error}</p>}
              {isRecording && (
                <div className="recording-indicator">
                  <div className="recording-dot"></div>
                  <span>正在录音，请说出您的旅行需求，包括旅行目的地、日期、预算、同行人数、旅行偏好等</span>
                </div>
              )}
              <button 
                type="submit" 
                className="submit-button" 
                disabled={isLoading || isRecording}
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
                  <p>{typeof generatedPlan.accommodation === 'object' && generatedPlan.accommodation !== null 
                    ? JSON.stringify(generatedPlan.accommodation, null, 2) 
                    : generatedPlan.accommodation || '暂无建议'}</p>
                </div>
                <div className="highlight-card">
                  <h4>交通建议</h4>
                  <p>{typeof generatedPlan.transportation === 'object' && generatedPlan.transportation !== null 
                    ? JSON.stringify(generatedPlan.transportation, null, 2) 
                    : generatedPlan.transportation || '暂无建议'}</p>
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

            <div className="plan-actions">
              <button 
                className="save-plan-btn"
                onClick={handleSavePlan}
                disabled={isSaving}
              >
                {isSaving ? '保存中...' : '保存旅行计划'}
              </button>
              <button 
                className="regenerate-btn"
                onClick={() => setSuccess(false)}
              >
                生成新的旅行计划
              </button>
            </div>
            
            {saveSuccess && (
              <div className="save-success-message">
                ✅ 旅行计划保存成功！可在"我的计划"页面查看
              </div>
            )}
            {saveError && (
              <div className="save-error-message">
                ❌ {saveError}
              </div>
            )}
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
      <Route 
        path="/my-plans" 
        element={
          <ProtectedRoute>
            <MyPlansPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}

export default App