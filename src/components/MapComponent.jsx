import { useState, useEffect, useRef } from 'react';
import { getUserSystemConfig } from '../services/systemConfigService';

const SimpleMapComponent = ({ 
  center = { lng: 116.404, lat: 39.915 }, 
  zoom = 12, 
  markers = [], 
  routes = [],
  onPointClick = () => {} 
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeServiceRef = useRef(null); // 用于存储路线服务实例
  const routeOverlaysRef = useRef([]); // 用于存储路线覆盖物引用

  // 加载系统配置获取百度地图API密钥
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setConfigLoading(true);
        const result = await getUserSystemConfig();
        console.log('获取系统配置结果:', result);
        if (result.success && result.data && result.data.baiduMapApiKey) {
          setApiKey(result.data.baiduMapApiKey);
          console.log('成功设置百度地图API密钥');
        } else {
          console.error('百度地图API密钥未配置或获取失败:', result.error || '无配置数据');
          setLoadError('百度地图API密钥未配置，请在系统设置中配置');
        }
      } catch (error) {
        console.error('加载系统配置失败:', error);
        setLoadError('加载系统配置失败: ' + error.message);
      } finally {
        setConfigLoading(false);
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    // 如果配置还在加载中，或者已经加载完成，或者有错误，直接返回
    console.log('MapComponent useEffect triggered - Initial load');
    if (configLoading || mapLoaded || loadError || !apiKey) return;

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
          
          map.addOverlay(label);
          
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

        // 初始化路线服务
        if (window.BMapGL.DrivingRoute) {
          routeServiceRef.current = new window.BMapGL.DrivingRoute(map, {
            renderOptions: {
              map: map,
              autoViewport: true,
              policy: window.BMAP_DRIVING_POLICY_LEAST_TIME // 最快路线
            },
            onSearchComplete: (results) => {
              console.log('Route search complete:', results);
              if (routeServiceRef.current.getStatus() === window.BMAP_STATUS_SUCCESS) {
                console.log('Route found successfully');
              } else {
                console.error('Route search failed with status:', routeServiceRef.current.getStatus());
              }
            },
            onPolylinesSet: (routes, route) => {
              console.log('Route polyline set, adding to overlays ref');
              // 保存路线覆盖物引用以便后续清除
              routes.forEach(route => {
                routeOverlaysRef.current.push(route);
              });
            }
          });
        }

        // 绘制路线
        renderRoutes(map, routes);

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
      setLoadError('百度地图API加载失败，请检查网络连接和API密钥配置');
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
  }, [apiKey, center, zoom, markers, routes, onPointClick, mapLoaded, loadError, configLoading]);
  
  // 绘制路线的函数
  const renderRoutes = (map, routesList) => {
    if (!window.BMapGL || !map || !routesList || routesList.length === 0) return;
    
    // 清除之前的路线覆盖物
    clearRouteOverlays();
    
    routesList.forEach((route) => {
      try {
        // 处理起点终点格式的路线（routeInfo）
        if (route.start && route.end) {
          console.log('Rendering route with start and end points:', route);
          
          // 创建起点标记
          const startPoint = new window.BMapGL.Point(route.start.lng, route.start.lat);
          const startMarker = new window.BMapGL.Marker(startPoint, {
            title: route.start.name || '起点'
          });
          
          // 设置起点样式为绿色
          const startLabel = new window.BMapGL.Label('起点', {
            position: startPoint,
            offset: new window.BMapGL.Size(-10, -30)
          });
          startLabel.setStyle({
            backgroundColor: 'green',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            border: 'none'
          });
          map.addOverlay(startLabel);
          map.addOverlay(startMarker);
          
          // 创建终点标记
          const endPoint = new window.BMapGL.Point(route.end.lng, route.end.lat);
          const endMarker = new window.BMapGL.Marker(endPoint, {
            title: route.end.name || '终点'
          });
          
          // 设置终点样式为红色
          const endLabel = new window.BMapGL.Label('终点', {
            position: endPoint,
            offset: new window.BMapGL.Size(-10, -30)
          });
          endLabel.setStyle({
            backgroundColor: 'red',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            border: 'none'
          });
          map.addOverlay(endLabel);
          map.addOverlay(endMarker);
          
          // 使用百度地图导航API获取真实路线
          if (routeServiceRef.current) {
            console.log('Searching for driving route using Baidu Map API');
            routeServiceRef.current.search(startPoint, endPoint);
          } else {
            // 如果路线服务不可用，回退到简单的直线连接
            console.warn('Route service not available, falling back to simple polyline');
            const points = [startPoint, endPoint];
            const polyline = new window.BMapGL.Polyline(points, {
              strokeColor: "blue",
              strokeWeight: 5,
              strokeOpacity: 0.8
            });
            map.addOverlay(polyline);
            
            // 保存覆盖物引用
            routeOverlaysRef.current.push(polyline);
          }
          
          // 调整地图视野以显示整个路线
          const view = new window.BMapGL.Viewport([startPoint, endPoint], map);
          view.setZoom(14); // 设置一个合适的缩放级别
          
        } else if (route.points && route.points.length > 1) {
          // 处理普通多点路线
          console.log('Rendering multi-point route:', route);
          
          const points = route.points.map(point => 
            new window.BMapGL.Point(point.lng, point.lat)
          );
          
          // 创建路线
          const polyline = new window.BMapGL.Polyline(points, {
            strokeColor: "blue",
            strokeWeight: 5,
            strokeOpacity: 0.8
          });
          map.addOverlay(polyline);
          
          // 保存覆盖物引用
          routeOverlaysRef.current.push(polyline);
        }
      } catch (error) {
        console.error('Error rendering route:', error, 'Route data:', route);
      }
    });
  };
  
  // 清除路线覆盖物
  const clearRouteOverlays = () => {
    if (routeOverlaysRef.current.length > 0) {
      console.log('Clearing route overlays');
      routeOverlaysRef.current.forEach(overlay => {
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.removeOverlay(overlay);
          } catch (error) {
            console.warn('Error removing overlay:', error);
          }
        }
      });
      routeOverlaysRef.current = [];
    }
    
    // 如果路线服务存在，重置它
    if (routeServiceRef.current) {
      routeServiceRef.current.clearResults();
    }
  };

  // 监听markers和routes变化
  useEffect(() => {
    console.log('MapComponent markers or routes updated:', { markers, routes });
    if (mapLoaded && mapInstanceRef.current) {
      // 清除旧的标记和路线
      mapInstanceRef.current.clearOverlays();
      
      if (markers.length > 0 || routes.length > 0) {
        console.log('Map instance exists, updating markers and routes');
        
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
        
        // 绘制路线
        renderRoutes(mapInstanceRef.current, routes);
        
        // 如果没有路线，自动调整地图中心到第一个标记点
        if (routes.length === 0 && markers.length > 0) {
          const firstMarker = markers[0];
          if (firstMarker && firstMarker.position) {
            const point = new window.BMapGL.Point(firstMarker.position.lng, firstMarker.position.lat);
            mapInstanceRef.current.centerAndZoom(point, 15); // 缩放到合适的级别
          }
        }
      }
    }
  }, [markers, routes, mapLoaded, onPointClick]);

  const handleRetry = () => {
    setMapLoaded(false);
    setLoadError(null);
    // 重新加载配置
    const loadConfig = async () => {
      try {
        setConfigLoading(true);
        const result = await getUserSystemConfig();
        console.log('重试获取系统配置结果:', result);
        if (result.success && result.data && result.data.baiduMapApiKey) {
          setApiKey(result.data.baiduMapApiKey);
        } else {
          setLoadError('百度地图API密钥未配置，请在系统设置中配置');
        }
      } catch (error) {
        setLoadError('加载系统配置失败: ' + error.message);
      } finally {
        setConfigLoading(false);
      }
    };
    loadConfig();
    
    if (mapInstanceRef.current) {
      mapInstanceRef.current.destroy();
      mapInstanceRef.current = null;
    }
    // 清理加载状态和路线覆盖物
    window._baiduMapLoading = false;
    routeOverlaysRef.current = [];
    routeServiceRef.current = null;
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
              API密钥: {apiKey ? `${apiKey.substring(0, 8)}...` : '未配置'}
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
      
      {/* 中国地点选择提示 */}
      {mapLoaded && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '8px 12px',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          fontSize: '12px',
          color: '#1890ff',
          zIndex: 999,
          maxWidth: '200px'
        }}>
          💡 提示：请选择中国境内的地点以获得最佳导航体验
        </div>
      )}
      
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
            <div>{configLoading ? '加载配置中...' : '地图加载中...'}</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
              {configLoading ? '正在获取API密钥配置' : '首次加载可能需要几秒钟'}
            </div>
            <div style={{ fontSize: '12px', color: '#1890ff', marginTop: '8px', fontWeight: 'bold' }}>
              提示：当前地图功能主要支持中国地区的定位和导航
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleMapComponent;