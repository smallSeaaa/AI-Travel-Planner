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
 * @param {string} tripDetails - 用户输入的旅行需求文本
 * @returns {string} - 格式化的提示词
 */
const buildTravelPrompt = (tripDetails) => {
  // 直接使用用户输入的原始文本作为旅行需求
  return `请根据以下旅行需求，生成一个详细的旅行计划：

${tripDetails}

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
      "date": "", // 不要填写具体日期
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
请根据用户提供的信息，合理推断旅行天数、人数、预算等信息并填入JSON中。
注意：
1. 不要在生成的计划中包含任何具体日期信息！
2. date字段请保持为空字符串
3. 在行程安排的文本描述中也不要提及具体日期，只使用"第X天"来表示
4. 如果用户没有指定旅行天数，默认为3天
`;
};

/**
 * 调用大语言模型API
 */
const callLLMAPI = async (prompt) => {
  // 获取环境变量中的API密钥和基础URL（使用Vite的import.meta.env）
  const apiKey = import.meta.env.VITE_LLM_API_KEY;
  const apiBaseUrl = import.meta.env.VITE_LLM_API_BASE_URL || '';
  
  // 检查API密钥是否存在
  if (!apiKey || !apiBaseUrl) {
    throw new Error('未配置有效的LLM API密钥或基础URL，请在.env文件中正确配置VITE_LLM_API_KEY和VITE_LLM_API_BASE_URL');
  }
  
  // 规范化API基础URL，确保以斜杠结尾
  const normalizedBaseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;
  return callZhiPuAI(prompt, apiKey, normalizedBaseUrl);

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
        model: import.meta.env.VITE_LLM_MODEL || "glm-4", // 使用环境变量或默认智谱GLM-4模型
        messages: [
          { role: "system", content: "你是一位专业的旅行规划师，擅长根据用户需求制定详细的旅行计划。请严格按照用户要求的JSON格式返回结果。" },
          { role: "user", content: prompt }
        ],
        temperature: parseFloat(import.meta.env.VITE_LLM_TEMPERATURE || 0.7),
        max_tokens: parseInt(import.meta.env.VITE_LLM_MAX_TOKENS || 4000),
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
    
    for (let i = 0; i < days; i++) {
      dailyPlans.push({
        day: i + 1,
        date: "",
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
        date: "",
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