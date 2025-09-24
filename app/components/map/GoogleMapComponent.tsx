'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Location, RouteSegment } from '../../post/page';

interface GoogleMapComponentProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationSelect: (location: Location | null) => void;
  routeSegments: RouteSegment[];
  isRouteConfirmed: boolean;
}

export default function GoogleMapComponent({
  locations,
  selectedLocation,
  onLocationSelect,
  routeSegments,
  isRouteConfirmed,
}: GoogleMapComponentProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapRefReady, setMapRefReady] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [segmentRenderers, setSegmentRenderers] = useState<google.maps.DirectionsRenderer[]>([]);
  const [transitPolylines, setTransitPolylines] = useState<google.maps.Polyline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routeDurations, setRouteDurations] = useState<{ [key: string]: string }>({});
  const [totalDuration, setTotalDuration] = useState<string>('');
  const [transitMessage, setTransitMessage] = useState<string>('');





  // 2点間の距離を計算（ハーバサイン公式）
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // 地球の半径（km）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // コンポーネントのマウント状況を確認と初期化
  useEffect(() => {
    console.log('GoogleMapComponent mounted');
    
    // ページリロード時や遷移時に所要時間をリセット
    setRouteDurations({});
    setTotalDuration('');
    
    return () => {
      console.log('GoogleMapComponent unmounted');
      // アンマウント時もリセット
      setRouteDurations({});
      setTotalDuration('');
    };
  }, []);

  // マップ初期化関数
  const initMap = useCallback(async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        
        console.log('API Key check:', apiKey ? 'Found' : 'Not found');
        console.log('API Key value:', apiKey?.substring(0, 10) + '...');
        
        if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
          setError('Google Maps APIキーが設定されていません。.envファイルにNEXT_PUBLIC_GOOGLE_MAPS_API_KEYを設定してください。');
          setIsLoading(false);
          return;
        }

        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
          libraries: ['places', 'geometry'],
        });

        console.log('Starting Google Maps API load...');
        await loader.load();
        console.log('Google Maps API loaded successfully');

        // mapRefの存在を確認
        console.log('Checking mapRef.current:', mapRef.current);
        console.log('mapRef type:', typeof mapRef.current);
        console.log('mapRef nodeName:', mapRef.current?.nodeName);
        
        if (!mapRef.current || !(mapRef.current instanceof HTMLDivElement)) {
          console.error('mapRef.current is null or not HTMLDivElement - retrying in 500ms');
          setTimeout(() => {
            if (mapRef.current && mapRef.current instanceof HTMLDivElement) {
              console.log('Retry: mapRef.current found, initializing map');
              initMap();
            } else {
              console.error('Retry failed: mapRef.current still null or invalid');
              setError('マップコンテナが見つかりません');
              setIsLoading(false);
            }
          }, 500);
          return;
        }

        console.log('Importing maps library...');
        const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
        console.log('Maps library imported successfully');

        console.log('Creating map instance...');
        const mapInstance = new Map(mapRef.current, {
          center: { lat: 35.6762, lng: 139.6503 }, // 東京をデフォルト
          zoom: 10,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        });

        console.log('Map instance created:', mapInstance);

        // DirectionsServiceとDirectionsRendererも新しい方法で作成
        const { DirectionsService, DirectionsRenderer } = await google.maps.importLibrary("routes") as google.maps.RoutesLibrary;
        
        const directionsServiceInstance = new DirectionsService();
        setMap(mapInstance);
        setDirectionsService(directionsServiceInstance);
        setDirectionsRenderer(new DirectionsRenderer({ suppressMarkers: true })); // 保持するがメイン描画には使わない
        
        console.log('Map initialization completed, setting loading to false');
        setIsLoading(false);
      } catch (err) {
        console.error('Google Maps APIの読み込みに失敗しました:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined
        });
        setError(`Google Maps APIの読み込みに失敗しました: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    }, []);

  // Google Maps APIを初期化
  useEffect(() => {
    console.log('useEffect triggered - mapRefReady:', mapRefReady);
    if (mapRefReady && mapRef.current) {
      console.log('mapRef is ready, calling initMap');
      initMap();
    } else {
      console.log('mapRef not ready, waiting...');
    }
  }, [mapRefReady, initMap]);

  // マーカーを更新
  useEffect(() => {
    if (!map) return;

    const updateMarkers = async () => {
      try {
        // 既存のマーカーをクリア
        markers.forEach(marker => marker.setMap(null));

        // Markerライブラリをインポート
        const { Marker } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

        const newMarkers: google.maps.Marker[] = locations.map(location => {
          const marker = new Marker({
            position: { lat: location.lat, lng: location.lng },
            map: map,
            title: location.name,
            animation: selectedLocation?.id === location.id ? google.maps.Animation.BOUNCE : undefined,
          });

          // マーカークリック時のイベント
          marker.addListener('click', () => {
            onLocationSelect(location);
          });

          // カスタムアイコン（訪問済みを示す）
          marker.setIcon({
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="#4285F4" stroke="#fff" stroke-width="2"/>
                <circle cx="16" cy="16" r="6" fill="#fff"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
          });

          return marker;
        });

        setMarkers(newMarkers);

        // マーカーが1つ以上ある場合、地図の表示範囲を調整
        if (locations.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          locations.forEach(location => {
            bounds.extend({ lat: location.lat, lng: location.lng });
          });
          map.fitBounds(bounds);
        }
      } catch (error) {
        console.error('Error updating markers:', error);
      }
    };

    updateMarkers();
  }, [map, locations, selectedLocation, onLocationSelect]);

  // ルート確定状態の変更を監視して所要時間をリセット
  useEffect(() => {
    if (!isRouteConfirmed) {
      // ルートが未確定の場合は所要時間をクリア
      setRouteDurations({});
      setTotalDuration('');
      setTransitMessage('');
    }
  }, [isRouteConfirmed]);

  // ルートを描画と所要時間を計算（ルート確定後のみ）
  useEffect(() => {
    if (!directionsService || !directionsRenderer || !isRouteConfirmed || routeSegments.length === 0) {
      setRouteDurations({});
      setTotalDuration('');
      return;
    }

    // ルート確定時に所要時間を完全にリセット
    setRouteDurations({});
    setTotalDuration('');
    setTransitMessage('');

    const calculateRouteDurations = async () => {
      // 毎回新しいオブジェクトと変数で初期化
      const durations: { [key: string]: string } = {};
      let totalMinutes = 0; // 必ず0から開始
      
      console.log('Starting route duration calculation with fresh variables');
      console.log('Route segments to calculate:', routeSegments.length);

      // 既存のセグメント描画をクリア
      segmentRenderers.forEach(r => r.setMap(null));
      transitPolylines.forEach(p => p.setMap(null));
      setSegmentRenderers([]);
      setTransitPolylines([]);

      // 各セグメントの所要時間を計算
      for (const segment of routeSegments) {
        const fromLocation = locations.find(loc => loc.id === segment.fromLocationId);
        const toLocation = locations.find(loc => loc.id === segment.toLocationId);
        
        if (!fromLocation || !toLocation) continue;

        const request: google.maps.DirectionsRequest = {
          origin: { lat: fromLocation.lat, lng: fromLocation.lng },
          destination: { lat: toLocation.lat, lng: toLocation.lng },
          travelMode: google.maps.TravelMode[segment.travelMode],
          // チュートリアルコードに基づくシンプルなtransitOptions設定
          ...(segment.travelMode === 'TRANSIT' && {
            transitOptions: {
              modes: [google.maps.TransitMode.RAIL, google.maps.TransitMode.SUBWAY, google.maps.TransitMode.TRAIN, google.maps.TransitMode.BUS],
              routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS,
            },
          }),
        };

        try {
          console.log(`Calculating route: ${fromLocation.name} → ${toLocation.name} (${segment.travelMode})`);
          
          // チュートリアルコードに基づくシンプルなDirections API使用
          console.log('Request:', request);
          let result: google.maps.DirectionsResult;
          
          if (segment.travelMode === 'TRANSIT') {
            // TRANSITの場合はGoogle Maps APIのみを使用
            console.log('[TRANSIT] Using Google Maps API for transit route calculation');
            setTransitMessage('Google Maps APIを使用してルートを計算中...');
            result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
              directionsService.route(request, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK && result) {
                  setTransitMessage('Google Maps APIを使用してルートを計算しました');
                  resolve(result);
                } else {
                  reject(new Error(`公共交通機関のルートが見つかりませんでした。徒歩や車でのルートをお試しください。`));
                }
              });
            });
          } else {
            // 徒歩・車・自転車は通常のGoogle Maps APIを使用
            result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
              directionsService.route(request, (result, status) => {
                console.log(`Route result status: ${status}`, result);
                
                if (status === google.maps.DirectionsStatus.OK && result) {
                  resolve(result);
                } else if (status === google.maps.DirectionsStatus.ZERO_RESULTS) {
                  console.log(`No route found for ${fromLocation.name} → ${toLocation.name}`);
                  reject(new Error(`No route available between ${fromLocation.name} and ${toLocation.name}. Please check the locations.`));
                } else {
                  console.error(`Directions API error: ${status}`);
                  reject(new Error(`Route calculation failed: ${status}`));
                }
              });
            });
          }

          // セグメントごとに描画
          if (map) {
            const renderer = new google.maps.DirectionsRenderer({
              map,
              suppressMarkers: true,
              preserveViewport: true,
              polylineOptions: { 
                strokeColor: segment.travelMode === 'WALKING' ? '#34a853' : 
                           segment.travelMode === 'BICYCLING' ? '#fbbc04' : 
                           segment.travelMode === 'TRANSIT' ? '#9c27b0' : '#0b57d0', 
                strokeWeight: 5 
              }
            });
            renderer.setDirections(result);
            setSegmentRenderers(prev => [...prev, renderer]);
          }

          if (result.routes && result.routes[0] && result.routes[0].legs && result.routes[0].legs[0]) {
            const duration = result.routes[0].legs[0].duration;
            const durationText = duration?.text || '0分';
            const durationValue = duration?.value || 0;
            
            // TRANSITの場合は詳細情報を含める
            if (segment.travelMode === 'TRANSIT' && result.routes[0].legs[0].steps[0].instructions) {
              const instructions = result.routes[0].legs[0].steps[0].instructions;
              durations[`${segment.fromLocationId}-${segment.toLocationId}`] = `${durationText} (${instructions})`;
            } else {
              durations[`${segment.fromLocationId}-${segment.toLocationId}`] = durationText;
            }
            
            // 異常に長い時間（24時間以上）の場合は除外
            if (durationValue < 24 * 60 * 60) { // 24時間未満の場合のみ加算
              // durationValueは秒単位なので、分に変換（秒の部分は切り捨て）
              const durationInMinutes = Math.floor(durationValue / 60);
              totalMinutes += durationInMinutes;
              console.log(`Added ${durationInMinutes} minutes (from ${durationValue} seconds) to total`);
            } else {
              console.warn(`Skipping abnormally long duration: ${durationText} (${durationValue} seconds)`);
            }
          }
        } catch (error) {
          console.error(`Error calculating route from ${fromLocation.name} to ${toLocation.name}:`, error);
          
          // エラーメッセージに基づいて表示を調整
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          if (errorMessage.includes('No transit route available')) {
            durations[`${segment.fromLocationId}-${segment.toLocationId}`] = '電車ルート未発見';
          } else if (errorMessage.includes('No route available')) {
            durations[`${segment.fromLocationId}-${segment.toLocationId}`] = 'ルート未発見';
          } else {
            durations[`${segment.fromLocationId}-${segment.toLocationId}`] = '計算エラー';
          }
        }
      }

      setRouteDurations(durations);
      
      // 総所要時間を計算
      console.log('Total minutes calculated:', totalMinutes);
      if (totalMinutes > 0) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const totalDurationText = hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
        console.log('Setting total duration:', totalDurationText);
        setTotalDuration(totalDurationText);
      } else {
        console.log('No valid durations found, clearing total duration');
        setTotalDuration('');
      }
    };

    calculateRouteDurations();

    // 全体のルートを描画（最初の移動手段を使用）
    const waypoints = locations.slice(1, -1).map(location => ({
      location: { lat: location.lat, lng: location.lng },
      stopover: true,
    }));

    const mainRequest: google.maps.DirectionsRequest = {
      origin: { lat: locations[0].lat, lng: locations[0].lng },
      destination: { lat: locations[locations.length - 1].lat, lng: locations[locations.length - 1].lng },
      waypoints: waypoints,
      travelMode: google.maps.TravelMode.DRIVING, // 全体ルートは車で表示
      optimizeWaypoints: true,
    };

    directionsService.route(mainRequest, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        directionsRenderer.setDirections(result);
      }
    });
  }, [directionsService, directionsRenderer, locations, routeSegments, isRouteConfirmed]);

  // Loading / Error はオーバーレイで表示する（マップDOMは常に描画してrefを確実にアタッチ）

  // refのコールバック関数
  const mapRefCallback = useCallback((node: HTMLDivElement | null) => {
    console.log('mapRefCallback called with node:', node);
    if (node) {
      console.log('Setting mapRef to node and marking as ready');
      mapRef.current = node;
      setMapRefReady(true);
    } else {
      console.log('Node is null, clearing mapRef');
      mapRef.current = null;
      setMapRefReady(false);
    }
  }, []);

  console.log('Rendering GoogleMapComponent - mapRefReady:', mapRefReady, 'mapRef.current:', mapRef.current);

  return (
    <div className="space-y-4">
      {/* 所要時間表示 */}
      {isRouteConfirmed && routeSegments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-black">ルート情報</h3>
            <div className="text-sm text-gray-600">
              <span className="font-medium">出発時刻: </span>
              <span className="text-blue-600">10:00</span>
            </div>
          </div>
          
          {/* 公共交通機関メッセージ */}
          {transitMessage && (
            <div className="mb-3 p-2 bg-blue-100 border border-blue-300 rounded text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <span className="text-blue-600">ℹ️</span>
                <span>{transitMessage}</span>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {Object.entries(routeDurations).map(([key, duration]) => {
              const [fromLocationId, toLocationId] = key.split('-');
              const fromLocation = locations.find(loc => loc.id === fromLocationId);
              const toLocation = locations.find(loc => loc.id === toLocationId);
              const segment = routeSegments.find(s => s.fromLocationId === fromLocationId && s.toLocationId === toLocationId);
              const travelMode = segment?.travelMode || 'WALKING';
              
              const modeLabels = {
                'WALKING': '🚶 徒歩',
                'DRIVING': '🚗 車',
                'TRANSIT': '🚃 公共交通機関',
                'BICYCLING': '🚴 自転車',
              };

              if (!fromLocation || !toLocation) return null;

              // TRANSITの場合は詳細情報を表示
              const getTransitDetails = () => {
                if (travelMode !== 'TRANSIT') return null;
                
                // ルート情報から交通機関の詳細を取得
                const routeInfo = routeDurations[`${fromLocationId}-${toLocationId}`];
                if (typeof routeInfo === 'string' && routeInfo.includes('→')) {
                  const parts = routeInfo.split('→');
                  if (parts.length >= 2) {
                    const fromPart = parts[0].trim();
                    const toPart = parts[1].trim();
                    
                    // 会社名と路線名を抽出
                    const fromMatch = fromPart.match(/([A-Za-z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)\s+([A-Za-z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/);
                    const toMatch = toPart.match(/([A-Za-z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)\s+([A-Za-z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/);
                    
                    if (fromMatch && toMatch) {
                      return {
                        fromCompany: fromMatch[1],
                        fromLine: fromMatch[2],
                        toCompany: toMatch[1],
                        toLine: toMatch[2]
                      };
                    }
                  }
                }
                return null;
              };

              const transitDetails = getTransitDetails();

              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-black">
                      <span className="font-medium">{fromLocation.name}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium">{toLocation.name}</span>
                      <span className="text-blue-600 text-xs">({modeLabels[travelMode]})</span>
                    </div>
                    <span className="font-semibold text-blue-700">{duration}</span>
                  </div>
                  
                  {transitDetails && (
                    <div className="text-xs text-gray-600 ml-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${
                          transitDetails.fromCompany === 'JR' ? 'bg-blue-600' :
                          transitDetails.fromCompany === '東京メトロ' ? 'bg-orange-500' :
                          transitDetails.fromCompany === '都営地下鉄' ? 'bg-green-600' :
                          transitDetails.fromCompany === '東急' ? 'bg-red-600' :
                          transitDetails.fromCompany === '京急' ? 'bg-blue-500' :
                          transitDetails.fromCompany === '小田急' ? 'bg-green-500' :
                          transitDetails.fromCompany === '京王' ? 'bg-purple-600' :
                          'bg-gray-600'
                        }`}>
                          {transitDetails.fromCompany} {transitDetails.fromLine}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${
                          transitDetails.toCompany === 'JR' ? 'bg-blue-600' :
                          transitDetails.toCompany === '東京メトロ' ? 'bg-orange-500' :
                          transitDetails.toCompany === '都営地下鉄' ? 'bg-green-600' :
                          transitDetails.toCompany === '東急' ? 'bg-red-600' :
                          transitDetails.toCompany === '京急' ? 'bg-blue-500' :
                          transitDetails.toCompany === '小田急' ? 'bg-green-500' :
                          transitDetails.toCompany === '京王' ? 'bg-purple-600' :
                          'bg-gray-600'
                        }`}>
                          {transitDetails.toCompany} {transitDetails.toLine}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {totalDuration && (
              <div className="border-t border-blue-200 pt-2 mt-2">
                <div className="flex items-center justify-between font-semibold text-black">
                  <span>総所要時間</span>
                  <span className="text-lg">{totalDuration}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* マップ本体 */}
      <div className="w-full h-96 rounded-lg overflow-hidden relative">
        <div 
          ref={mapRefCallback} 
          className="w-full h-full" 
          style={{ minHeight: '384px', height: '384px' }}
          id="google-map-container"
          data-testid="map-container"
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-700">Google Mapsを読み込み中...</p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-red-50/90 border border-red-200 rounded-lg flex items-center justify-center">
            <div className="text-center text-red-700">
              <p className="font-semibold mb-2">エラーが発生しました</p>
              <p className="text-sm break-words px-4">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
