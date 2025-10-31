// 大语言模型服务封装

/**
 * 调用大语言模型API生成旅行计划
 * @param {Object} tripDetails - 旅行详情
 * @returns {Promise<Object>} - 生成的旅行计划
 */
export const generateTravelPlan = async (tripDetails) => {
  try {
    console.log('开始生成旅行计划...');
    // 构建发送给LLM的提示词
    const prompt = buildTravelPrompt(tripDetails);
    console.log('生成的提示词:', prompt);
    
    // 这里使用示例API，实际项目中需要替换为真实的API端点
    // 可以使用OpenAI、Claude、百度文心一言等大语言模型API
    const response = await callLLMAPI(prompt);
    console.log('LLM响应内容:', response);
    
    // 解析LLM返回的内容并转换为所需的旅行计划格式
    const plan = parseLLMResponse(response);
    console.log('解析后的旅行计划:', plan);
    
    return plan;
  } catch (error) {
    console.error('生成旅行计划时出错:', error.message, error.stack);
    // 抛出更详细的错误信息
    throw new Error(`生成旅行计划失败: ${error.message || '未知错误'}`);
  }
};

/**
 * 构建旅行规划提示词
 * @param {Object} tripDetails - 旅行详情
 * @returns {string} - 格式化的提示词
 */
const buildTravelPrompt = (tripDetails) => {
  const startDate = new Date(tripDetails.startDate);
  const endDate = new Date(tripDetails.endDate);
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  
  return `请帮我生成一个详细的${tripDetails.destination}旅行计划，满足以下要求：

旅行天数：${days}天
旅行日期：从${tripDetails.startDate}到${tripDetails.endDate}
预算：${tripDetails.budget}元
同行人数：${tripDetails.peopleCount}人
旅行偏好：${tripDetails.preferences.join('、')}

请提供以下内容：
1. 住宿建议：推荐适合的酒店或民宿
2. 交通建议：如何在目的地内移动
3. 每日行程安排：每天的详细活动，包括时间、地点、活动内容
4. 美食推荐：当地特色餐厅和美食
5. 购物建议：适合购买的特产或纪念品
6. 旅行小贴士：注意事项和实用建议

请严格按照JSON格式返回，确保格式正确，可以被JavaScript直接解析。
JSON结构如下：
{
  "destination": "目的地名称",
  "duration": "X天",
  "travelers": "X",
  "budget": "X元",
  "preferences": ["偏好1", "偏好2"...],
  "accommodation": "住宿建议",
  "transportation": "交通建议",
  "dailyPlans": [
    {
      "day": 1,
      "date": "日期",
      "activities": [
        {
          "time": "09:00",
          "type": "活动类型（如：早餐、景点、午餐等）",
          "description": "活动描述"
        }
        // 更多活动...
      ]
    }
    // 更多天数...
  ],
  "tips": [
    "提示1",
    "提示2"
    // 更多提示...
  ]
}
旅行天数需要包含我指定的开始日期和结束日期，包括这两天。请不要少写任何一天。
`;
};

/**
 * 调用大语言模型API
 */
const callLLMAPI = async (prompt) => {
  // 获取环境变量中的API密钥和基础URL（使用Vite的import.meta.env）
  const apiKey = import.meta.env.REACT_APP_LLM_API_KEY;
  const apiBaseUrl = import.meta.env.REACT_APP_LLM_API_BASE_URL || '';
  
  // 检查API密钥是否存在
  if (!apiKey || !apiBaseUrl) {
    console.warn('未配置有效的API密钥或基础URL，返回模拟数据');
    return getMockLLMResponse(prompt);
  }
  
  // 规范化API基础URL，确保以斜杠结尾
  const normalizedBaseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;
  return callZhiPuAI(prompt, apiKey, normalizedBaseUrl);

};

/**
 * 获取模拟的旅行计划数据
 * 当API调用失败时使用
 */
export const getMockTravelPlan = () => {
  return {
    overview: {
      title: "模拟旅行计划 - 北京三日游",
      duration: "3天2晚",
      totalBudget: "约¥2000/人",
      bestTime: "春季、秋季",
      summary: "这是一个模拟的北京三日游行程，包含了故宫、长城、天坛等著名景点，以及当地特色美食推荐。"
    },
    accommodation: [
      {
        name: "北京王府井希尔顿酒店",
        location: "东城区王府井东街8号",
        priceRange: "¥1000-1500/晚",
        rating: 4.5,
        description: "位于市中心，交通便利，周边有众多购物中心和餐厅。"
      }
    ],
    transportation: [
      "机场至市区：乘坐机场快轨，约30分钟，票价¥25",
      "市内交通：建议购买北京交通卡，可乘坐地铁和公交",
      "景点间交通：地铁是最便捷的选择，几乎覆盖所有主要景点"
    ],
    itinerary: [
      {
        day: "第1天",
        activities: [
          {
            time: "08:30-09:00",
            title: "早餐",
            description: "酒店内享用早餐"
          },
          {
            time: "09:30-13:00",
            title: "故宫博物院",
            description: "参观紫禁城，了解中国古代皇家文化",
            location: "东城区景山前街4号",
            price: "¥60"
          },
          {
            time: "13:30-14:30",
            title: "午餐 - 全聚德烤鸭店",
            description: "品尝北京特色烤鸭",
            location: "前门大街30号",
            price: "¥200/人"
          },
          {
            time: "15:00-17:00",
            title: "景山公园",
            description: "登上景山俯瞰故宫全景",
            location: "西城区景山西街44号",
            price: "¥2"
          }
        ]
      },
      {
        day: "第2天",
        activities: [
          {
            time: "07:30-08:00",
            title: "早餐",
            description: "酒店内享用早餐"
          },
          {
            time: "08:30-12:00",
            title: "八达岭长城",
            description: "不到长城非好汉，体验世界文化遗产",
            location: "延庆区八达岭镇",
            price: "¥40",
            transportation: "建议乘坐S2线火车，约1.5小时"
          }
        ]
      }
    ],
    tips: [
      "建议提前一周预订热门景点门票，尤其是故宫",
      "北京天气干燥，请多喝水，做好保湿工作",
      "景区人流量大，注意保管好个人财物",
      "尝试当地特色小吃：炸酱面、豆汁儿、焦圈"
    ]
  };
};

/**
 * 调用智谱AI API
 */
const callZhiPuAI = async (prompt, apiKey, apiBaseUrl) => {
  try {
    console.log('开始调用智谱AI API...');
    // 构建完整的请求URL
    const requestUrl = `${apiBaseUrl}chat/completions`;
    
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: import.meta.env.REACT_APP_LLM_MODEL || "glm-4", // 使用环境变量或默认智谱GLM-4模型
        messages: [
          { role: "system", content: "你是一位专业的旅行规划师，擅长根据用户需求制定详细的旅行计划。请严格按照用户要求的JSON格式返回结果。" },
          { role: "user", content: prompt }
        ],
        temperature: parseFloat(import.meta.env.REACT_APP_LLM_TEMPERATURE || 0.7),
        max_tokens: parseInt(import.meta.env.REACT_APP_LLM_MAX_TOKENS || 4000),
        response_format: { type: "json_object" }
      })
    });
    
    console.log('API响应状态:', response.status);
    
    // 读取响应文本以便调试
    const responseText = await response.text();
    console.log('API响应原始文本:', responseText);
    
    if (!response.ok) {
      throw new Error(`智谱AI API请求失败: ${response.statusText}，响应内容: ${responseText}`);
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('解析后的响应数据:', data);
    } catch (parseError) {
      throw new Error(`解析响应JSON失败: ${parseError.message}，原始响应: ${responseText}`);
    }
    
    // 处理智谱AI返回的格式
    if (data.error) {
      throw new Error(`智谱AI API错误: ${data.error.message || JSON.stringify(data.error)}`);
    }
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error('智谱AI API返回格式不符合预期，缺少必要字段');
    }
    
    // 智谱AI的响应格式与OpenAI类似
    return data.choices[0].message.content;
  } catch (error) {
    console.error('智谱AI API调用失败:', error.message, error.stack);
    throw error;
  }
};

/**
 * 解析LLM响应为旅行计划对象
 */
const parseLLMResponse = (response) => {
  try {
    // 尝试直接解析JSON
    return JSON.parse(response);
  } catch (error) {
    console.error('解析LLM响应失败，尝试提取JSON部分:', error);
    
    // 尝试从文本中提取JSON部分
    // 这是一种容错机制，处理LLM可能返回的非标准格式
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerError) {
        console.error('提取后解析JSON仍失败:', innerError);
        // 如果解析失败，返回基本结构的模拟数据
        return getFallbackTravelPlan(response);
      }
    }
    
    // 如果无法提取JSON，返回回退数据
    return getFallbackTravelPlan(response);
  }
};

/**
 * 获取模拟的LLM响应（用于开发测试）
 */
const getMockLLMResponse = (prompt) => {
  console.log('使用模拟LLM响应数据');
  
  // 从提示词中提取关键信息（保持原有功能以便向后兼容）
  try {
    const destinationMatch = prompt.match(/旅行计划，满足以下要求：\s*\n\s*\n旅行天数：(\d+)天/);
    const days = destinationMatch ? parseInt(destinationMatch[1]) : 3;
    
    const destinationMatch2 = prompt.match(/请帮我生成一个详细的([^\s]+)旅行计划/);
    const destination = destinationMatch2 ? destinationMatch2[1] : '未知目的地';
    
    const preferencesMatch = prompt.match(/旅行偏好：([^\n]+)/);
    const preferences = preferencesMatch ? preferencesMatch[1].split('、') : [];
    
    // 如果能提取到原始格式需要的信息，保持原始行为
    if (destination !== '未知目的地') {
      // 生成模拟的每日行程
      const dailyPlans = [];
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toLocaleDateString('zh-CN');
        
        dailyPlans.push({
          day: i + 1,
          date: dateStr,
          activities: [
            {
              time: '09:00',
              type: '早餐',
              description: `${destination}特色早餐，品尝当地美食`
            },
            {
              time: '10:00',
              type: '景点',
              description: preferences.includes('动漫') ? `${destination}动漫主题公园` : `${destination}主要景点游览`
            },
            {
              time: '12:30',
              type: '午餐',
              description: `${destination}当地特色餐厅，品尝正宗美食`
            },
            {
              time: '14:00',
              type: '景点',
              description: i % 2 === 0 ? `${destination}历史文化景点` : `${destination}自然风光`
            },
            {
              time: '17:30',
              type: '晚餐',
              description: `${destination}人气餐厅，体验地道风味`
            },
            {
              time: '19:30',
              type: '活动',
              description: preferences.includes('购物') ? `${destination}购物区` : `${destination}夜景游览`
            }
          ]
        });
      }
      
      return JSON.stringify({
        destination: destination,
        duration: `${days}天`,
        travelers: '2',
        budget: '10000元',
        preferences: preferences,
        accommodation: `${destination}市中心推荐酒店，交通便利`,
        transportation: `建议选择${destination}公共交通或包车服务`,
        dailyPlans: dailyPlans,
        tips: [
          `记得提前了解${destination}的天气情况`,
          '准备好常用药品和转换插头',
          '下载离线地图以便导航',
          '尊重当地文化和风俗习惯'
        ]
      });
    }
  } catch (error) {
    console.warn('无法提取提示词信息，使用标准模拟数据');
  }
  
  // 默认使用新的模拟数据结构
  return JSON.stringify(getMockTravelPlan());
};

/**
 * 获取回退的旅行计划（当LLM响应无法正确解析时使用）
 */
const getFallbackTravelPlan = (response) => {
  // 返回一个基本结构的旅行计划，确保应用不会崩溃
  return {
    destination: '旅行目的地',
    duration: '3天',
    travelers: '2',
    budget: '10000元',
    preferences: [],
    accommodation: '市中心推荐酒店',
    transportation: '建议选择公共交通',
    dailyPlans: [
      {
        day: 1,
        date: new Date().toLocaleDateString('zh-CN'),
        activities: [
          {
            time: '09:00',
            type: '早餐',
            description: '酒店早餐'
          },
          {
            time: '10:00',
            type: '景点',
            description: '主要景点游览'
          }
        ]
      }
    ],
    tips: [
      '请检查您的旅行计划详情',
      '如有需要，请重新生成计划'
    ]
  };
};