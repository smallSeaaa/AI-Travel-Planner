import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
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

  // 获取用户信息
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 这里假设我们可以从Supabase获取更多用户信息
        // 在实际应用中，可能需要查询用户表
        const userData = {
          email: user.email,
          id: user.id
          // 移除了创建时间，不再展示
        };

        setUserInfo(userData);
        setEditedInfo(userData);
      } catch (err) {
        console.error('获取用户信息失败:', err);
        setError('获取用户信息失败');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
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

  if (loading) {
    return <div className="loading-container">加载用户信息中...</div>;
  }

  if (!user || !userInfo) {
    return <div className="error-container">未找到用户信息</div>;
  }

  return (
    <div className="user-profile-container">
      <h2>用户信息管理</h2>
      
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