import supabase from '../supabaseClient';

// 获取用户偏好
export const getUserPreferences = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取用户偏好失败:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('获取用户偏好时出错:', error);
    throw error;
  }
};

// 添加用户偏好
export const addUserPreference = async (userId, preference) => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .insert([{ user_id: userId, preference }])
      .select();

    if (error) {
      console.error('添加用户偏好失败:', error);
      throw error;
    }

    return data[0];
  } catch (error) {
    console.error('添加用户偏好时出错:', error);
    throw error;
  }
};

// 删除用户偏好
export const deleteUserPreference = async (preferenceId) => {
  try {
    const { error } = await supabase
      .from('user_preferences')
      .delete()
      .eq('id', preferenceId);

    if (error) {
      console.error('删除用户偏好失败:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('删除用户偏好时出错:', error);
    throw error;
  }
};