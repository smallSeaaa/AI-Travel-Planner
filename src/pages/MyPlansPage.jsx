import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import supabase from '../supabaseClient'
import LoadingSpinner from '../components/LoadingSpinner'
import SimpleMapComponent from '../components/MapComponent'
import travelPlanService from '../services/travelPlanService'

// 安全的JSON解析函数
const safeParse = (data) => {
  if (!data || typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    // 如果解析失败，返回原始字符串
    return data;
  }
};

const MyPlansPage = ({ onMapUpdate, showSidebar }) => {
  // 用于百度地图搜索的容器引用
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activePlan, setActivePlan] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searchingActivity, setSearchingActivity] = useState(null)
  const [isRouteSelectionMode, setIsRouteSelectionMode] = useState(false)
  const [selectedActivities, setSelectedActivities] = useState([])
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
          const parsedPlans = data.map(plan => ({
          ...plan,
          accommodation: safeParse(plan.accommodation),
          transportation: safeParse(plan.transportation),
          daily_plans: safeParse(plan.daily_plans),
          tips: safeParse(plan.tips),
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
    // 解析嵌套的JSON字符串
    const parsedPlan = {
      ...plan,
      accommodation: safeParse(plan.accommodation),
      transportation: safeParse(plan.transportation),
      daily_plans: safeParse(plan.daily_plans),
      tips: safeParse(plan.tips),
      original_request: plan.original_request // 不再解析，直接使用保存的字符串
    }
    
    setActivePlan(parsedPlan)
    // 重置编辑状态
    setIsEditing(false)
    // 重置选择状态
    setIsRouteSelectionMode(false)
    setSelectedActivities([])
    
    // 更新地图数据
    if (onMapUpdate && parsedPlan.daily_plans) {
      const markers = [];
      const routes = [];
      
      // 提取每日行程中的位置信息
      parsedPlan.daily_plans.forEach((dayPlan, dayIndex) => {
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
      
      onMapUpdate(markers, routes);
    }
  }
  
  // 处理活动选择
  const handleActivitySelection = (day, index, activity) => {
    // 检查是否已经选中
    const isAlreadySelected = selectedActivities.some(
      item => item.dayIndex === day && item.activityIndex === index
    );
    
    if (isAlreadySelected) {
      // 如果已选中，则取消选择
      setSelectedActivities(prev => 
        prev.filter(item => !(item.dayIndex === day && item.activityIndex === index))
      );
    } else {
      // 如果未选中且有坐标，且未达到最大选择数量，则添加选择
      if (selectedActivities.length < 2) {
        setSelectedActivities(prev => [...prev, { dayIndex: day, activityIndex: index, activity }]);
      }
    }
  }

  // 返回计划列表
  const handleBackToList = () => {
    setActivePlan(null)
  }

  // 编辑计划（直接在页面内编辑）
  const handleEditPlan = (plan) => {
    // 准备编辑表单数据
    // 确保daily_plans是数组格式
    const dailyPlans = Array.isArray(plan.daily_plans) ? plan.daily_plans : [];
    // 确保tips是数组格式
    const tips = Array.isArray(plan.tips) ? plan.tips : [];
    
    setEditForm({
      id: plan.id,
      plan_name: plan.plan_name || '',
      destination: plan.destination,
      duration: plan.duration,
      travelers: plan.travelers,
      budget: plan.budget,
      accommodation: typeof plan.accommodation === 'object' ? JSON.stringify(plan.accommodation) : String(plan.accommodation),
      transportation: typeof plan.transportation === 'object' ? JSON.stringify(plan.transportation) : String(plan.transportation),
      daily_plans: dailyPlans,
      tips: tips
    })
    setIsEditing(true)
    // 让侧面栏滚动到顶部
    setTimeout(() => {
      // 尝试直接滚动到编辑表单的标题元素
      const editTitleElement = document.querySelector('.plan-edit-form h2');
      if (editTitleElement) {
        console.log('找到编辑标题元素:', editTitleElement);
        editTitleElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // 如果找不到标题，尝试滚动到编辑表单容器
        const editFormElement = document.querySelector('.plan-edit-form');
        if (editFormElement) {
          console.log('找到编辑表单容器:', editFormElement);
          editFormElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          console.log('未找到滚动目标元素');
        }
      }
    }, 200) // 增加超时时间以确保编辑表单已完全渲染
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
  
  // 添加新的一天行程
  const addDayPlan = () => {
    const newDay = (editForm.daily_plans?.length || 0) + 1;
    setEditForm(prev => ({
      ...prev,
      daily_plans: [...(prev.daily_plans || []), {
        day: newDay,
        date: '', // 保留字段但不显示具体日期
        activities: [{ time: '09:00', type: '景点', description: '', budget: '' }]
      }]
    }))
  }
  
  // 更新某天行程
  const updateDayPlan = (dayIndex, field, value) => {
    setEditForm(prev => {
      const updatedPlans = [...(prev.daily_plans || [])];
      updatedPlans[dayIndex] = {
        ...updatedPlans[dayIndex],
        [field]: value
      };
      return { ...prev, daily_plans: updatedPlans };
    })
  }
  
  // 添加活动到某天
  const addActivity = (dayIndex) => {
    // 立即返回，避免可能的重复调用
    setEditForm(prev => {
      // 创建新的更新计划数组
      const updatedPlans = JSON.parse(JSON.stringify(prev.daily_plans || []));
      
      // 确保当天的活动数组存在
      if (!updatedPlans[dayIndex]) {
        updatedPlans[dayIndex] = { activities: [] };
      }
      if (!updatedPlans[dayIndex].activities) {
        updatedPlans[dayIndex].activities = [];
      }
      
      // 添加单个新活动到数组开头，包含坐标相关字段
      const newActivity = { 
        time: '10:00', 
        type: '景点', 
        description: '',
        coordinates: null,
        address: '',
        locationSearch: '',
        budget: ''
      };
      updatedPlans[dayIndex].activities.unshift(newActivity);
      
      return { ...prev, daily_plans: updatedPlans };
    });
  };
  
  // 处理地点搜索
  const handlePlanRoute = () => {
    if (selectedActivities.length === 2) {
      // 按活动时间排序，确定真正的起点和终点
      const sortedActivities = [...selectedActivities].sort((a, b) => {
        // 获取活动时间，默认为空字符串
        const timeA = a.activity.time || '';
        const timeB = b.activity.time || '';
        // 按时间字符串进行排序
        return timeA.localeCompare(timeB);
      });
      
      const [startActivity, endActivity] = sortedActivities;
      
      // 构建路线信息，适配活动数据结构
      const routeInfo = {
        start: {
          name: startActivity.activity.description || '起点',
          lat: startActivity.activity.lat || startActivity.activity.coordinates?.lat,
          lng: startActivity.activity.lng || startActivity.activity.coordinates?.lng
        },
        end: {
          name: endActivity.activity.description || '终点',
          lat: endActivity.activity.lat || endActivity.activity.coordinates?.lat,
          lng: endActivity.activity.lng || endActivity.activity.coordinates?.lng
        }
      };
      
      // 调用父组件传入的地图更新函数
      if (onMapUpdate) {
        // 使用路线数组格式传递，以便支持多条路线
        onMapUpdate([], [routeInfo]);
      }
      
      // 可以在这里添加额外的路线规划逻辑
      console.log('规划路线:', routeInfo);
    }
  };

  const handleLocationSearch = async (dayIndex, activityIndex) => {
    const activity = editForm.daily_plans[dayIndex].activities[activityIndex];
    if (!activity.locationSearch) {
      alert('请输入地点名称');
      return;
    }
    
    // 记录当前正在搜索的活动信息
    setSearchingActivity({ dayIndex, activityIndex });
    
    try {
      const searchText = activity.locationSearch;
      
      if (!window.BMapGL) {
        alert('百度地图服务正在加载中，请稍后再试...');
        setShowSearchResults(false);
        return;
      }
      
      // 创建临时地图实例用于搜索
      const tempMapDiv = document.createElement('div');
      tempMapDiv.style.width = '0';
      tempMapDiv.style.height = '0';
      document.body.appendChild(tempMapDiv);
      
      const tempMap = new window.BMapGL.Map(tempMapDiv);
      tempMap.centerAndZoom(new window.BMapGL.Point(116.404, 39.915), 12);
      
      const local = new window.BMapGL.LocalSearch(tempMap, {
        pageCapacity: 10, // 每页显示10个结果
        onSearchComplete: (results) => {
          // 清理临时地图
          document.body.removeChild(tempMapDiv);
          
          if (results && results.getNumPois() > 0) {
            // 提取搜索结果
            const resultsArray = [];
            for (let i = 0; i < results.getNumPois(); i++) {
              const poi = results.getPoi(i);
              // 添加空值检查，确保poi存在再访问其属性
              if (poi) {
                resultsArray.push({
                  id: i,
                  title: poi.title || '未命名地点',
                  address: poi.address || '未提供地址',
                  point: poi.point
                });
              }
            }
            
            // 显示搜索结果列表
            setSearchResults(resultsArray);
            setShowSearchResults(true);
            
            console.log('搜索结果:', resultsArray);
          } else {
            alert('未找到匹配的地点，请尝试其他关键词');
            setShowSearchResults(false);
          }
        },
        onError: (error) => {
          document.body.removeChild(tempMapDiv);
          console.error('搜索错误:', error);
          alert('搜索过程中出现错误，请重试');
          setShowSearchResults(false);
        }
      });
      
      console.log('开始搜索地点:', searchText);
      local.search(searchText);
    } catch (error) {
      console.error('地点搜索失败:', error);
      alert('搜索失败: ' + error.message);
      setShowSearchResults(false);
    }
  };
  
  // 处理选择搜索结果
  const handleSelectSearchResult = (result) => {
    console.log('handleSelectSearchResult called with result:', result);
    if (!searchingActivity || !result || !result.point) return;
    
    const { dayIndex, activityIndex } = searchingActivity;
    
    // 更新活动坐标信息
    updateActivity(dayIndex, activityIndex, 'coordinates', {
      lng: result.point.lng,
      lat: result.point.lat
    });
    updateActivity(dayIndex, activityIndex, 'address', result.address || '');
    // 将选择的地点名称更新到搜索框中
    updateActivity(dayIndex, activityIndex, 'locationSearch', result.title || '未命名地点');
    
    // 更新地图显示 - 使用正确的参数格式
    if (onMapUpdate) {
      // 添加空值检查确保editForm和相关属性存在
      const dayPlan = editForm?.daily_plans?.[dayIndex];
      const activity = dayPlan?.activities?.[activityIndex];
      
      const marker = {
        key: `${dayIndex}-${activityIndex}`,
        position: { lng: result.point.lng, lat: result.point.lat },
        title: result.title || '未命名地点',
        description: activity?.description || '',
        type: activity?.type || 'activity',
        day: dayPlan?.day || dayIndex + 1,
        time: activity?.time || '',
        address: result.address || ''
      };
      console.log('Calling onMapUpdate with marker:', marker);
      onMapUpdate([marker], []);
      console.log('onMapUpdate called successfully');
    }
    
    // 隐藏搜索结果列表
    setShowSearchResults(false);
    setSearchResults([]);
    setSearchingActivity(null);
    
    console.log('已选择地点:', result.title);
  };
  
  // 关闭搜索结果
  const closeSearchResults = () => {
    setShowSearchResults(false);
    setSearchResults([]);
    setSearchingActivity(null);
  };
  
  // 地图容器引用
  const mapContainerRef = useRef(null);
  
  // 在地图上定位活动
  const handleLocateActivity = (activity) => {
    if (!activity.coordinates) return;
    
    // 调用父组件传递的地图更新函数 - 使用正确的参数格式
    if (onMapUpdate) {
      const marker = {
        key: `locate-${Date.now()}`, // 使用时间戳生成临时key
        position: { lng: activity.coordinates.lng, lat: activity.coordinates.lat },
        title: activity.description,
        type: activity.type,
        address: activity.address,
        time: activity.time
      };
      onMapUpdate([marker], []);
      
      // 移除alert提示，直接定位到地图上即可
    }
  };
  
  // 更新活动
  const updateActivity = (dayIndex, activityIndex, field, value) => {
    setEditForm(prev => {
      const updatedPlans = [...(prev.daily_plans || [])];
      updatedPlans[dayIndex].activities[activityIndex] = {
        ...updatedPlans[dayIndex].activities[activityIndex],
        [field]: value
      };
      return { ...prev, daily_plans: updatedPlans };
    })
  }
  
  // 删除活动
  const removeActivity = (dayIndex, activityIndex) => {
    setEditForm(prev => {
      const updatedPlans = [...(prev.daily_plans || [])];
      updatedPlans[dayIndex].activities = 
        updatedPlans[dayIndex].activities.filter((_, index) => index !== activityIndex);
      return { ...prev, daily_plans: updatedPlans };
    })
  }
  
  // 删除某天行程
  const removeDayPlan = (dayIndex) => {
    setEditForm(prev => {
      const updatedPlans = [...(prev.daily_plans || [])].filter((_, index) => index !== dayIndex);
      // 重新编号剩余的天数
      updatedPlans.forEach((plan, index) => {
        plan.day = index + 1;
      });
      return { ...prev, daily_plans: updatedPlans };
    })
  }
  
  // 添加小贴士
  const addTip = () => {
    setEditForm(prev => ({
      ...prev,
      tips: [...(prev.tips || []), '']
    }))
  }
  
  // 更新小贴士
  const updateTip = (index, value) => {
    setEditForm(prev => {
      const updatedTips = [...(prev.tips || [])];
      updatedTips[index] = value;
      return { ...prev, tips: updatedTips };
    })
  }
  
  // 删除小贴士
  const removeTip = (index) => {
    setEditForm(prev => ({
      ...prev,
      tips: (prev.tips || []).filter((_, i) => i !== index)
    }))
  }

  // 保存编辑后的计划
  const handleSaveEdit = async () => {
    setIsUpdating(true)
    setError(null)
  
    try {
      // 处理数据类型转换
      // 保留原始值的逻辑：只有当editForm中的字段有实际内容时才使用转换后的值
      // 否则使用activePlan中的原始值（如果存在）
      const durationValue = editForm.duration !== undefined && editForm.duration !== null && editForm.duration !== '' ? 
        (Number(editForm.duration) || 0) : (activePlan?.duration || 0);
      const travelersValue = editForm.travelers !== undefined && editForm.travelers !== null && editForm.travelers !== '' ? 
        (Number(editForm.travelers) || 0) : (activePlan?.travelers || 0);
      const budgetValue = editForm.budget !== undefined && editForm.budget !== null && editForm.budget !== '' ? 
        (Number(editForm.budget) || 0) : (activePlan?.budget || 0);
      
      // 对每天的活动按时间排序
      const sortedDailyPlans = editForm.daily_plans.map(dayPlan => ({
        ...dayPlan,
        activities: dayPlan.activities ? [...dayPlan.activities].sort((a, b) => {
          // 比较时间字符串
          return (a.time || '').localeCompare(b.time || '');
        }) : []
      }));

      // 构建更新的计划对象
      const updatedPlan = {
        plan_name: editForm.plan_name,
        destination: editForm.destination,
        duration: durationValue,
        travelers: travelersValue,
        budget: budgetValue,
        accommodation: editForm.accommodation,
        transportation: editForm.transportation,
        dailyPlans: sortedDailyPlans,
        tips: editForm.tips,
        original_request: activePlan?.original_request
      };

      // 使用travelPlanService更新计划，自动处理名称唯一性
      const result = await travelPlanService.updateTravelPlan(editForm.id, user.id, updatedPlan);
      
      if (!result.success) {
        throw new Error(`更新失败: ${result.error}`);
      }
      
      const updatedPlanData = result.data;
      
      // 更新本地状态
      setPlans(plans.map(plan => 
        plan.id === editForm.id 
          ? {
              ...plan,
              plan_name: updatedPlanData.plan_name, // 使用处理后的唯一名称
              destination: updatedPlanData.destination,
              duration: updatedPlanData.duration,
              travelers: updatedPlanData.travelers,
              budget: updatedPlanData.budget,
              accommodation: safeParse(updatedPlanData.accommodation),
              transportation: safeParse(updatedPlanData.transportation),
              daily_plans: safeParse(updatedPlanData.daily_plans),
              tips: safeParse(updatedPlanData.tips),
              updated_at: updatedPlanData.updated_at
            }
          : plan
      ))
      
      // 如果正在查看的是当前编辑的计划，也更新activePlan
      if (activePlan && activePlan.id === editForm.id) {
        setActivePlan({
          ...activePlan,
          plan_name: updatedPlanData.plan_name, // 使用处理后的唯一名称
          destination: updatedPlanData.destination,
          duration: updatedPlanData.duration,
          travelers: updatedPlanData.travelers,
          budget: updatedPlanData.budget,
          accommodation: safeParse(updatedPlanData.accommodation),
          transportation: safeParse(updatedPlanData.transportation),
          daily_plans: safeParse(updatedPlanData.daily_plans),
          tips: safeParse(updatedPlanData.tips),
          updated_at: updatedPlanData.updated_at
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

  // 加载状态
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
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
              <button className="back-btn" onClick={handleBackToList}>← 返回列表</button>
              {!isEditing && (
                <div>
                  {isRouteSelectionMode && (
                    <button 
                      className="plan-route-btn" 
                      onClick={handlePlanRoute}
                      disabled={selectedActivities.length !== 2}
                      style={{ marginRight: '10px' }}
                    >
                      规划路线
                    </button>
                  )}
                  <button className="nav-route-btn" onClick={() => {
                                    setIsRouteSelectionMode(!isRouteSelectionMode);
                                    // 如果关闭选择模式，清空已选择的活动
                                    if (isRouteSelectionMode) {
                                      setSelectedActivities([]);
                                    }
                                  }}>
                                  {isRouteSelectionMode ? '取消导航' : '导航路线'}
                                </button>
                </div>
              )}
            </div>
            
            {updateSuccess && (
              <div className="update-success-message">
                ✅ 旅行计划更新成功！
              </div>
            )}
            
            {isEditing && activePlan.id === editForm.id ? (
              // 编辑模式 - 显示表单
              <div className="plan-edit-form">
                <h2>编辑 {activePlan.plan_name || '旅行计划'}</h2>
                
                <div className="form-group">
                  <label htmlFor="plan_name">计划名称</label>
                  <input
                    type="text"
                    id="plan_name"
                    name="plan_name"
                    value={editForm.plan_name || ''}
                    onChange={handleInputChange}
                    placeholder="请输入计划名称"
                  />
                </div>
                
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
                    <label htmlFor="travelers">人数</label>
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
                
                {/* 每日行程编辑 */}
                <div className="form-section">
                  <h3>每日行程安排</h3>
                  <button className="add-btn" onClick={addDayPlan}>+ 添加一天</button>
                  
                  {(editForm.daily_plans || []).map((dayPlan, dayIndex) => (
                    <div key={dayIndex} className="day-plan-editor">
                      <div className="day-header-editor">
                        <h4>第{dayPlan.day}天</h4>
                        <button 
                          className="remove-btn"
                          onClick={() => removeDayPlan(dayIndex)}
                          disabled={(editForm.daily_plans || []).length <= 1}
                        >删除这一天</button>
                      </div>
                      

                      
                      <div className="activities-editor">
                        <button 
                          className="add-btn small"
                          onClick={() => addActivity(dayIndex)}
                        >+ 添加活动</button>
                        
                        {(dayPlan.activities || []).map((activity, activityIndex) => (
                          <div key={activityIndex} className="activity-editor" style={{position: 'relative', padding: '10px 40px 10px 10px', border: '1px solid #e0e0e0', borderRadius: '4px', marginBottom: '10px'}}>
                            <button 
                  className="remove-btn small"
                  onClick={() => removeActivity(dayIndex, activityIndex)}
                  disabled={(dayPlan.activities || []).length <= 1}
                  style={{position: 'absolute', top: '5px', right: '5px', width: '24px', height: '24px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: '#fff', border: '1px solid #ff0000', color: '#ff0000', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'}}
                >×</button>
                            <div className="activity-row">
                              <div className="form-group small">
                                <label>时间</label>
                                <input
                        type="time"
                        value={activity.time || ''}
                        onChange={(e) => updateActivity(dayIndex, activityIndex, 'time', e.target.value)}
                        className="time-input"
                      />
                              </div>
                              <div className="form-group small">
                                <label>类型</label>
                                <select
                            value={activity.type || '景点'}
                            onChange={(e) => updateActivity(dayIndex, activityIndex, 'type', e.target.value)}
                            className="activity-type-select"
                          >
                                  <option value="景点">景点</option>
                                  <option value="餐饮">餐饮</option>
                                  <option value="交通">交通</option>
                                  <option value="购物">购物</option>
                                  <option value="其他">其他</option>
                                </select>
                              </div>
                            </div>
                            <div className="form-group">
                              <label>活动描述</label>
                              <textarea
                                value={activity.description || ''}
                                onChange={(e) => updateActivity(dayIndex, activityIndex, 'description', e.target.value)}
                                rows="2"
                                placeholder="描述这个活动"
                              />
                              <div className="form-group small">
                                <label>预算</label>
                                <input
                                  type="text"
                                  value={activity.budget || ''}
                                  onChange={(e) => updateActivity(dayIndex, activityIndex, 'budget', e.target.value)}
                                  placeholder="如：50元"
                                />
                              </div>
                            </div>
                            
                            {/* 坐标设置功能 */}
                            <div className="form-group">
                              <label>地点</label>
                              <div className="location-search-container">
                                <div className="search-input-wrapper">
                                  <input
                                    type="text"
                                    placeholder="输入地点名称搜索"
                                    value={activity.locationSearch || ''}
                                    onChange={(e) => updateActivity(dayIndex, activityIndex, 'locationSearch', e.target.value)}
                                    className="location-search-input"
                                  />
                                  <button 
                                    onClick={() => handleLocationSearch(dayIndex, activityIndex)}
                                    className="search-btn"
                                  >
                                    搜索
                                  </button>
                                </div>
                                
                                {/* 搜索结果下拉列表 */}
                                {showSearchResults && searchingActivity && 
                                 searchingActivity.dayIndex === dayIndex && 
                                 searchingActivity.activityIndex === activityIndex && (
                                  <div className="search-results-dropdown">
                                    <div className="search-results-header">
                                      <span>搜索结果</span>
                                      <button className="close-results-btn" onClick={closeSearchResults}>
                                        ×
                                      </button>
                                    </div>
                                    <div className="search-results-list">
                                      {searchResults.map((result) => (
                                        <div 
                                          key={result.id} 
                                          className="search-result-item"
                                          onClick={() => handleSelectSearchResult(result)}
                                        >
                                          <div className="result-title">{result.title}</div>
                                          <div className="result-address">{result.address}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {activity.coordinates && (
                                  <div className="coordinates-display">
                                    <span className="address-info">{activity.address || ''}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* 旅行小贴士编辑 */}
                <div className="form-section">
                  <h3>旅行小贴士</h3>
                  <button className="add-btn" onClick={addTip}>+ 添加小贴士</button>
                  
                  {(editForm.tips || []).map((tip, index) => (
                    <div key={index} className="tip-editor">
                      <div className="form-group tip-input">
                        <textarea
                          value={tip || ''}
                          onChange={(e) => updateTip(index, e.target.value)}
                          rows="2"
                          placeholder="输入小贴士内容"
                        />
                        <button 
                          className="remove-btn small"
                          onClick={() => removeTip(index)}
                        >×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // 查看模式 - 显示详情
              <>
                {!isRouteSelectionMode && (
                  <>
                    <div className="plan-header">
                      <h2>{activePlan.plan_name || '旅行计划'}</h2>
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
                          <span>目的地：{activePlan.destination}</span>
                          <span>行程天数：{activePlan.duration}</span>
                          <span>人数：{activePlan.travelers}人</span>
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
                  </>
                )}

                <div className="daily-plans">
                  <h3>每日行程安排</h3>
                  {(activePlan.daily_plans || []).map((dayPlan) => (
                    <div key={dayPlan.day} className="day-plan-card">
                      <div className="day-header">
                  <h4>第{dayPlan.day}天</h4>
                </div>
                      <div className="activities-list">
                        {(isRouteSelectionMode 
                          ? (dayPlan.activities || []).filter(activity => 
                              activity.coordinates && activity.coordinates.lat && activity.coordinates.lng
                            ) 
                          : (dayPlan.activities || [])
                        ).map((activity, index) => {
                          // 检查活动是否有坐标
                          const hasCoordinates = activity.coordinates && activity.coordinates.lat && activity.coordinates.lng;
                          // 检查活动是否被选中
                          const isSelected = isRouteSelectionMode && selectedActivities.some(
                            item => item.dayIndex === dayPlan.day && item.activityIndex === index
                          );
                          // 是否可以选择
                          const canSelect = isRouteSelectionMode && hasCoordinates;
                          
                          return (
                            <div 
                              key={index} 
                              className={`activity-item ${isSelected ? 'selected' : ''}`}
                              onClick={canSelect ? () => handleActivitySelection(dayPlan.day, index, activity) : undefined}
                              style={canSelect ? { cursor: 'pointer' } : {}}
                            >
                              <div className="activity-time">{activity.time}</div>
                              <div className="activity-content">
                                <span className={`activity-type ${activity.type}`}>{activity.type}</span>
                                <p className="activity-description">{activity.description}</p>
                                {activity.budget && <span className="activity-budget">💰 {activity.budget}</span>}
                                {activity.coordinates && (
                                  <div className="location-info">
                                    <span className="address-text">{activity.address || '已设置坐标'}</span>
                                    <button 
                                      className="locate-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleLocateActivity(activity);
                                      }}
                                    >
                                      定位
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {!isRouteSelectionMode && (
                  <div className="travel-tips">
                    <h3>旅行小贴士</h3>
                    <ul>
                      {(activePlan.tips || []).map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            
            {!isRouteSelectionMode && (
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
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEditPlan(activePlan)}
                    >
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
            )}
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
                    <h3>{plan.plan_name || `旅行计划`}</h3>
                    <div className="plan-card-details">
                      <span>{plan.destination}</span>
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
  );
};

export default MyPlansPage;