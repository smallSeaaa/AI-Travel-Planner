import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import supabase from '../supabaseClient'
import LoadingSpinner from '../components/LoadingSpinner'

const MyPlansPage = () => {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activePlan, setActivePlan] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  // 获取用户保存的旅行计划
  const fetchPlans = async () => {
    if (!user) {
      setError('请先登录')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      // 直接使用Supabase客户端查询数据
      const { data, error } = await supabase
        .from('travel_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        if (error.code === 'PGRST205') {
          setError('数据库表不存在，请先生成并保存一个旅行计划')
        } else {
          setError(`获取旅行计划失败: ${error.message}`)
        }
      } else {
        // 解析JSON字段
        const parsedPlans = data.map(plan => ({
          ...plan,
          accommodation: JSON.parse(plan.accommodation),
          transportation: JSON.parse(plan.transportation),
          daily_plans: JSON.parse(plan.daily_plans),
          tips: JSON.parse(plan.tips),
          original_request: plan.original_request // 不再解析，直接使用保存的字符串
        }))
        setPlans(parsedPlans)
      }
    } catch (err) {
      setError(`获取旅行计划失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 删除旅行计划
  const handleDeletePlan = async (planId) => {
    if (!window.confirm('确定要删除这个旅行计划吗？此操作不可撤销。')) {
      return
    }

    setIsDeleting(true)
    
    try {
      // 直接使用Supabase客户端删除数据
      const { error } = await supabase
        .from('travel_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', user.id)
      
      if (error) {
        if (error.code === 'PGRST205') {
          setError('数据库表不存在')
        } else {
          setError(`删除失败: ${error.message}`)
        }
      } else {
        // 更新计划列表
        setPlans(plans.filter(plan => plan.id !== planId))
        // 如果删除的是当前查看的计划，清除查看状态
        if (activePlan && activePlan.id === planId) {
          setActivePlan(null)
        }
      }
    } catch (err) {
      setError(`删除失败: ${err.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  // 查看计划详情
  const handleViewPlan = (plan) => {
    setActivePlan(plan)
  }

  // 返回计划列表
  const handleBackToList = () => {
    setActivePlan(null)
  }

  // 编辑计划（直接在页面内编辑）
  const handleEditPlan = (plan) => {
    // 准备编辑表单数据
    setEditForm({
      id: plan.id,
      destination: plan.destination,
      duration: plan.duration,
      travelers: plan.travelers,
      budget: plan.budget,
      accommodation: typeof plan.accommodation === 'object' ? JSON.stringify(plan.accommodation) : String(plan.accommodation),
      transportation: typeof plan.transportation === 'object' ? JSON.stringify(plan.transportation) : String(plan.transportation),
      daily_plans: JSON.stringify(plan.daily_plans),
      tips: JSON.stringify(plan.tips)
    })
    setIsEditing(true)
  }

  // 处理表单输入变化
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // 处理文本区域变化
  const handleTextAreaChange = (name, value) => {
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // 保存编辑后的计划
  const handleSaveEdit = async () => {
    setIsUpdating(true)
    setError(null)
  
  
    try {
      // 处理数据类型转换
      const durationValue = Number(editForm.duration) || 0
      const travelersValue = Number(editForm.travelers) || 0
      const budgetValue = Number(editForm.budget) || 0
      
      // 更新计划到数据库
      const { data, error } = await supabase
        .from('travel_plans')
        .update({
          destination: editForm.destination,
          duration: durationValue,
          travelers: travelersValue,
          budget: budgetValue,
          accommodation: typeof editForm.accommodation === 'string' ? editForm.accommodation : JSON.stringify(editForm.accommodation),
          transportation: typeof editForm.transportation === 'string' ? editForm.transportation : JSON.stringify(editForm.transportation),
          daily_plans: editForm.daily_plans,
          tips: editForm.tips,
          updated_at: new Date().toISOString()
        })
        .eq('id', editForm.id)
        .eq('user_id', user.id)
        .select()
      
      if (error) {
        throw new Error(`更新失败: ${error.message}`)
      }
      
      // 更新本地状态
      setPlans(plans.map(plan => 
        plan.id === editForm.id 
          ? {
              ...plan,
              destination: editForm.destination,
              duration: durationValue,
              travelers: travelersValue,
              budget: budgetValue,
              accommodation: typeof editForm.accommodation === 'string' ? editForm.accommodation : JSON.stringify(editForm.accommodation),
              transportation: typeof editForm.transportation === 'string' ? editForm.transportation : JSON.stringify(editForm.transportation),
              daily_plans: JSON.parse(editForm.daily_plans),
              tips: JSON.parse(editForm.tips),
              updated_at: new Date().toISOString()
              // 保留原来的original_request
            }
          : plan
      ))
      
      // 如果正在查看的是当前编辑的计划，也更新activePlan
      if (activePlan && activePlan.id === editForm.id) {
        setActivePlan({
          ...activePlan,
          destination: editForm.destination,
          duration: durationValue,
          travelers: travelersValue,
          budget: budgetValue,
          accommodation: typeof editForm.accommodation === 'string' ? editForm.accommodation : JSON.stringify(editForm.accommodation),
          transportation: typeof editForm.transportation === 'string' ? editForm.transportation : JSON.stringify(editForm.transportation),
          daily_plans: JSON.parse(editForm.daily_plans),
          tips: JSON.parse(editForm.tips),
          updated_at: new Date().toISOString()
          // 保留原来的original_request
        })
      }
      
      setUpdateSuccess(true)
      setIsEditing(false)
      setTimeout(() => setUpdateSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditForm({})
  }

  // 初始加载和用户变化时获取计划
  useEffect(() => {
    fetchPlans()
  }, [user])

  if (loading) {
    return (
      <div className="my-plans-page">
        <div className="page-content">
          <h1>我的旅行计划</h1>
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  // 如果没有登录，显示登录提示
  if (!user) {
    return (
      <div className="my-plans-page">
        <div className="page-content">
          <h1>我的旅行计划</h1>
          <div className="auth-required">
            <p>请先登录后查看您的旅行计划</p>
            <button onClick={() => navigate('/login')}>去登录</button>
          </div>
        </div>
      </div>
    )
  }

  // 显示计划列表或详情
  return (
    <div className="my-plans-page">
      <div className="page-content">
        <h1>我的旅行计划</h1>
        
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}
        
        {activePlan ? (
          // 显示计划详情
          <div className="plan-details-view">
            <button className="back-btn" onClick={handleBackToList}>← 返回列表</button>
            
            {updateSuccess && (
              <div className="update-success-message">
                ✅ 旅行计划更新成功！
              </div>
            )}
            
            {isEditing && activePlan.id === editForm.id ? (
              // 编辑模式 - 显示表单
              <div className="plan-edit-form">
                <h2>编辑旅行计划</h2>
                
                <div className="form-group">
                  <label htmlFor="destination">目的地</label>
                  <input
                    type="text"
                    id="destination"
                    name="destination"
                    value={editForm.destination || ''}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="duration">行程天数</label>
                    <input
                      type="number"
                      id="duration"
                      name="duration"
                      value={editForm.duration || ''}
                      onChange={handleInputChange}
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="travelers">同行人数</label>
                    <input
                      type="number"
                      id="travelers"
                      name="travelers"
                      value={editForm.travelers || ''}
                      onChange={handleInputChange}
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="budget">预算</label>
                    <input
                      type="number"
                      id="budget"
                      name="budget"
                      value={editForm.budget || ''}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="accommodation">住宿建议</label>
                  <textarea
                    id="accommodation"
                    name="accommodation"
                    value={editForm.accommodation || ''}
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="transportation">交通建议</label>
                  <textarea
                    id="transportation"
                    name="transportation"
                    value={editForm.transportation || ''}
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>
                
                <div className="form-group">
                  <label>注意：每日行程安排和旅行小贴士需要在保存后刷新页面查看</label>
                </div>
              </div>
            ) : (
              // 查看模式 - 显示详情
              <>
                <div className="plan-header">
                  <h2>{activePlan.destination}</h2>
                  <div className="plan-meta">
                    <span>创建时间: {new Date(activePlan.created_at).toLocaleString()}</span>
                    {activePlan.updated_at && activePlan.updated_at !== activePlan.created_at && (
                      <span>更新时间: {new Date(activePlan.updated_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                
                <div className="plan-overview">
                  <div className="plan-summary">
                    <div className="plan-details">
                      <span>行程天数：{activePlan.duration}</span>
                      <span>同行人数：{activePlan.travelers}人</span>
                      <span>预算：{activePlan.budget}</span>
                    </div>
                  </div>
                </div>
                
                <div className="plan-highlights">
                  <div className="highlight-card">
                    <h4>住宿建议</h4>
                    <p>{activePlan.accommodation}</p>
                  </div>
                  <div className="highlight-card">
                    <h4>交通建议</h4>
                    <p>{activePlan.transportation}</p>
                  </div>
                </div>

                <div className="daily-plans">
                  <h3>每日行程安排</h3>
                  {(activePlan.daily_plans || []).map((dayPlan) => (
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
                    {(activePlan.tips || []).map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
            
            <div className="plan-actions">
              {isEditing && activePlan.id === editForm.id ? (
                <>
                  <button 
                    className="save-btn" 
                    onClick={handleSaveEdit}
                    disabled={isUpdating}
                  >
                    {isUpdating ? '保存中...' : '保存修改'}
                  </button>
                  <button 
                    className="cancel-btn" 
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <button className="edit-btn" onClick={() => handleEditPlan(activePlan)}>
                    编辑计划
                  </button>
                  <button 
                    className="delete-btn" 
                    onClick={() => handleDeletePlan(activePlan.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? '删除中...' : '删除计划'}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          // 显示计划列表
          <div className="plans-list">
            {plans.length === 0 ? (
              <div className="no-plans">
                <p>您还没有保存任何旅行计划</p>
                <button onClick={() => navigate('/')}>去创建计划</button>
              </div>
            ) : (
              <div className="plans-grid">
                {plans.map((plan) => (
                  <div key={plan.id} className="plan-card">
                    <h3>{plan.destination}</h3>
                    <div className="plan-card-details">
                      <span>{plan.duration}天</span>
                      <span>{plan.travelers}人</span>
                      <span>{plan.budget}</span>
                    </div>
                    <div className="plan-card-date">
                      创建于: {new Date(plan.created_at).toLocaleDateString()}
                    </div>
                    <div className="plan-card-actions">
                      <button 
                        className="view-btn" 
                        onClick={() => handleViewPlan(plan)}
                      >
                        查看详情
                      </button>
                      <button 
                        className="delete-btn small" 
                        onClick={() => handleDeletePlan(plan.id)}
                        disabled={isDeleting}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
};

export default MyPlansPage;