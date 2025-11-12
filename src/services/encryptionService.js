/**
 * 加密工具服务
 * 用于加密和解密敏感配置信息
 */

// 注意：在生产环境中，应该使用更安全的加密方法，这里使用简单的Base64编码作为示例
// 实际应用中，建议使用更强大的加密库，如crypto-js，并确保密钥的安全管理

/**
 * 加密数据
 * @param {string} data - 要加密的数据
 * @returns {string} 加密后的数据
 */
export const encryptData = (data) => {
  try {
    // 在实际应用中，这里应该实现更强的加密算法
    // 这里使用简单的Base64编码作为示例
    return btoa(unescape(encodeURIComponent(data)));
  } catch (error) {
    console.error('加密数据失败:', error);
    throw new Error('加密数据失败');
  }
};

/**
 * 解密数据
 * @param {string} encryptedData - 要解密的数据
 * @returns {string} 解密后的数据
 */
export const decryptData = (encryptedData) => {
  try {
    // 在实际应用中，这里应该实现对应的解密算法
    // 这里使用简单的Base64解码作为示例
    return decodeURIComponent(escape(atob(encryptedData)));
  } catch (error) {
    console.error('解密数据失败:', error);
    throw new Error('解密数据失败');
  }
};

/**
 * 加密配置对象
 * @param {Object} config - 包含敏感信息的配置对象
 * @returns {Object} 加密后的配置对象
 */
export const encryptConfig = (config) => {
  try {
    const encryptedConfig = {};
    
    if (config.llmApiKey) {
      encryptedConfig.llm_api_key_encrypted = encryptData(config.llmApiKey);
    }
    
    if (config.llmApiBaseUrl) {
      encryptedConfig.llm_api_base_url_encrypted = encryptData(config.llmApiBaseUrl);
    }
    
    if (config.baiduMapApiKey) {
      encryptedConfig.baidu_map_api_key_encrypted = encryptData(config.baiduMapApiKey);
    }
    
    return encryptedConfig;
  } catch (error) {
    console.error('加密配置对象失败:', error);
    throw new Error('加密配置对象失败');
  }
};

/**
 * 解密配置对象
 * @param {Object} encryptedConfig - 数据库中存储的加密配置对象
 * @returns {Object} 解密后的配置对象
 */
export const decryptConfig = (encryptedConfig) => {
  try {
    const decryptedConfig = {};

    if (encryptedConfig.llm_api_key_encrypted) {
      decryptedConfig.llmApiKey = decryptData(encryptedConfig.llm_api_key_encrypted);
    }
    
    if (encryptedConfig.llm_api_base_url_encrypted) {
      decryptedConfig.llmApiBaseUrl = decryptData(encryptedConfig.llm_api_base_url_encrypted);
    }
    
    if (encryptedConfig.baidu_map_api_key_encrypted) {
      decryptedConfig.baiduMapApiKey = decryptData(encryptedConfig.baidu_map_api_key_encrypted);
    }
    
    return decryptedConfig;
  } catch (error) {
    console.error('解密配置对象失败:', error);
    throw new Error('解密配置对象失败');
  }
};

export default {
  encryptData,
  decryptData,
  encryptConfig,
  decryptConfig
};