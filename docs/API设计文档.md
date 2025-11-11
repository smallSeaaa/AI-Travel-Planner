# AI 旅行规划师 (AI Travel Planner) API设计文档

## 1. API概述

本文档定义了AI旅行规划师系统的API接口规范，基于Supabase客户端SDK进行前端与后端的交互。系统采用Supabase作为后端即服务(BaaS)平台，提供数据库、认证、存储等功能。

## 2. 基础信息

### 2.1 Supabase项目配置

```javascript
import { createClient } from '@supabase/supabase-js'

// 创建Supabase客户端实例
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
```

### 2.2 认证机制

- 使用Supabase Auth进行用户认证
- 认证后自动获取访问令牌，由SDK管理
- 支持邮箱/密码、第三方OAuth等多种认证方式

### 2.3 响应格式

使用Supabase SDK时，响应格式遵循JavaScript Promise模式：

```javascript
// 成功响应
const { data, error } = await supabase.from('table').select('*')
if (error) {
  // 错误处理
} else {
  // 使用data数据
}
```

### 2.4 错误处理

Supabase SDK的错误处理模式：

```javascript
try {
  const { data, error } = await supabase.from('table').select('*')
  
  if (error) {
    console.error('操作失败:', error.message)
    // 显示用户友好的错误信息
  } else {
    // 处理成功数据
  }
} catch (err) {
  console.error('发生异常:', err)
  // 全局异常处理
}
```

## 3. 用户管理模块

### 3.1 用户注册

使用Supabase Auth进行用户注册：

```javascript
async function register(email, password, userData) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData // 可选的用户元数据
    }
  })
  
  return { data, error }
}
- **请求体**:
  ```json
  {
    "username": "user123",
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **成功响应**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "id": 1,
      "username": "user123",
      "email": "user@example.com",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

### 3.2 用户登录

```javascript
async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  return { data, error }
}
```

### 3.3 获取当前用户信息

```javascript
async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// 监听用户认证状态变化
supabase.auth.onAuthStateChange((event, session) => {
  console.log('认证状态变化:', event, session)
  // 更新应用状态或路由
})
```

### 3.4 更新用户信息

```javascript
async function updateUser(userData) {
  const { data, error } = await supabase.auth.updateUser({
    data: userData // 更新用户元数据
  })
  
  return { data, error }
}
```

### 3.5 修改密码

```javascript
async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  })
  
  return { data, error }
}
```

### 3.6 重置密码（发送重置邮件）

```javascript
async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://your-app.com/reset-password'
  })
  
  return { data, error }
}

// 处理重置密码表单提交
async function confirmPasswordReset(password, token) {
  const { data, error } = await supabase.auth.updateUser({
    password: password
  }, {
    token_hash: token
  })
  
  return { data, error }
}
```

### 3.7 登出

```javascript
async function logout() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

### 3.8 设置API密钥

```javascript
async function setApiKey(serviceType, apiKey) {
  const { data, error } = await supabase
    .from('user_api_keys')
    .insert({
      service_type: serviceType,
      api_key: apiKey
    })
  
  return { data, error }
}
```

## 4. 行程规划模块

### 4.1 生成旅行计划

```javascript
async function generateTravelPlan(planData) {
  const { data, error } = await supabase
    .from('trips')
    .insert({
      destination: planData.destination,
      start_date: planData.start_date,
      end_date: planData.end_date,
      total_budget: planData.total_budget,
      people_count: planData.people_count,
      preferences: planData.preferences,
      voice_input: planData.voice_input,
      status: 'generating'
    })
    .select()
    .single()
  
  return { data, error }
}

### 4.2 语音生成旅行计划

```javascript
// 先上传语音文件到Supabase Storage
async function uploadVoiceFile(voiceFile) {
  const fileName = `voice_${Date.now()}.wav`
  const { data, error } = await supabase
    .storage
    .from('voice-inputs')
    .upload(fileName, voiceFile)
  
  if (error) return { error }
  
  // 获取公共URL
  const { data: { publicUrl } } = supabase
    .storage
    .from('voice-inputs')
    .getPublicUrl(fileName)
  
  // 调用语音识别函数处理
  const { data: recognitionResult, error: recognitionError } = await supabase
    .functions.invoke('speech-to-text', {
      body: JSON.stringify({ file_url: publicUrl })
    })
  
  return { data: recognitionResult, error: recognitionError }
}

// 使用语音识别结果生成旅行计划
async function generateTripFromVoice(textResult) {
  // 调用AI函数分析文本并生成旅行计划
  const { data, error } = await supabase
    .functions.invoke('trip-generator', {
      body: JSON.stringify({ voice_input_text: textResult })
    })
  
  return { data, error }
}
```

### 4.3 获取行程列表

```javascript
async function getTripList(filters = {}) {
  let query = supabase.from('trips').select('*')
  
  // 应用过滤条件
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.destination) query = query.ilike('destination', `%${filters.destination}%`)
  
  // 排序并分页
  query = query.order('created_at', { ascending: false })
  if (filters.page_size) query = query.limit(filters.page_size)
  if (filters.page && filters.page_size) query = query.offset((filters.page - 1) * filters.page_size)
  
  const { data, count, error } = await query.count('*', { head: true })
  
  return { data, total: count, error }
}
```

### 4.4 获取行程详情

```javascript
async function getTripDetails(tripId) {
  // 获取行程基本信息和日程安排
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      daily_itineraries (*, items (*))
    `)
    .eq('id', tripId)
    .single()
  
  return { data, error }
}
```

### 4.5 更新行程

```javascript
async function updateTrip(tripId, updatedData) {
  const { data, error } = await supabase
    .from('trips')
    .update(updatedData)
    .eq('id', tripId)
    .select()
    .single()
  
  return { data, error }
}
```

### 4.6 删除行程

```javascript
async function deleteTrip(tripId) {
  // 先删除关联的日程安排和活动
  const { error: deleteItinerariesError } = await supabase
    .rpc('delete_trip_with_related_data', { trip_id: tripId })
  
  if (deleteItinerariesError) return { error: deleteItinerariesError }
  
  // 再删除行程本身
  const { data, error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId)
  
  return { data, error }
}
```

### 4.7 添加日程安排

```javascript
async function addItinerary(tripId, day, activities) {
  // 先添加日程安排
  const { data: itinerary, error: itineraryError } = await supabase
    .from('daily_itineraries')
    .insert({
      trip_id: tripId,
      day: day
    })
    .select()
    .single()
  
  if (itineraryError) return { error: itineraryError }
  
  // 再添加活动列表
  const activitiesWithItineraryId = activities.map(activity => ({
    ...activity,
    itinerary_id: itinerary.id
  }))
  
  const { data, error } = await supabase
    .from('activities')
    .insert(activitiesWithItineraryId)
  
  return { data, error }
}
```

## 5. 预算管理模块

### 5.1 创建预算

```javascript
async function createBudget(tripId, budgetData) {
  const { data, error } = await supabase
    .from('budgets')
    .insert({
      trip_id: tripId,
      category: budgetData.category,
      amount: budgetData.amount,
      currency: budgetData.currency || 'CNY'
    })
    .select()
    .single()
  
  return { data, error }
}

### 5.2 获取预算列表

```javascript
async function getBudgets(tripId) {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
  
  return { data, error }
}
```

### 5.3 更新预算

```javascript
async function updateBudget(budgetId, updatedData) {
  const { data, error } = await supabase
    .from('budgets')
    .update(updatedData)
    .eq('id', budgetId)
    .select()
    .single()
  
  return { data, error }
}
```

### 5.4 删除预算

```javascript
async function deleteBudget(budgetId) {
  const { data, error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', budgetId)
  
  return { data, error }
}
```

### 5.5 获取预算汇总

```javascript
async function getBudgetSummary(tripId) {
  // 使用Supabase的视图或自定义RPC函数获取汇总数据
  const { data, error } = await supabase
    .rpc('get_budget_summary', { trip_id: tripId })
  
  return { data, error }
}

// 或者直接通过查询计算汇总数据
async function calculateBudgetSummary(tripId) {
  const { data: budgets, error } = await supabase
    .from('budgets')
    .select('category, amount')
    .eq('trip_id', tripId)
  
  if (error) return { error }
  
  // 计算总金额和类别明细
  const totalAmount = budgets.reduce((sum, budget) => sum + budget.amount, 0)
  const categoryBreakdown = budgets.reduce((breakdown, budget) => {
    const existing = breakdown.find(item => item.category === budget.category)
    if (existing) {
      existing.amount += budget.amount
    } else {
      breakdown.push({ category: budget.category, amount: budget.amount })
    }
    return breakdown
  }, [])
  
  // 计算百分比
  categoryBreakdown.forEach(item => {
    item.percentage = totalAmount > 0 ? (item.amount / totalAmount * 100).toFixed(2) : 0
  })
  
  return { 
    data: {
      total_amount: totalAmount,
      currency: 'CNY', // 假设使用CNY
      category_breakdown: categoryBreakdown
    }, 
    error: null 
  }
}

## 5. 预算管理模块

### 5.1 获取行程预算

- **URL**: `/api/trips/{trip_id}/budgets`
- **Method**: `GET`
- **成功响应**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "total_budget": 10000,
      "spent_amount": 3500,
      "remaining_amount": 6500,
      "categories": [
        {
          "id": 1,
          "category": "accommodation",
          "allocated_amount": 4000,
          "actual_amount": 4000,
          "percentage": 100
        },
        // 更多预算类别...
      ]
    }
  }
  ```

### 5.2 添加费用记录

- **URL**: `/api/trips/{trip_id}/expenses`
- **Method**: `POST`
- **请求体**:
  ```json
  {
    "budget_category": "food",
    "amount": 500,
    "description": "晚餐",
    "expense_date": "2023-12-20",
    "payment_method": "信用卡"
  }
  ```
- **成功响应**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "id": 1,
      "amount": 500,
      "description": "晚餐",
      "expense_date": "2023-12-20"
    }
  }
  ```

### 5.3 语音记录费用

- **URL**: `/api/trips/{trip_id}/expenses/voice`
- **Method**: `POST`
- **请求体**:
  ```json
  {
    "audio_data": "base64编码的音频数据",
    "audio_format": "wav"
  }
  ```
- **成功响应**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "id": 2,
      "amount": 300,
      "description": "午餐",
      "expense_date": "2023-12-20",
      "budget_category": "food"
    }
  }
  ```

### 5.4 获取费用记录列表

- **URL**: `/api/trips/{trip_id}/expenses`
- **Method**: `GET`
- **查询参数**:
  - `start_date`: 开始日期
  - `end_date`: 结束日期
  - `category`: 类别筛选
- **成功响应**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": [
      {
        "id": 1,
        "amount": 500,
        "description": "晚餐",
        "expense_date": "2023-12-20",
        "budget_category": "food",
        "payment_method": "信用卡"
      },
      // 更多费用记录...
    ]
  }
  ```

### 5.5 更新预算分配

- **URL**: `/api/trips/{trip_id}/budgets`
- **Method**: `PUT`
- **请求体**:
  ```json
  {
    "categories": [
      {
        "category": "accommodation",
        "allocated_amount": 4500
      },
      {
        "category": "food",
        "allocated_amount": 2000
      }
      // 更多预算类别...
    ]
  }
  ```
- **成功响应**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "total_budget": 10000,
      "categories": [
        // 更新后的预算类别...
      ]
    }
  }
  ```

## 6. 语音识别模块

本项目使用浏览器内置的Web Speech API进行语音识别，无需额外的后端API。前端通过直接调用浏览器API实现语音到文本的转换，然后解析为旅行需求。

### 核心功能：
- 浏览器兼容性检测
- 中文语音识别
- 旅行信息提取与解析
- 错误处理与用户提示

### 使用方式：
```javascript
import { processSpeechInput } from './services/speechRecognitionService';

// 处理语音输入并获取旅行计划
const handleVoiceInput = async () => {
  try {
    const travelInfo = await processSpeechInput();
    // 使用识别结果生成旅行计划
    if (travelInfo) {
      const plan = await generateTravelPlan(travelInfo);
      return plan;
    }
  } catch (error) {
    console.error('语音处理失败:', error);
  }
};
```

### 浏览器支持说明
- Chrome, Edge, Safari等现代浏览器均支持Web Speech API
- 某些浏览器可能需要HTTPS环境
- 移动设备上的浏览器支持可能有所差异

## 7. 数据同步模块

### 7.1 获取同步状态

- **URL**: `/api/sync/status`
- **Method**: `GET`
- **成功响应**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "last_sync_time": "2023-10-24T12:00:00Z",
      "sync_status": "synced"
    }
  }
  ```

### 7.2 手动同步数据

- **URL**: `/api/sync/trigger`
- **Method**: `POST`
- **成功响应**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "sync_id": "sync-12345",
      "status": "syncing"
    }
  }
  ```

## 8. 系统监控与日志

### 8.1 获取API使用情况

- **URL**: `/api/usage/stats`
- **Method**: `GET`
- **成功响应**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "llm_calls": 25,
      "speech_calls": 10,
      "map_calls": 50,
      "current_month": "2023-10"
    }
  }
  ```