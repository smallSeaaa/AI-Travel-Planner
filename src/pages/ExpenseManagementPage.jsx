import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import travelPlanService from '../services/travelPlanService';
import speechRecognitionService from '../services/speechRecognitionService';
import supabase from '../supabaseClient';
import '../styles/ExpenseManagementPage.css';

const ExpenseManagementPage = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [expenseItem, setExpenseItem] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState(null);
  const [recordingController, setRecordingController] = useState(null);

  // 获取用户的旅行计划
  useEffect(() => {
    if (user) {
      fetchTravelPlans();
    }
  }, [user]);

  // 当选择计划变化时，获取该计划的费用记录
  useEffect(() => {
    if (selectedPlan) {
      fetchExpenses();
    }
  }, [selectedPlan]);

  const fetchTravelPlans = async () => {
    try {
      setLoading(true);
      const response = await travelPlanService.getUserTravelPlans(user.id);
      if (response.success) {
        setPlans(response.data);
      } else {
        setError('获取旅行计划失败');
      }
    } catch (err) {
      setError('获取旅行计划出错');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      // 假设费用记录存储在expenses表中，与travel_plans关联
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('travel_plan_id', selectedPlan.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('获取费用记录失败:', error);
        // 如果表不存在或没有记录，设置为空数组
        setExpenses([]);
      } else {
        setExpenses(data);
      }
    } catch (err) {
      console.error('获取费用记录出错:', err);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (planId) => {
    console.log('选择的planId:', planId, '类型:', typeof planId);
    console.log('plans数组中的ID类型:', plans.map(p => typeof p.id));
    // 尝试使用严格相等和转换类型后比较
    let plan = plans.find(p => p.id === planId);
    
    // 如果严格相等找不到，尝试转换为相同类型后再查找
    if (!plan) {
      if (typeof planId === 'string' && !isNaN(parseInt(planId))) {
        plan = plans.find(p => p.id === parseInt(planId));
      } else if (typeof planId === 'string') {
        plan = plans.find(p => String(p.id) === planId);
      }
    }
    
    console.log('找到的计划:', plan);
    setSelectedPlan(plan);
    setError('');
    setSuccess('');
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // 只允许输入数字和小数点
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setExpenseAmount(value);
    }
  };

  const handleSaveExpense = async () => {
    if (!selectedPlan) {
      setError('请先选择旅行计划');
      return;
    }
    
    if (!expenseItem.trim()) {
      setError('请输入费用项目');
      return;
    }
    
    if (!expenseAmount || isNaN(parseFloat(expenseAmount)) || parseFloat(expenseAmount) <= 0) {
      setError('请输入有效的费用金额');
      return;
    }

    try {
      setLoading(true);
      // 保存费用记录到数据库
      const { data, error } = await supabase.from('expenses').insert({
        travel_plan_id: selectedPlan.id,
        user_id: user.id,
        item: expenseItem.trim(),
        amount: parseFloat(expenseAmount),
        created_at: new Date().toISOString()
      }).select();
      
      if (error) {
        console.error('保存费用记录失败:', error);
        // 如果是表不存在的错误，创建表（仅用于演示，实际应用中应该在后端创建）
        if (error.code === '42P01') {
          setError('费用记录表不存在，请联系管理员');
        } else {
          setError('保存费用记录失败');
        }
      } else {
        // 刷新费用列表
        await fetchExpenses();
        // 清空输入框
        setExpenseItem('');
        setExpenseAmount('');
        setSuccess('费用记录保存成功');
        // 3秒后清除成功消息
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('保存费用记录出错:', err);
      setError('保存费用记录时发生错误');
    } finally {
      setLoading(false);
    }
  };

  const startSpeechRecognition = async (type) => {
    if (!speechRecognitionService.isSpeechRecognitionSupported()) {
      setError('您的浏览器不支持语音识别功能，请使用Chrome或Edge等现代浏览器');
      return;
    }

    try {
      setIsRecording(true);
      setRecordingType(type);
      
      const controller = await speechRecognitionService.processSpeechInput();
      setRecordingController(controller);
    } catch (err) {
      console.error('语音识别启动失败:', err);
      setError('语音识别启动失败');
      setIsRecording(false);
      setRecordingType(null);
    }
  };

  const stopSpeechRecognition = async () => {
    if (!recordingController || !isRecording) return;

    try {
      const result = await recordingController.stop();
      if (result && result.originalText) {
        const recognizedText = result.originalText.trim();
        
        if (recordingType === 'item') {
          setExpenseItem(recognizedText);
        } else if (recordingType === 'amount') {
          // 尝试从识别文本中提取数字
          const amountMatch = recognizedText.match(/\d+(?:\.\d+)?/);
          if (amountMatch) {
            setExpenseAmount(amountMatch[0]);
          } else {
            // 如果没有提取到数字，直接使用识别文本
            setExpenseAmount(recognizedText);
          }
        }
        
      }
    } catch (err) {
      console.error('语音识别停止失败:', err);
      setError('语音识别处理失败');
    } finally {
      setIsRecording(false);
      setRecordingType(null);
      setRecordingController(null);
    }
  };

  return (
    <div className="expense-management-container">
      <h1>费用记录</h1>
      
      {!user ? (
        <div className="error-message">
          <p>请先登录后使用费用记录功能</p>
        </div>
      ) : (
        <div className="expense-content">
          {/* 旅行计划选择 */}
          <div className="plan-selection">
            <h2>选择旅行计划</h2>
            {loading && plans.length === 0 ? (
              <p>加载中...</p>
            ) : plans.length === 0 ? (
              <p>您还没有任何旅行计划</p>
            ) : (
              <select 
                value={selectedPlan?.id || ''} 
                onChange={(e) => handlePlanSelect(e.target.value)}
                className="plan-select"
              >
                <option value="" disabled>请选择旅行计划</option>
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.plan_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedPlan && (
            <>
              {/* 计划详情展示 */}
              <div className="plan-details">
                <h3>计划详情</h3>
                <div className="plan-info">
                  <div className="info-item">
                    <span className="info-label">计划名称：</span>
                    <span className="info-value">{selectedPlan.plan_name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">目的地：</span>
                    <span className="info-value">{selectedPlan.destination}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">旅行天数：</span>
                    <span className="info-value">{selectedPlan.duration} 天</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">人数：</span>
                    <span className="info-value">{selectedPlan.travelers || 1} 人</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">预算：</span>
                    <span className="info-value">¥{selectedPlan.budget ? selectedPlan.budget.toFixed(2) : '0.00'}</span>
                  </div>
                </div>
              </div>
              {/* 费用记录表单 */}
              <div className="expense-form">
                <h2>添加费用记录</h2>
                
                {error && (
                  <div className="error-message">
                    <p>{error}</p>
                  </div>
                )}
                
                {success && (
                  <div className="success-message">
                    <p>{success}</p>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="expenseItem">费用项目</label>
                  <div className="input-with-button">
                    <input
                      type="text"
                      id="expenseItem"
                      value={expenseItem}
                      onChange={(e) => setExpenseItem(e.target.value)}
                      placeholder="例如：午餐、门票、交通"
                    />
                    <button 
                      type="button"
                      onClick={() => isRecording && recordingType === 'item' ? stopSpeechRecognition() : startSpeechRecognition('item')}
                      className={`voice-button ${isRecording && recordingType === 'item' ? 'recording' : ''}`}
                      disabled={isRecording && recordingType !== 'item'}
                      title={isRecording && recordingType === 'item' ? '停止录音' : '开始语音输入'}
                    >
                      🎤
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="expenseAmount">费用金额 (元)</label>
                  <div className="input-with-button">
                    <input
                      type="text"
                      id="expenseAmount"
                      value={expenseAmount}
                      onChange={handleAmountChange}
                      placeholder="请输入数字金额"
                    />
                   
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleSaveExpense}
                  className="save-button"
                  disabled={loading}
                >
                  {loading ? '保存中...' : '保存费用'}
                </button>
              </div>

              {/* 费用记录列表 */}
              <div className="expenses-list">
                <h2>费用记录列表</h2>
                {expenses.length === 0 ? (
                  <p>暂无费用记录</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>费用项目</th>
                        <th>金额 (元)</th>
                        <th>记录时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map(expense => (
                        <tr key={expense.id}>
                          <td>{expense.item}</td>
                          <td>¥{expense.amount.toFixed(2)}</td>
                          <td>{new Date(expense.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpenseManagementPage;