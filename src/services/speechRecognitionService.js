/**
 * 浏览器语音识别服务
 * 提供基于Web Speech API的语音识别和旅行信息提取功能
 */

// 检查浏览器是否支持Web Speech API
const isSpeechRecognitionSupported = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

// 获取SpeechRecognition构造函数
const getSpeechRecognition = () => {
  return window.webkitSpeechRecognition || window.SpeechRecognition;
};

// 使用浏览器内置的Web Speech API进行语音识别和录音
const recognizeSpeech = async () => {
  try {
    console.log('开始语音识别处理');
    
    // 检查浏览器是否支持Web Speech API
    if (!isSpeechRecognitionSupported()) {
      throw new Error('您的浏览器不支持语音识别功能，请使用Chrome或Edge等现代浏览器');
    }
    
    console.log('使用浏览器内置的Web Speech API进行语音识别');
    
    // 创建一个Promise来处理语音识别结果
    return new Promise((resolve, reject) => {
      const SpeechRecognition = getSpeechRecognition();
      const recognition = new SpeechRecognition();
      
      // 配置语音识别参数
      recognition.continuous = false;
      recognition.interimResults = true; // 启用中间结果，有助于完整识别
      recognition.lang = 'zh-CN'; // 设置为中文
      recognition.maxAlternatives = 1;
      
      // 处理识别结果
      recognition.onresult = (event) => {
        console.log('语音识别事件触发，结果:', event);
        const last = event.results.length - 1;
        
        // 检查是否是最终结果，只有最终结果才使用
        if (event.results[last].isFinal) {
          const recognizedText = event.results[last][0].transcript;
          console.log('语音识别成功，最终结果:', recognizedText);
          resolve(recognizedText);
        }
      };
      
      // 处理错误
      recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        // 如果是'no-speech'错误（用户没有说话），不应该抛出错误，而是返回空结果
        if (event.error === 'no-speech') {
          resolve({ originalText: '' });
        } else {
          reject(new Error(`语音识别失败: ${event.error}`));
        }
      };
      
      // 处理结束事件
      recognition.onend = () => {
        console.log('语音识别过程结束');
      };
      
      // 开始识别
      recognition.start();
      console.log('语音识别已开始，请讲话...');
    });
  } catch (error) {
    console.error('语音识别错误:', error);
    throw error;
  }
};



// 保留原有的startRecording函数以确保向后兼容，但直接使用Web Speech API
const startRecording = async () => {
  try {
    console.log('开始录音（直接使用Web Speech API）');
    
    // 检查浏览器是否支持Web Speech API
    if (!isSpeechRecognitionSupported()) {
      throw new Error('您的浏览器不支持语音识别功能，请使用Chrome或Edge等现代浏览器');
    }
    
    // 直接使用Web Speech API进行录音和识别
    const SpeechRecognition = getSpeechRecognition();
    const recognition = new SpeechRecognition();
    
    // 配置
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'zh-CN';
    
    // 开始识别（录音）
    recognition.start();
    console.log('录音已开始，请讲话...');
    
    // 返回兼容的控制对象
    return {
      mediaRecorder: { state: 'recording' },
      stop: async () => {
        recognition.stop();
        console.log('录音已停止');
        // 返回一个空的Blob以保持兼容性
        return new Blob([], { type: 'audio/webm' });
      }
    };
  } catch (error) {
    console.error('录音启动错误:', error);
    throw error;
  }
};

// 语音输入完整流程
export const processSpeechInput = async () => {
  let recognition = null;
  let isRecognizing = false;
  
  try {
    console.log('语音输入处理流程开始');
    
    // 检查浏览器是否支持Web Speech API
    if (!isSpeechRecognitionSupported()) {
      throw new Error('您的浏览器不支持语音识别功能，请使用Chrome或Edge等现代浏览器');
    }
    
    // 直接使用Web Speech API，无需单独的录音步骤
    const SpeechRecognition = getSpeechRecognition();
    recognition = new SpeechRecognition();
    
    // 配置语音识别参数
      recognition.continuous = false;
      recognition.interimResults = true; // 启用中间结果，有助于完整识别
      recognition.lang = 'zh-CN'; // 设置为中文
      recognition.maxAlternatives = 1;
    
    // 开始识别（第一次点击就开始）
    recognition.start();
    isRecognizing = true;
    console.log('语音识别已开始，请讲话...');
    
    // 创建一个Promise来处理语音识别结果
    const recognitionPromise = new Promise((resolve, reject) => {
      recognition.onresult = (event) => {
        console.log('语音识别事件触发，结果:', event);
        const last = event.results.length - 1;
        
        // 检查是否是最终结果，只有最终结果才处理
        if (event.results[last].isFinal) {
          const recognizedText = event.results[last][0].transcript;
          console.log('语音识别成功，最终结果:', recognizedText);
          
          // 只返回原始识别文本，不进行解析
          resolve({
            originalText: recognizedText
          });
        }
      };
      
      recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        // 如果是'no-speech'错误（用户没有说话），不应该抛出错误，而是返回空结果
        if (event.error === 'no-speech') {
          resolve({ originalText: '' });
        } else {
          reject(new Error(`语音识别失败: ${event.error}`));
        }
      };
      
      recognition.onend = () => {
        console.log('语音识别过程结束');
        isRecognizing = false;
      };
    });
    
    // 返回控制对象
    return {
      stop: async () => {
        if (recognition && isRecognizing) {
          console.log('正在停止语音识别...');
          recognition.stop();
          isRecognizing = false;
          
          try {
            // 等待识别完成
            const result = await recognitionPromise;
            console.log('语音识别处理完成');
            return result;
          } catch (err) {
            console.error('语音识别处理错误:', err);
            throw new Error(`语音识别处理失败: ${err.message}`);
          }
        }
        throw new Error('语音识别未开始');
      },
      isRecording: () => isRecognizing
    };
  } catch (error) {
    console.error('语音处理错误:', error);
    // 如果已经开始识别，尝试停止
    if (recognition && isRecognizing) {
      try {
        recognition.stop();
      } catch (e) {
        console.error('停止语音识别时出错:', e);
      }
    }
    throw error;
  }
};

// 导出服务函数
export default {
  recognizeSpeech,
  startRecording,
  processSpeechInput,
  isSpeechRecognitionSupported
};