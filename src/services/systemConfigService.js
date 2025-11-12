/**
 * 系统配置服务
 * 用于处理用户系统配置的保存和获取
 */

import supabase from '../supabaseClient';
import { encryptConfig, decryptConfig } from './encryptionService';

/**
 * 保存用户系统配置
 * @param {Object} config - 用户系统配置对象
 * @returns {Object} 操作结果
 */
export const saveUserSystemConfig = async (config) => {
  try {
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    // 加密配置
    const encryptedConfig = encryptConfig(config);
    
    // 添加用户ID和时间戳
    encryptedConfig.user_id = user.id;
    encryptedConfig.updated_at = new Date().toISOString();

    // 检查是否已存在用户配置
    const { data: existingConfig, error: fetchError } = await supabase
      .from('user_system_configs')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116是未找到记录的错误码
      throw fetchError;
    }

    let result;
    
    if (existingConfig) {
      // 更新现有配置
      result = await supabase
        .from('user_system_configs')
        .update(encryptedConfig)
        .eq('id', existingConfig.id);
    } else {
      // 创建新配置
      encryptedConfig.created_at = new Date().toISOString();
      result = await supabase
        .from('user_system_configs')
        .insert(encryptedConfig);
    }

    if (result.error) {
      throw result.error;
    }

    return { success: true };
  } catch (error) {
    console.error('保存用户系统配置失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 获取用户系统配置
 * @returns {Object} 用户系统配置
 */
export const getUserSystemConfig = async () => {
  try {
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    // 从数据库获取配置
    const { data, error } = await supabase
      .from('user_system_configs')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // 未找到记录
        return { success: true, data: {} };
      }
      throw error;
    }

    // 解密配置
    const decryptedConfig = decryptConfig(data);

    return { success: true, data: decryptedConfig };
  } catch (error) {
    console.error('获取用户系统配置失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 删除用户系统配置
 * @returns {Object} 操作结果
 */
export const deleteUserSystemConfig = async () => {
  try {
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    // 删除配置
    const { error } = await supabase
      .from('user_system_configs')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('删除用户系统配置失败:', error);
    return { success: false, error: error.message };
  }
};

export default {
  saveUserSystemConfig,
  getUserSystemConfig,
  deleteUserSystemConfig
};