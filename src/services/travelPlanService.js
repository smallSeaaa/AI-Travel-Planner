import supabase from '../supabaseClient'

// 旅行计划服务
export const travelPlanService = {
  // 保存旅行计划
  async saveTravelPlan(userId, plan, tripDetails) {
    try {
      const { data, error } = await supabase.from('travel_plans').insert({
        user_id: userId,
        destination: plan.destination,
        duration: plan.duration,
        travelers: plan.travelers,
        budget: plan.budget,
        accommodation: JSON.stringify(plan.accommodation),
        transportation: JSON.stringify(plan.transportation),
        daily_plans: JSON.stringify(plan.dailyPlans),
        tips: JSON.stringify(plan.tips),
        original_request: JSON.stringify(tripDetails),
        created_at: new Date().toISOString()
      }).select()
      
      if (error) {
        throw error
      }
      
      return { success: true, data: data[0] }
    } catch (error) {
      console.error('保存旅行计划失败:', error)
      return { success: false, error: error.message }
    }
  },
  
  // 获取用户的所有旅行计划
  async getUserTravelPlans(userId) {
    try {
      const { data, error } = await supabase
        .from('travel_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      // 解析JSON字段
      const parsedPlans = data.map(plan => ({
        ...plan,
        accommodation: JSON.parse(plan.accommodation),
        transportation: JSON.parse(plan.transportation),
        daily_plans: JSON.parse(plan.daily_plans),
        tips: JSON.parse(plan.tips),
        original_request: plan.original_request // 不再解析，直接使用保存的字符串
      }))
      
      return { success: true, data: parsedPlans }
    } catch (error) {
      console.error('获取旅行计划失败:', error)
      return { success: false, error: error.message }
    }
  },
  
  // 获取单个旅行计划详情
  async getTravelPlanDetails(planId, userId) {
    try {
      const { data, error } = await supabase
        .from('travel_plans')
        .select('*')
        .eq('id', planId)
        .eq('user_id', userId)
        .single()
      
      if (error) {
        throw error
      }
      
      // 解析JSON字段
      const parsedPlan = {
        ...data,
        accommodation: JSON.parse(data.accommodation),
        transportation: JSON.parse(data.transportation),
        daily_plans: JSON.parse(data.daily_plans),
        tips: JSON.parse(data.tips),
        original_request: JSON.parse(data.original_request)
      }
      
      return { success: true, data: parsedPlan }
    } catch (error) {
      console.error('获取旅行计划详情失败:', error)
      return { success: false, error: error.message }
    }
  },
  
  // 删除旅行计划
  async deleteTravelPlan(planId, userId) {
    try {
      const { error } = await supabase
        .from('travel_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', userId)
      
      if (error) {
        throw error
      }
      
      return { success: true }
    } catch (error) {
      console.error('删除旅行计划失败:', error)
      return { success: false, error: error.message }
    }
  },
  
  // 更新旅行计划
  async updateTravelPlan(planId, userId, updatedPlan) {
    try {
      const { data, error } = await supabase
        .from('travel_plans')
        .update({
          destination: updatedPlan.destination,
          duration: updatedPlan.duration,
          travelers: updatedPlan.travelers,
          budget: updatedPlan.budget,
          accommodation: JSON.stringify(updatedPlan.accommodation),
          transportation: JSON.stringify(updatedPlan.transportation),
          daily_plans: JSON.stringify(updatedPlan.dailyPlans),
          tips: JSON.stringify(updatedPlan.tips),
          original_request: JSON.stringify(updatedPlan.original_request),
          updated_at: new Date().toISOString()
        })
        .eq('id', planId)
        .eq('user_id', userId)
        .select()
      
      if (error) {
        throw error
      }
      
      return { success: true, data: data[0] }
    } catch (error) {
      console.error('更新旅行计划失败:', error)
      return { success: false, error: error.message }
    }
  }
}

export default travelPlanService