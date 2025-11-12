import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import { getUserPreferences, addUserPreference, deleteUserPreference } from '../services/userPreferencesService';
import systemConfigService from '../services/systemConfigService';
import '../App.css';

const UserProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedInfo, setEditedInfo] = useState({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [userPreferences, setUserPreferences] = useState([]);
  const [isAddingPreference, setIsAddingPreference] = useState(false);
  const [newPreference, setNewPreference] = useState('');
  const [preferenceError, setPreferenceError] = useState(null);
  const [isEditingSystemConfig, setIsEditingSystemConfig] = useState(false);
  const [systemConfig, setSystemConfig] = useState({
    llmApiKey: '',
    llmApiBaseUrl: '',
    baiduMapApiKey: ''
  });
  const [systemConfigError, setSystemConfigError] = useState(null);
  const [systemConfigSuccess, setSystemConfigSuccess] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);

  // 获取用户信息和偏好
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 获取基本用户信息
        const userData = {
          email: user.email,
          id: user.id
        };

        setUserInfo(userData);
        setEditedInfo(userData);

        // 获取用户偏好
        const preferences = await getUserPreferences(user.id);
        setUserPreferences(preferences);
        
        // 获取用户系统配置
        setConfigLoading(true);
        const configResult = await systemConfigService.getUserSystemConfig();
        setConfigLoading(false);
        
        if (configResult.success) {
          setSystemConfig(configResult.data);
        } else {
          console.error('获取系统配置失败:', configResult.error);
          setSystemConfigError('获取系统配置失败，请稍后重试');
          // 5秒后自动清除错误信息
          setTimeout(() => {
            setSystemConfigError(null);
          }, 5000);
        }
      } catch (err) {
        console.error('获取用户数据失败:', err);
        setError('获取用户数据失败');
        setLoading(false);
        setConfigLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // 处理编辑字段变化
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 保存用户信息
  const handleSave = async () => {
    try {
      // 在实际应用中，这里应该调用API更新用户信息
      console.log('保存用户信息:', editedInfo);
      
      // 模拟保存成功
      setUserInfo(editedInfo);
      setIsEditing(false);
    } catch (err) {
      console.error('保存用户信息失败:', err);
      setError('保存用户信息失败');
    }
  };

  // 处理退出登录
  const handleLogout = async () => {
    if (window.confirm('确定要退出登录吗？')) {
      await signOut();
      navigate('/login');
    }
  };

  // 处理修改密码
  const handleChangePassword = async () => {
    // 表单验证
    if (!passwordData.currentPassword) {
      setPasswordError('请输入当前密码');
      return;
    }

    if (!passwordData.newPassword) {
      setPasswordError('请输入新密码');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('新密码长度至少为6位');
      return;
    }

    try {
      // 使用Supabase的auth API修改密码
      // 首先需要重新验证用户身份
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword
      });

      if (reauthError) {
        throw new Error('当前密码错误，请重新输入');
      }

      // 验证成功后修改密码
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) {
        throw updateError;
      }

      setPasswordSuccess('密码修改成功！');
      
      // 重置密码表单
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // 5秒后自动关闭成功提示
      setTimeout(() => {
        setPasswordSuccess(null);
        setIsChangingPassword(false);
      }, 5000);
    } catch (err) {
      console.error('修改密码失败:', err);
      setPasswordError(err.message || '修改密码失败，请重试');
    }
  };

  // 处理添加用户偏好
  const handleAddPreference = async () => {
    if (!newPreference.trim()) {
      setPreferenceError('请输入偏好');
      return;
    }

    try {
      const preference = await addUserPreference(user.id, newPreference.trim());
      setUserPreferences(prev => [preference, ...prev]);
      setNewPreference('');
      setIsAddingPreference(false);
    } catch (err) {
      console.error('添加偏好失败:', err);
      setPreferenceError('添加偏好失败，请重试');
    }
  };

  // 处理删除用户偏好
  const handleDeletePreference = async (preferenceId) => {
    if (window.confirm('确定要删除这个偏好吗？')) {
      try {
        await deleteUserPreference(preferenceId);
        setUserPreferences(prev => prev.filter(p => p.id !== preferenceId));
      } catch (err) {
        console.error('删除偏好失败:', err);
        setError('删除偏好失败，请重试');
      }
    }
  };

  // 处理系统配置字段变化
  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setSystemConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 保存系统配置
  const handleSaveSystemConfig = async () => {
    // 清除之前的错误信息
    setSystemConfigError(null);
    
    try {
      // 添加完整的表单验证
      // 1. 验证必填字段
      const emptyFields = [];
      if (!systemConfig.llmApiBaseUrl) emptyFields.push('大语言模型 API 地址');
      if (!systemConfig.llmApiKey) emptyFields.push('大语言模型 API 密钥');
      if (!systemConfig.baiduMapApiKey) emptyFields.push('百度地图 API 密钥');
      
      if (emptyFields.length > 0) {
        setSystemConfigError(`请填写必填字段：${emptyFields.join('、')}`);
        return;
      }
      
      // 2. 验证URL格式
      if (!systemConfig.llmApiBaseUrl.startsWith('https://')) {
        setSystemConfigError('大语言模型 API 地址必须以 https:// 开头');
        return;
      }
      
      // 使用systemConfigService保存配置到数据库
      setConfigLoading(true);
      const result = await systemConfigService.saveUserSystemConfig(systemConfig);
      setConfigLoading(false);
      
      if (result.success) {
        setSystemConfigSuccess('系统配置保存成功！');
        setIsEditingSystemConfig(false);
        
        // 3秒后自动关闭成功提示
        setTimeout(() => {
          setSystemConfigSuccess(null);
        }, 3000);
      } else {
        throw new Error(result.error || '保存配置失败');
      }
    } catch (err) {
      console.error('保存系统配置失败:', err);
      setSystemConfigError(err.message || '保存系统配置失败，请重试');
    }
  };

  if (loading) {
    return <div className="loading-container">加载用户信息中...</div>;
  }

  if (!user || !userInfo) {
    return <div className="error-container">未找到用户信息</div>;
  }

  return (
    <div className="user-profile-container">
      <h2>系统设置</h2>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>关闭</button>
        </div>
      )}

      <div className="profile-info">
        <div className="profile-header">
          <h3>基本信息</h3>
        </div>

        <div className="profile-details">
          <div className="detail-item">
            <label>邮箱地址:</label>
            {isEditing ? (
              <input 
                type="email" 
                name="email" 
                value={editedInfo.email || ''} 
                onChange={handleInputChange}
                disabled // 通常不允许修改邮箱
              />
            ) : (
              <span>{userInfo.email}</span>
            )}
          </div>

          <div className="detail-item">
            <label>账户ID:</label>
            <span>{userInfo.id}</span>
          </div>

          {/* 移除了注册时间的展示 */}
        </div>

        {isEditing && (
          <div className="edit-actions">
            <button 
              className="save-btn"
              onClick={handleSave}
            >
              保存
            </button>
            <button 
              className="cancel-btn"
              onClick={() => {
                setIsEditing(false);
                setEditedInfo(userInfo);
              }}
            >
              取消
            </button>
          </div>
        )}
      </div>

      {/* 修改密码部分 */}
      <div className="password-section">
        <div className="profile-header">
          <h3>密码管理</h3>
          {!isChangingPassword && (
            <button 
              className="edit-btn"
              onClick={() => setIsChangingPassword(true)}
            >
              修改密码
            </button>
          )}
        </div>

        {isChangingPassword ? (
          <div className="password-form">
            {passwordError && (
              <div className="error-message">
                {passwordError}
                <button onClick={() => setPasswordError(null)}>关闭</button>
              </div>
            )}
            
            {passwordSuccess && (
              <div className="success-message">
                {passwordSuccess}
                <button onClick={() => setPasswordSuccess(null)}>关闭</button>
              </div>
            )}

            <div className="detail-item">
              <label>当前密码:</label>
              <input 
                type="password" 
                value={passwordData.currentPassword} 
                onChange={(e) => setPasswordData(prev => ({...prev, currentPassword: e.target.value}))}
                placeholder="请输入当前密码"
              />
            </div>

            <div className="detail-item">
              <label>新密码:</label>
              <input 
                type="password" 
                value={passwordData.newPassword} 
                onChange={(e) => setPasswordData(prev => ({...prev, newPassword: e.target.value}))}
                placeholder="请输入新密码"
              />
            </div>

            <div className="detail-item">
              <label>确认新密码:</label>
              <input 
                type="password" 
                value={passwordData.confirmPassword} 
                onChange={(e) => setPasswordData(prev => ({...prev, confirmPassword: e.target.value}))}
                placeholder="请再次输入新密码"
              />
            </div>

            <div className="edit-actions">
              <button 
                className="save-btn"
                onClick={handleChangePassword}
              >
                确认修改
              </button>
              <button 
                className="cancel-btn"
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
              >
                取消
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* 用户偏好部分 */}
      <div className="preferences-section">
        <div className="profile-header">
          <h3>用户偏好</h3>
          {!isAddingPreference && (
            <button 
              className="edit-btn"
              onClick={() => setIsAddingPreference(true)}
            >
              添加偏好
            </button>
          )}
        </div>

        {isAddingPreference ? (
          <div className="preference-form">
            {preferenceError && (
              <div className="error-message">
                {preferenceError}
                <button onClick={() => setPreferenceError(null)}>关闭</button>
              </div>
            )}

            <div className="detail-item inline-actions">
              <label>偏好:</label>
              <div className="input-with-buttons">
                <input 
                  type="text" 
                  value={newPreference} 
                  onChange={(e) => setNewPreference(e.target.value)}
                  placeholder="请输入您的偏好"
                  maxLength={20}
                />
                <div className="inline-buttons">
                  <button 
                    className="save-btn"
                    onClick={handleAddPreference}
                  >
                    添加
                  </button>
                  <button 
                    className="cancel-btn"
                    onClick={() => {
                      setIsAddingPreference(false);
                      setNewPreference('');
                      setPreferenceError(null);
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="preferences-list">
            {userPreferences.length === 0 ? (
              <div className="empty-message">
                暂无偏好信息，点击"添加偏好"开始添加
              </div>
            ) : (
              <ul>
                {userPreferences.map((preference) => (
                  <li key={preference.id} className="preference-item">
                    <span className="preference-content">{preference.preference}</span>
                    <span className="preference-date">
                      {new Date(preference.created_at).toLocaleDateString()}
                    </span>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeletePreference(preference.id)}
                      title="删除偏好"
                    >
                      删除
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* 系统配置部分 */}
      <div className="system-config-section">
        <div className="profile-header">
          <div className="title-with-status">
            <h3>系统配置</h3>
            {!configLoading && (
              systemConfig.llmApiBaseUrl ? (
                <span className="config-status-online">配置已设置</span>
              ) : (
                <span className="config-status-offline">配置未设置</span>
              )
            )}
          </div>
          {!isEditingSystemConfig  && (
            <button 
              className="edit-btn"
              onClick={() => setIsEditingSystemConfig(true)}
            >
              编辑配置
            </button>
          )}
        </div>

        {isEditingSystemConfig && (
          <div className="system-config-form">
            {systemConfigError && (
              <div className="error-message">
                {systemConfigError}
                <button onClick={() => setSystemConfigError(null)}>关闭</button>
              </div>
            )}
            
            {systemConfigSuccess && (
              <div className="success-message">
                {systemConfigSuccess}
                <button onClick={() => setSystemConfigSuccess(null)}>关闭</button>
              </div>
            )}



            <div className="detail-item">
              <label>大语言模型 API 地址:</label>
              <input 
                type="text" 
                name="llmApiBaseUrl" 
                value={systemConfig.llmApiBaseUrl} 
                onChange={handleConfigChange}
                placeholder="请输入大语言模型 API 地址"
              />
            </div>

            <div className="detail-item">
              <label>大语言模型 API 密钥:</label>
              <input 
                type="text" 
                name="llmApiKey" 
                value={systemConfig.llmApiKey} 
                onChange={handleConfigChange}
                placeholder="请输入大语言模型 API 密钥"
              />
            </div>

            <div className="detail-item">
              <label>百度地图 API 密钥:</label>
              <input 
                type="text" 
                name="baiduMapApiKey" 
                value={systemConfig.baiduMapApiKey} 
                onChange={handleConfigChange}
                placeholder="请输入百度地图 API 密钥"
              />
            </div>

            <div className="edit-actions">
              <button 
                className="save-btn"
                onClick={handleSaveSystemConfig}
                disabled={configLoading}
              >
                {configLoading ? '保存中...' : '保存配置'}
              </button>
              <button 
                className="cancel-btn"
                onClick={() => {
                  setIsEditingSystemConfig(false);
                  setSystemConfigError(null);
                }}
              >
                取消
              </button>
            </div>
          </div>
        )}
        
        {/* {configLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner">加载中...</div>
          </div>
        )} */}
      </div>

      <div className="account-actions">
        <div className="profile-header">
          <h3>账户操作</h3>
          <button 
            className="logout-btn"
            onClick={handleLogout}
          >
            退出登录
          </button>
        </div>
        
        <div className="account-tips">
            <p>提示：请妥善保管您的账户信息，定期更新密码以保障账户安全。</p>
          </div>
      </div>
    </div>
  );
};

export default UserProfilePage;