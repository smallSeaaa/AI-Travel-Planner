import supabase from '../supabaseClient'

// 旅行计划服务
export const travelPlanService = {
  /**
   * 处理并验证旅行计划中的活动预算
   * @param {Array} dailyPlans - 每日计划数组
   * @returns {Array} - 处理后的每日计划数组
   */
  processActivityBudgets(dailyPlans) {
    if (!Array.isArray(dailyPlans)) return [];
    
    return dailyPlans.map(day => {
      if (!day || !Array.isArray(day.activities)) return day;
      
      // 确保每个活动都有预算信息
      day.activities = day.activities.map(activity => {
        if (!activity) return activity;
        
        // 确保预算字段存在且不为空
        if (!activity.budget || activity.budget === '') {
          activity.budget = '50元'; // 默认预算
        }
        
        return activity;
      });
      
      return day;
    });
  },

  // 检查计划名称是否重复并生成唯一名称
  async generateUniquePlanName(userId, baseName) {
    try {
      // 查询当前用户的所有计划名称
      const { data, error } = await supabase
        .from('travel_plans')
        .select('plan_name')
        .eq('user_id', userId);
      
      if (error) {
        console.error('查询计划名称失败:', error);
        return baseName; // 出错时返回原始名称
      }
      
      const existingNames = data.map(plan => plan.plan_name).filter(Boolean);
      
      // 首先检查是否有完全匹配的名称
      if (!existingNames.includes(baseName)) {
        return baseName;
      }
      
      // 改进的正则表达式，支持所有格式的重复名称
      // 移除baseName中可能影响正则表达式的特殊字符
      const escapedBaseName = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const namePattern = new RegExp(`^${escapedBaseName}\((\d+)\)$`);
      
      // 查找已有的编号并确定下一个编号
      let maxNumber = 0;
      
      existingNames.forEach(name => {
        const match = name.match(namePattern);
        if (match && match[1]) {
          const number = parseInt(match[1], 10);
          if (!isNaN(number)) {
            maxNumber = Math.max(maxNumber, number);
          }
        }
      });
      
      // 如果已经有重复名称但没有编号，则从1开始
      // 确保即使没有找到带编号的名称，也能生成(1)
      if (existingNames.includes(baseName)) {
        return `${baseName}(${maxNumber + 1})`;
      }
      
      return baseName;
    } catch (error) {
      console.error('生成唯一计划名称失败:', error);
      // 添加更多的错误处理，确保即使出错也能返回有效的名称
      return baseName || `未命名计划-${new Date().getTime()}`;
    }
  },

  // 保存旅行计划
  async saveTravelPlan(userId, plan, tripDetails) {
    try {
      // 处理活动预算信息
      const processedDailyPlans = this.processActivityBudgets(plan.dailyPlans || []);
      
      // 确定计划名称
      let planName;
      if (plan.plan_name) {
        // 如果提供了计划名称，确保它是唯一的
        planName = await this.generateUniquePlanName(userId, plan.plan_name);
      } else {
        // 否则生成基于目的地和日期的默认名称，并确保唯一性
        const baseName = `${plan.destination || '未知'}旅行-${new Date().toLocaleDateString('zh-CN')}`;
        planName = await this.generateUniquePlanName(userId, baseName);
      }
      
      let retries = 0;
      const maxRetries = 3;
      let data, error;
      
      // 添加重试逻辑，防止并发操作导致的约束冲突
      while (retries < maxRetries) {
        ({ data, error } = await supabase.from('travel_plans').insert({
          user_id: userId,
          destination: plan.destination,
          duration: plan.duration,
          travelers: plan.travelers,
          budget: plan.budget,
          // 使用确保唯一性的计划名称
          plan_name: planName,
          accommodation: JSON.stringify(plan.accommodation),
          transportation: JSON.stringify(plan.transportation),
          daily_plans: JSON.stringify(processedDailyPlans),
          tips: JSON.stringify(plan.tips),
          original_request: JSON.stringify(tripDetails),
          created_at: new Date().toISOString()
        }).select());
        
        // 如果没有错误，跳出循环
        if (!error) break;
        
        // 如果是唯一约束错误，重新生成名称并重试
        if (error.code === '23505' && error.message.includes('unique')) {
          retries++;
          console.log(`计划名称冲突，重新生成唯一名称 (尝试 ${retries}/${maxRetries})`);
          // 强制生成带编号的新名称
          const nameParts = planName.match(/^(.+)\((\d+)\)$/);
          let baseNameToRetry = planName;
          let nextNumber = 1;
          
          if (nameParts && nameParts.length >= 3) {
            baseNameToRetry = nameParts[1];
            nextNumber = parseInt(nameParts[2], 10) + 1;
          }
          
          planName = `${baseNameToRetry}(${nextNumber})`;
        } else {
          // 其他错误直接抛出
          throw error;
        }
      }
      
      if (error) {
        throw error;
      }
      
      return { success: true, data: data[0] }
    } catch (error) {
      console.error('保存旅行计划失败:', error);
      // 提供更友好的错误消息
      if (error.code === '23505' && error.message.includes('unique')) {
        return { success: false, error: '计划名称已存在，请尝试其他名称' };
      }
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
      
      // 解析JSON字段，添加错误处理
      const parsedPlans = data.map(plan => {
        // 安全解析JSON函数，优化处理非JSON格式数据
          const safeParse = (jsonString, defaultValue = {}) => {
            try {
              if (!jsonString) return defaultValue;
              
              // 尝试解析为JSON
              return JSON.parse(jsonString);
            } catch (error) {
              // 如果不是有效的JSON，直接返回原始字符串
              // 这样对于直接存储的文本内容更有意义
              console.debug(`字段不是JSON格式，直接使用原始内容: ${jsonString.substring(0, 30)}...`);
              return jsonString;
            }
          };
        
        return {
          ...plan,
          accommodation: safeParse(plan.accommodation, {}),
          transportation: safeParse(plan.transportation, {}),
          daily_plans: safeParse(plan.daily_plans, []),
          tips: safeParse(plan.tips, {}),
          original_request: plan.original_request // 直接使用保存的字符串
        };
      })
      
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
      // 处理活动预算信息
      const processedDailyPlans = this.processActivityBudgets(updatedPlan.dailyPlans || []);
      
      // 检查是否需要更新计划名称，如果需要则确保唯一性
      let planName = updatedPlan.plan_name;
      
      if (planName) {
        // 查询当前计划的原始名称，避免不必要的编号
        const { data: currentPlan, error: fetchError } = await supabase
          .from('travel_plans')
          .select('plan_name')
          .eq('id', planId)
          .eq('user_id', userId)
          .single();
        
        // 如果计划名称已更改或获取当前计划失败，则生成唯一名称
        if (fetchError || currentPlan.plan_name !== planName) {
          planName = await this.generateUniquePlanName(userId, planName);
        }
      }
      
      let retries = 0;
      const maxRetries = 3;
      let data, error;
      
      // 添加重试逻辑，防止并发操作导致的约束冲突
      while (retries < maxRetries) {
        ({ data, error } = await supabase
          .from('travel_plans')
          .update({
            plan_name: planName,
            destination: updatedPlan.destination,
            duration: updatedPlan.duration,
            travelers: updatedPlan.travelers,
            budget: updatedPlan.budget,
            accommodation: JSON.stringify(updatedPlan.accommodation),
            transportation: JSON.stringify(updatedPlan.transportation),
            daily_plans: JSON.stringify(processedDailyPlans),
            tips: JSON.stringify(updatedPlan.tips),
            original_request: JSON.stringify(updatedPlan.original_request),
            updated_at: new Date().toISOString()
          })
          .eq('id', planId)
          .eq('user_id', userId)
          .select());
        
        // 如果没有错误，跳出循环
        if (!error) break;
        
        // 如果是唯一约束错误，重新生成名称并重试
        if (error.code === '23505' && error.message.includes('unique')) {
          retries++;
          console.log(`计划名称冲突，重新生成唯一名称 (尝试 ${retries}/${maxRetries})`);
          // 强制生成带编号的新名称
          const nameParts = planName.match(/^(.+)\((\d+)\)$/);
          let baseNameToRetry = planName;
          let nextNumber = 1;
          
          if (nameParts && nameParts.length >= 3) {
            baseNameToRetry = nameParts[1];
            nextNumber = parseInt(nameParts[2], 10) + 1;
          }
          
          planName = `${baseNameToRetry}(${nextNumber})`;
        } else {
          // 其他错误直接抛出
          throw error;
        }
      }
      
      if (error) {
        throw error;
      }
      
      return { success: true, data: data[0] }
    } catch (error) {
      console.error('更新旅行计划失败:', error);
      // 提供更友好的错误消息
      if (error.code === '23505' && error.message.includes('unique')) {
        return { success: false, error: '计划名称已存在，请尝试其他名称' };
      }
      return { success: false, error: error.message }
    }
  }
}

export default travelPlanService