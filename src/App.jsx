import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MyPlansPage from './pages/MyPlansPage'
import UserProfilePage from './pages/UserProfilePage'
import ExpenseManagementPage from './pages/ExpenseManagementPage'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'
import MapComponent from './components/MapComponent'
import supabase from './supabaseClient'
import { generateTravelPlan } from './services/llmService'
import { travelPlanService } from './services/travelPlanService'
import { processSpeechInput } from './services/speechRecognitionService'
import './App.css'

// 主页组件
const HomePage = ({ onMapUpdate, showSidebar }) => {
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
        // 将语音识别结果添加到现有文本之后
        setTripDetails(prevText => prevText + ' ' + result.originalText)
        
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

  // 更新地图标记点和路线
  const updateMapData = (plan) => {
    if (!plan || !plan.dailyPlans) return;
    
    const markers = [];
    const routes = [];
    
    // 提取每日行程中的位置信息
    plan.dailyPlans.forEach((dayPlan, dayIndex) => {
      if (dayPlan.activities) {
        const dayMarkers = [];
        dayPlan.activities.forEach((activity, index) => {
          // 只有当活动有实际坐标信息时才添加到地图标记
          if (activity.lat && activity.lng) {
            dayMarkers.push({
              key: `${dayIndex}-${index}`,
              position: { lat: activity.lat, lng: activity.lng },
              title: activity.description,
              type: activity.type,
              day: dayPlan.day,
              time: activity.time
            });
          }
        });
        
        markers.push(...dayMarkers);
        
        // 如果有多个地点，创建路线
        if (dayMarkers.length > 1) {
          routes.push({
            key: `route-day-${dayIndex}`,
            points: dayMarkers.map(marker => marker.position),
            day: dayPlan.day
          });
        }
      }
    });
    
    // 调用父组件传递的回调函数更新地图数据
    if (onMapUpdate) {
      onMapUpdate(markers, routes);
    }
  };

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
      
      // 调用LLM服务生成行程计划，传递用户ID以获取用户偏好
      const plan = await generateTravelPlan(tripDetails, user?.id || null)
      
      // 打印原始计划数据，帮助调试
      console.log('大模型原始返回结果:', plan)
      
      // 使用大语言模型返回的实际结果，不再进行格式验证
      console.log('使用大语言模型返回的实际旅行计划')
      setGeneratedPlan(plan)
      setSuccess(true)
      
      // 更新地图数据
      updateMapData(plan)
      
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
  
  // 检查计划名称是否重复并生成唯一名称
  const generateUniquePlanName = async (baseName) => {
    try {
      // 查询当前用户的所有计划名称
      const { data, error } = await supabase
        .from('travel_plans')
        .select('plan_name')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('查询计划名称失败:', error);
        return baseName; // 出错时返回原始名称
      }
      
      const existingNames = data.map(plan => plan.plan_name).filter(Boolean);
      
      // 检查基础名称是否已存在
      if (!existingNames.includes(baseName)) {
        return baseName;
      }
      
      // 查找已有的编号并确定下一个编号
      let maxNumber = 0;
      const namePattern = new RegExp(`^${baseName}\((\d+)\)$`);
      
      existingNames.forEach(name => {
        const match = name.match(namePattern);
        if (match) {
          const number = parseInt(match[1], 10);
          maxNumber = Math.max(maxNumber, number);
        }
      });
      
      // 返回带编号的名称
      return `${baseName}(${maxNumber + 1})`;
    } catch (error) {
      console.error('生成唯一计划名称失败:', error);
      return baseName;
    }
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
      
      // 生成基础计划名称
      const basePlanName = `${generatedPlan.destination || '未知'}旅行-${new Date().toLocaleDateString('zh-CN')}`;
      
      // 生成唯一的计划名称
      const uniquePlanName = await generateUniquePlanName(basePlanName);
      
      // 使用auth.uid()让Supabase自动获取当前认证用户ID，符合RLS策略要求
      // 不手动设置user_id，让Supabase自动填充，这样能更好地符合RLS策略
      const { data, error } = await supabase.from('travel_plans').insert({
        // 移除手动设置的user_id，让Supabase自动填充
        plan_name: uniquePlanName,
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

  return (
    <div className="sidebar-content">
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
                  placeholder="例如：我想去北京，5天，预算1万元，喜欢美食，带孩子"
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
                <span>正在录音，请说出您的旅行需求，包括旅行目的地、日期、预算、人数、旅行偏好等</span>
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
        <section className="trip-plan-section" id="trip-plan-section">
          <h2>您的个性化旅行计划</h2>
          <div className="plan-overview">
            <div className="plan-summary">
              <h3>{generatedPlan?.destination || '未知目的地'}</h3>
              <div className="plan-details">
                <span>行程天数：{generatedPlan?.duration || '0'}</span>
                <span>人数：{generatedPlan?.travelers || '1'}人</span>
                <span>预算：{generatedPlan?.budget || '0'}</span>
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
                </div>
                <div className="activities-list">
                  {(dayPlan.activities || []).map((activity, index) => (
                    <div key={index} className="activity-item">
                      <div className="activity-time">{activity.time}</div>
                      <div className="activity-content">
                        <span className={`activity-type ${activity.type}`}>{activity.type}</span>
                        <p className="activity-description">{activity.description}</p>
                        {activity.budget && <span className="activity-budget">💰 {activity.budget}</span>}
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
    </div>
  )
}

// 应用入口组件 - 重构为保持地图不变的结构
// 创建一个登录后的布局组件，包含地图和侧边栏
const LoggedInLayout = ({ children }) => {
  const [showSidebar, setShowSidebar] = useState(true);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [mapRoutes, setMapRoutes] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // 为地图添加样式 - 缩小宽度为四分之一，侧边栏收起时全屏显示
  const mapContainerStyle = {
    position: 'fixed',
    top: 60, // 导航栏高度
    right: 0,
    bottom: 0,
    width: showSidebar ? '25%' : '100%', // 侧边栏展开时宽度为25%，收起时全屏显示
    zIndex: 1,
    transition: 'width 0.3s ease'
  };

  const sidebarContainerStyle = {
    position: 'fixed',
    top: 60,
    left: 0,
    bottom: 0,
    width: '75%', // 侧边栏展开时占75%
    zIndex: 2,
    overflowY: 'auto'
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* 地图容器 - 固定位置，只在登录后显示 */}
      <div style={mapContainerStyle} className="map-main">
        <MapComponent 
          markers={mapMarkers}
          routes={mapRoutes}
          onPointClick={setSelectedLocation}
          center={{ lat: 39.9042, lng: 116.4074 }} // 默认北京坐标
          zoom={12}
        />
        
        {/* 改进的侧边栏控制按钮 - 始终可见，美观且功能完整 */}
        <button 
          className="sidebar-toggle"
          onClick={() => setShowSidebar(!showSidebar)}
          title={showSidebar ? '收起侧边栏' : '展开侧边栏'}
          style={{
            position: 'fixed',
            left: showSidebar ? 'calc(75%)' : '10px', // 固定在侧边栏分界线右侧
            top: '100px',
            width: '40px',
            height: '40px',
            borderRadius: '5px',
            backgroundColor: 'white',
            color: '#333',
            border: '1px solid #ddd',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999, // 确保在最顶层
            padding: '8px',
            transition: 'left 0.3s ease, background-color 0.2s ease, transform 0.2s ease'
          }}
          onMouseEnter={(e) => {e.target.style.backgroundColor = '#f0f7ff'; e.target.style.transform = 'scale(1.05)'}}
          onMouseLeave={(e) => {e.target.style.backgroundColor = '#fff'; e.target.style.transform = 'scale(1)'}}
          onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
        >
          {showSidebar ? '◀' : '▶'}
        </button>
        
        {/* 选中位置信息窗口 */}
        {selectedLocation && (
          <div className="location-info-window">
            <h4>{selectedLocation.title}</h4>
            <p>第{selectedLocation.day}天 {selectedLocation.time}</p>
            <p>类型: {selectedLocation.type}</p>
            <button onClick={() => setSelectedLocation(null)}>关闭</button>
          </div>
        )}
      </div>

      {/* 侧边栏容器 - 用于显示页面内容 */}
      <div style={{
        ...sidebarContainerStyle,
        transform: showSidebar ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease'
      }}>
        {React.cloneElement(children, {
          onMapUpdate: (markers, routes) => {
            console.log('onMapUpdate called in LoggedInLayout with markers:', markers);
            setMapMarkers(markers);
            setMapRoutes(routes);
          },
          showSidebar: showSidebar
        })}
      </div>
    </div>
  );
};

function App() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();

  // 处理登出
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner message="正在加载应用..." />;
  }

  return (
    <div className="App">
      {/* 根据用户登录状态显示不同的头部 */}
      {!user && (window.location.pathname === '/login' || window.location.pathname === '/register') ? (
        // 登录注册页面 - 只显示标题
        <header className="App-header login-header">
          <h1>AI旅行规划师</h1>
        </header>
      ) : (
        // 登录后页面 - 显示完整导航栏
        <header className="App-header">
          <h1>AI旅行规划师</h1>
          <nav>
            <Link to="/">首页</Link>
            <Link to="/my-plans">我的计划</Link>
            <Link to="/expense-management">费用记录</Link>
            {user && (
              <div className="user-menu">
                <Link to="/user-profile" className="user-profile-link">
                  用户信息管理
                </Link>
              </div>
            )}
          </nav>
        </header>
      )}

      <Routes>
        {/* 登录注册页面 - 不显示地图 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* 登录后的页面 - 显示地图和侧边栏 */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <LoggedInLayout>
                <HomePage />
              </LoggedInLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/my-plans" 
          element={
            <ProtectedRoute>
              <LoggedInLayout>
                <MyPlansPage />
              </LoggedInLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/expense-management" 
          element={
            <ProtectedRoute>
              <LoggedInLayout>
                <ExpenseManagementPage />
              </LoggedInLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/user-profile" 
          element={
            <ProtectedRoute>
              {/* 用户信息管理页面不显示地图 */}
              <div className="no-map-container">
                <UserProfilePage />
              </div>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </div>
  )
}

export default App