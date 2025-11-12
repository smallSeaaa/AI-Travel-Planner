import { createClient } from '@supabase/supabase-js'

// 创建Supabase客户端
// 优先从window.env获取（用于Docker容器环境），其次从import.meta.env获取（用于开发环境）
let supabaseUrl = (window && window.env && window.env.VITE_SUPABASE_URL) || import.meta.env.VITE_SUPABASE_URL
let supabaseAnonKey = (window && window.env && window.env.VITE_SUPABASE_ANON_KEY) || import.meta.env.VITE_SUPABASE_ANON_KEY

// 提供更友好的错误处理，不再使用无效的占位符URL
if (!supabaseUrl || supabaseUrl === 'https://default-url.supabase.co') {
  console.error('错误: Supabase URL未正确配置，请确保环境变量VITE_SUPABASE_URL已设置')
  throw new Error('Supabase URL未正确配置')
}

if (!supabaseAnonKey || supabaseAnonKey === 'default-anon-key') {
  console.error('错误: Supabase Anon Key未正确配置，请确保环境变量VITE_SUPABASE_ANON_KEY已设置')
  throw new Error('Supabase Anon Key未正确配置')
}

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} catch (error) {
  console.error('创建Supabase客户端失败:', error)
  throw error
}

// 认证相关功能封装
export const auth = {
  // 注册用户
  async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })
      
      if (error) {
        throw error
      }
      
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },
  
  // 登录用户
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        throw error
      }
      
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },
  
  // 登出用户
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },
  
  // 获取当前用户
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        throw error
      }
      
      return { success: true, user }
    } catch (error) {
      return { success: false, error: error.message, user: null }
    }
  },
  
  // 监听认证状态变化
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

export default supabase