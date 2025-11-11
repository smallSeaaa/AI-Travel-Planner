import { useState, useEffect, useRef } from 'react';

const SimpleMapComponent = ({ 
  center = { lng: 116.404, lat: 39.915 }, 
  zoom = 12, 
  markers = [], 
  onPointClick = () => {} 
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const apiKey = import.meta.env.VITE_BAIDU_MAP_API_KEY;

  useEffect(() => {
    // 如果已经加载完成，直接返回
    console.log('MapComponent useEffect triggered - Initial load');
    if (mapLoaded || loadError) return;

    const initializeMap = () => {
      try {
        if (!window.BMapGL || !mapRef.current) {
          console.error('BMapGL not available or map container not ready');
          return;
        }

        console.log('Initializing map...');
        
        // 创建地图实例
        const map = new window.BMapGL.Map(mapRef.current);
        const point = new window.BMapGL.Point(center.lng, center.lat);
        
        map.centerAndZoom(point, zoom);
        map.enableScrollWheelZoom(true);

        // 添加导航控件
        const navControl = new window.BMapGL.NavigationControl();
        map.addControl(navControl);

        // 添加比例尺控件
        const scaleControl = new window.BMapGL.ScaleControl();
        map.addControl(scaleControl);

        // 添加标记
        markers.forEach((marker, index) => {
          // 确保marker和position属性存在
          if (!marker || !marker.position || typeof marker.position.lng !== 'number' || typeof marker.position.lat !== 'number') {
            console.warn('Invalid marker data:', marker);
            return;
          }
          
          const markerPoint = new window.BMapGL.Point(marker.position.lng, marker.position.lat);
          
          // 使用百度地图内置的不同颜色标记，更可靠且醒目
          // 定义不同颜色的标记样式
          const iconColors = ['red', 'blue', 'green', 'purple', 'orange'];
          const colorIndex = index % iconColors.length;
          
          // 创建不同颜色的标记点
          const markerOptions = {
            title: marker.title,
            enableDragging: false
          };
          
          // 使用百度地图内置的默认标记样式
          const bdMarker = new window.BMapGL.Marker(markerPoint, markerOptions);
          
          // 可选：使用Label来增强视觉效果，添加一个彩色圆点
          const label = new window.BMapGL.Label('', {
            position: markerPoint,
            offset: new window.BMapGL.Size(0, -20)
          });
          
          // 设置标签样式为彩色圆点
          label.setStyle({
            backgroundColor: iconColors[colorIndex],
            borderColor: iconColors[colorIndex],
            borderRadius: '50%',
            width: '12px',
            height: '12px',
            borderWidth: '2px',
            opacity: 0.9
          });
          
          mapInstanceRef.current.addOverlay(label);
          
          // 添加点击事件
          bdMarker.addEventListener('click', () => {
            onPointClick(marker);
          });
          
          map.addOverlay(bdMarker);

          // 可选：添加信息窗口
          if (marker.title || marker.description) {
            const infoWindow = new window.BMapGL.InfoWindow(
              `<div style="max-width: 200px;">
                 <h4>${marker.title || '地点'}</h4>
                 <p>${marker.description || ''}</p>
                 ${marker.address ? `<p>地址: ${marker.address}</p>` : ''}
                 ${marker.time ? `<p>时间: ${marker.time}</p>` : ''}
               </div>`,
              {
                width: 200,
                height: 100
              }
            );

            bdMarker.addEventListener('click', () => {
              map.openInfoWindow(infoWindow, markerPoint);
            });
          }
        });

        mapInstanceRef.current = map;
        setMapLoaded(true);
        console.log('Map initialized successfully');

      } catch (error) {
        console.error('Map initialization error:', error);
        setLoadError('地图初始化失败: ' + error.message);
      }
    };

    // 如果BMapGL已经存在，直接初始化
    if (window.BMapGL) {
      console.log('BMapGL already exists, initializing map directly');
      initializeMap();
      return;
    }

    // 防止重复加载
    if (window._baiduMapLoading) {
      console.log('Baidu Map is already loading, waiting...');
      return;
    }

    console.log('Loading Baidu Map API...');
    window._baiduMapLoading = true;

    // 使用百度地图官方推荐的异步加载方式
    window.baiduMapInit = function() {
      console.log('Baidu Map API callback executed');
      window._baiduMapLoading = false;
      
      // 延迟初始化确保完全加载
      setTimeout(() => {
        initializeMap();
      }, 100);
    };

    const script = document.createElement('script');
    // 使用callback参数，让百度地图在加载完成后调用我们的回调函数
    script.src = `https://api.map.baidu.com/api?v=1.0&type=webgl&ak=${apiKey}&callback=baiduMapInit`;
    script.async = true;
    
    script.onerror = (error) => {
      console.error('Failed to load Baidu Map API:', error);
      window._baiduMapLoading = false;
      setLoadError('百度地图API加载失败，请检查网络连接和AK配置');
    };

    document.head.appendChild(script);

    // 设置超时保护
    const timeoutId = setTimeout(() => {
      if (!mapLoaded && !window.BMapGL) {
        console.error('Map loading timeout');
        setLoadError('地图加载超时，请重试');
        window._baiduMapLoading = false;
      }
    }, 10000);

    // 清理函数
    return () => {
      clearTimeout(timeoutId);
      // 清理回调函数
      delete window.baiduMapInit;
    };
  }, [apiKey, center, zoom, markers, onPointClick, mapLoaded, loadError]);
  
  // 监听markers变化
  useEffect(() => {
    console.log('MapComponent markers updated:', markers);
    if (mapLoaded && mapInstanceRef.current) {
      // 清除旧的标记
      mapInstanceRef.current.clearOverlays();
      
      if (markers.length > 0) {
        console.log('Map instance exists, updating center and markers');
        
        // 添加新的标记
        markers.forEach((marker, index) => {
          // 确保marker和position属性存在
          if (!marker || !marker.position || typeof marker.position.lng !== 'number' || typeof marker.position.lat !== 'number') {
            console.warn('Invalid marker data:', marker);
            return;
          }
          
          const markerPoint = new window.BMapGL.Point(marker.position.lng, marker.position.lat);
          
          // 使用百度地图内置的不同颜色标记，更可靠且醒目
          // 定义不同颜色的标记样式
          const iconColors = ['red', 'blue', 'green', 'purple', 'orange'];
          const colorIndex = index % iconColors.length;
          
          // 创建不同颜色的标记点
          const markerOptions = {
            title: marker.title,
            enableDragging: false
          };
          
          // 使用百度地图内置的默认标记样式
          const bdMarker = new window.BMapGL.Marker(markerPoint, markerOptions);
          
          // 使用Label来增强视觉效果，添加一个彩色圆点
          const label = new window.BMapGL.Label('', {
            position: markerPoint,
            offset: new window.BMapGL.Size(0, -20)
          });
          
          // 设置标签样式为彩色圆点
          label.setStyle({
            backgroundColor: iconColors[colorIndex],
            borderColor: iconColors[colorIndex],
            borderRadius: '50%',
            width: '12px',
            height: '12px',
            borderWidth: '2px',
            opacity: 0.9
          });
          
          mapInstanceRef.current.addOverlay(label);
          
          // 添加点击事件
          bdMarker.addEventListener('click', () => {
            onPointClick(marker);
          });
          
          // 添加信息窗口
          if (marker.title || marker.description) {
            const infoWindow = new window.BMapGL.InfoWindow(
              `<div style="max-width: 200px;">
                 <h4>${marker.title || '地点'}</h4>
                 <p>${marker.description || ''}</p>
                 ${marker.address ? `<p>地址: ${marker.address}</p>` : ''}
                 ${marker.time ? `<p>时间: ${marker.time}</p>` : ''}
               </div>`,
              {
                width: 200,
                height: 100
              }
            );

            bdMarker.addEventListener('click', () => {
              mapInstanceRef.current.openInfoWindow(infoWindow, markerPoint);
            });
          }
          
          mapInstanceRef.current.addOverlay(bdMarker);
        });
        
        // 自动调整地图中心到第一个标记点
        const firstMarker = markers[0];
        if (firstMarker && firstMarker.position) {
          const point = new window.BMapGL.Point(firstMarker.position.lng, firstMarker.position.lat);
          mapInstanceRef.current.centerAndZoom(point, 15); // 缩放到合适的级别
        }
      }
    }
  }, [markers, mapLoaded, onPointClick]);

  const handleRetry = () => {
    setMapLoaded(false);
    setLoadError(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.destroy();
      mapInstanceRef.current = null;
    }
    // 清理加载状态
    window._baiduMapLoading = false;
  };

  if (loadError) {
    return (
      <div style={{ 
        height: '100%', 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        flexDirection: 'column',
        background: '#f5f5f5'
      }}>
        <div style={{ color: '#ff4d4f', marginBottom: '16px', textAlign: 'center' }}>
          {loadError}
          <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
            AK: {apiKey ? `${apiKey.substring(0, 8)}...` : '未配置'}
          </div>
        </div>
        <button 
          onClick={handleRetry}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#1890ff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          重试加载
        </button>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <div 
        ref={mapRef} 
        style={{ 
          height: '100%', 
          width: '100%',
          background: '#f5f5f5'
        }}
      />
      
      {!mapLoaded && (
        <div style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          background: 'rgba(255,255,255,0.8)',
          zIndex: 1000
        }}>
          <div style={{ textAlign: 'center' }}>
            <div>地图加载中...</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
              首次加载可能需要几秒钟
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleMapComponent;