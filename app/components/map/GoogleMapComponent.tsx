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

  // Routes API v2を使用して電車ルートを計算する関数
  const calculateTransitRouteWithRoutesAPI = async (fromLocation: Location, toLocation: Location): Promise<google.maps.DirectionsResult> => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_ROUTES_MAP_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google Maps API key is not configured');
    }

    // 近傍の公共交通機関の駅を検索して、駅の中心点にスナップする
    const findNearestTransitStation = async (lat: number, lng: number): Promise<{ lat: number; lng: number; name?: string; placeId?: string } | null> => {
      try {
        // PlacesServiceは任意のHTMLElementで初期化可能
        const dummy = document.createElement('div');
        const placesService = new google.maps.places.PlacesService(dummy);

        const location = new google.maps.LatLng(lat, lng);

        const search = (type: string) => new Promise<google.maps.places.PlaceResult[] | null>((resolve) => {
          placesService.nearbySearch(
            {
              location,
              rankBy: google.maps.places.RankBy.DISTANCE,
              type: type as any,
              // rankBy=DISTANCEのときはradiusは指定しない
            },
            (results, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                resolve(results);
              } else {
                resolve(null);
              }
            }
          );
        });

        // transit_station → train_station → subway_station の順で検索
        const resultList = (await search('transit_station')) || (await search('train_station')) || (await search('subway_station'));
        if (resultList && resultList[0] && resultList[0].geometry && resultList[0].geometry.location) {
          const pos = resultList[0].geometry.location;
          return { lat: pos.lat(), lng: pos.lng(), name: resultList[0].name, placeId: resultList[0].place_id };
        }
        return null;
      } catch (e) {
        console.warn('findNearestTransitStation failed, fallback to original point', e);
        return null;
      }
    };

    // 現在時刻から5分後をUTC形式で設定（過去判定回避）
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const departureTime = now.toISOString();

    // 駅中心点へスナップ（見つからなければ元の座標を使用）
    const fromSnap = await findNearestTransitStation(fromLocation.lat, fromLocation.lng);
    const toSnap = await findNearestTransitStation(toLocation.lat, toLocation.lng);

    const fromLat = fromSnap?.lat ?? fromLocation.lat;
    const fromLng = fromSnap?.lng ?? fromLocation.lng;
    const toLat = toSnap?.lat ?? toLocation.lat;
    const toLng = toSnap?.lng ?? toLocation.lng;

    console.log('[TRANSIT] Input summary', {
      fromLocation,
      toLocation,
      departureTime,
      snapped: {
        from: { lat: fromLat, lng: fromLng, placeId: (fromSnap as any)?.placeId, name: fromSnap?.name },
        to: { lat: toLat, lng: toLng, placeId: (toSnap as any)?.placeId, name: toSnap?.name },
      }
    });

    const buildRequestBody = (
      oLat: number,
      oLng: number,
      dLat: number,
      dLng: number,
      relax: boolean,
      originPlaceId?: string,
      destinationPlaceId?: string,
    ) => ({
      origin: originPlaceId ? { placeId: originPlaceId } : { location: { latLng: { latitude: oLat, longitude: oLng } } },
      destination: destinationPlaceId ? { placeId: destinationPlaceId } : { location: { latLng: { latitude: dLat, longitude: dLng } } },
      travelMode: 'TRANSIT',
      computeAlternativeRoutes: true,
      departureTime: departureTime, // 必須フィールドを追加
      // 緩和リトライ時のみ緩やかな指定を付ける
      ...(relax && {
        transitPreferences: {
          routingPreference: 'LESS_WALKING',
          allowedTravelModes: ['TRAIN', 'SUBWAY', 'RAIL', 'BUS']
        }
      })
    });

    try {
      // 1) placeId（駅）優先 → 2) 駅スナップ座標 → 3) 元座標 → 4) 緩和オプション
      const tryRequests = [
        buildRequestBody(fromLat, fromLng, toLat, toLng, false, fromSnap?.placeId, toSnap?.placeId),
        buildRequestBody(fromLat, fromLng, toLat, toLng, false),
        buildRequestBody(fromLocation.lat, fromLocation.lng, toLocation.lat, toLocation.lng, false),
        buildRequestBody(fromLat, fromLng, toLat, toLng, true, fromSnap?.placeId, toSnap?.placeId)
      ];

      let data: any | null = null;
      const debugResponses: Array<{attempt: number; status: number; body: any}> = [];
      for (const reqBody of tryRequests) {
        const attemptIndex = tryRequests.indexOf(reqBody) + 1;
        console.log(`[TRANSIT] Routes API v2 request (attempt ${attemptIndex})`, reqBody);
        const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
            // デバッグのため全体像を取得
            'X-Goog-FieldMask': 'routes,geocodingResults'
        },
          body: JSON.stringify(reqBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[TRANSIT] Routes API v2 error (attempt ${attemptIndex})`, response.status, errorText);
          debugResponses.push({ attempt: attemptIndex, status: response.status, body: errorText });
          // 403/400は即中断
          if (response.status === 403) throw new Error('Routes API v2 is not enabled or API key is invalid. Please check Google Cloud Console settings.');
          if (response.status === 400) throw new Error('Invalid request to Routes API v2. Please check request parameters.');
          continue;
        }

        data = await response.json();
        console.log(`[TRANSIT] Routes API v2 response (attempt ${attemptIndex})`, data);
        debugResponses.push({ attempt: attemptIndex, status: 200, body: data });
        if (data.routes && data.routes.length > 0) break; // 何か返ったら採用
      }

      // Routes API v2のレスポンスをDirections APIの形式に変換
      if (data && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        if (route.legs && route.legs.length > 0) {
          const leg = route.legs[0];
          
          // 時間の変換（Routes API v2は秒単位で返す）
          const durationSeconds = leg.duration ? parseInt(leg.duration.replace('s', '')) : 0;
          const durationMinutes = Math.floor(durationSeconds / 60);
          const durationText = durationMinutes > 0 ? `${durationMinutes}分` : '1分未満';
          
          // 距離の変換（メートル単位）
          const distanceMeters = leg.distanceMeters || 0;
          const distanceText = distanceMeters > 1000 ? `${Math.round(distanceMeters / 1000 * 10) / 10}km` : `${distanceMeters}m`;
          
          // TRANSITのポリラインを描画（あれば）
          try {
            if (map) {
              // ルート全体のポリラインがあれば優先
              const encodedWhole = route.polyline?.encodedPolyline;
              const encodedSteps = (leg.steps || []).map((s: any) => s.polyline?.encodedPolyline).filter(Boolean);
              const polylinesToDraw: string[] = encodedWhole ? [encodedWhole] : encodedSteps;

              polylinesToDraw.forEach(encoded => {
                try {
                  const path = google.maps.geometry.encoding.decodePath(encoded);
                  const polyline = new google.maps.Polyline({
                    map,
                    path,
                    strokeColor: '#9c27b0',
                    strokeOpacity: 0.9,
                    strokeWeight: 5,
                  });
                  setTransitPolylines(prev => [...prev, polyline]);
                } catch (e) {
                  console.warn('Failed to decode and draw transit polyline', e);
                }
              });
            }
          } catch (e) {
            console.warn('Transit polyline draw skipped', e);
          }

          // Directions APIの形式に変換
          const directionsResult: google.maps.DirectionsResult = {
            request: {} as google.maps.DirectionsRequest,
            routes: [{
              legs: [{
                duration: {
                  text: durationText,
                  value: durationSeconds
                },
                distance: {
                  text: distanceText,
                  value: distanceMeters
                },
                start_address: fromLocation.name,
                end_address: toLocation.name,
                start_location: new google.maps.LatLng(fromLocation.lat, fromLocation.lng),
                end_location: new google.maps.LatLng(toLocation.lat, toLocation.lng),
                steps: leg.steps || [],
                traffic_speed_entry: [],
                via_waypoints: []
              }],
              overview_path: [],
              overview_polyline: '',
              bounds: new google.maps.LatLngBounds(),
              copyrights: '',
              warnings: [],
              waypoint_order: [],
              summary: '',
              fare: undefined
            }],
            geocoded_waypoints: []
          };
          
          return directionsResult;
        }
      }
      
      // ここまで到達したらルート未発見として通知（UI側は「電車ルート未発見」を表示）
      console.warn('[TRANSIT] All attempts returned no routes. Debug dump:', debugResponses);
      throw new Error('No transit route available');
    } catch (error) {
      console.error('Routes API v2 error:', error);
      throw error;
    }
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
          // 電車ルートの場合は追加オプションを設定
          ...(segment.travelMode === 'TRANSIT' && {
            transitOptions: {
              modes: [google.maps.TransitMode.RAIL, google.maps.TransitMode.SUBWAY, google.maps.TransitMode.TRAIN, google.maps.TransitMode.BUS],
              routingPreference: google.maps.TransitRoutePreference.LESS_WALKING,
            },
          }),
        };

        try {
          console.log(`Calculating route: ${fromLocation.name} → ${toLocation.name} (${segment.travelMode})`);
          
          let result: google.maps.DirectionsResult;
          
          if (segment.travelMode === 'TRANSIT') {
            // Routes API v2を使用して電車ルートを取得
            result = await calculateTransitRouteWithRoutesAPI(fromLocation, toLocation);
            console.log('Successfully used Routes API v2 for transit route calculation');
          } else {
            // 徒歩・車・自転車は従来のDirections APIを使用
            console.log('Request:', request);
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

            // 非TRANSITはセグメントごとに描画
            if (map) {
              const renderer = new google.maps.DirectionsRenderer({
                map,
                suppressMarkers: true,
                preserveViewport: true,
                polylineOptions: { strokeColor: segment.travelMode === 'WALKING' ? '#34a853' : segment.travelMode === 'BICYCLING' ? '#fbbc04' : '#0b57d0', strokeWeight: 5 }
              });
              renderer.setDirections(result);
              setSegmentRenderers(prev => [...prev, renderer]);
            }
          }

          if (result.routes && result.routes[0] && result.routes[0].legs && result.routes[0].legs[0]) {
            const duration = result.routes[0].legs[0].duration;
            const durationText = duration?.text || '0分';
            const durationValue = duration?.value || 0;
            
            durations[`${segment.fromLocationId}-${segment.toLocationId}`] = durationText;
            
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
          <h3 className="font-semibold text-black mb-2">ルート情報</h3>
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
                'TRANSIT': '🚃 電車',
                'BICYCLING': '🚴 自転車',
              };

              if (!fromLocation || !toLocation) return null;

              return (
                <div key={key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-black">
                    <span className="font-medium">{fromLocation.name}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium">{toLocation.name}</span>
                    <span className="text-blue-600 text-xs">({modeLabels[travelMode]})</span>
                  </div>
                  <span className="font-semibold text-blue-700">{duration}</span>
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
