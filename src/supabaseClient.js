import { createClient } from '@supabase/supabase-js'

// 创建Supabase客户端

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dbbjwzpilhzxidrttyur.supabase.co';

// 提供默认值以防止应用崩溃
if (!supabaseUrl) {
  console.error('Supabase URL未配置，请检查.env文件中的VITE_SUPABASE_URL')
  // 开发环境下使用临时占位符避免崩溃
  supabaseUrl = 'https://default-url.supabase.co'
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYmp3enBpbGh6eGlkcnR0eXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTU0ODksImV4cCI6MjA3NzEzMTQ4OX0.UGnQ7ftOd_SRqnEo0aMSqovIIhcj92qeFBYlbz0sq2c';

// 提供默认值以防止应用崩溃
if (!supabaseAnonKey) {
  console.error('Supabase Anon Key未配置，请检查.env文件中的VITE_SUPABASE_ANON_KEY')
  // 开发环境下使用临时占位符避免崩溃
  supabaseAnonKey = 'default-anon-key'
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