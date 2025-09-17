'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/layout';
import GoogleMapComponent from '../components/map/GoogleMapComponent';
import LocationForm from '../components/map/LocationForm';
import RouteList from '../components/map/RouteList';

export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  visitedDate: string;
  description?: string;
  isTransitStation?: boolean;
}

export interface RouteSegment {
  fromLocationId: string;
  toLocationId: string;
  travelMode: 'WALKING' | 'DRIVING' | 'TRANSIT' | 'BICYCLING';
}

export default function PostPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
  const [isRouteConfirmed, setIsRouteConfirmed] = useState(false);

  // localStorageからデータを読み込み
  useEffect(() => {
    const savedLocations = localStorage.getItem('visitedLocations');
    const savedRouteSegments = localStorage.getItem('routeSegments');
    const savedRouteConfirmed = localStorage.getItem('isRouteConfirmed');
    
    if (savedLocations) {
      setLocations(JSON.parse(savedLocations));
    }
    
    // ルート関連のデータはリセット（画面リロード時に所要時間をクリア）
    setRouteSegments([]);
    setIsRouteConfirmed(false);
    localStorage.removeItem('routeSegments');
    localStorage.setItem('isRouteConfirmed', 'false');
  }, []);

  // 新しい場所を追加
  const addLocation = (location: Omit<Location, 'id'>) => {
    const newLocation: Location = {
      ...location,
      id: Date.now().toString(),
    };
    const updatedLocations = [...locations, newLocation];
    setLocations(updatedLocations);
    localStorage.setItem('visitedLocations', JSON.stringify(updatedLocations));
    
    // 場所が追加されたらルート確定状態をリセット
    setIsRouteConfirmed(false);
    setRouteSegments([]);
    localStorage.setItem('isRouteConfirmed', 'false');
    localStorage.removeItem('routeSegments');
  };

  // 場所を削除
  const deleteLocation = (id: string) => {
    const updatedLocations = locations.filter(location => location.id !== id);
    setLocations(updatedLocations);
    localStorage.setItem('visitedLocations', JSON.stringify(updatedLocations));
    
    // 削除された場所に関連するルートセグメントも削除
    const updatedRouteSegments = routeSegments.filter(
      segment => segment.fromLocationId !== id && segment.toLocationId !== id
    );
    setRouteSegments(updatedRouteSegments);
    localStorage.setItem('routeSegments', JSON.stringify(updatedRouteSegments));
    
    // ルート確定状態をリセット
    setIsRouteConfirmed(false);
    localStorage.setItem('isRouteConfirmed', 'false');
  };

  // 場所の順番を変更
  const reorderLocations = (fromIndex: number, toIndex: number) => {
    const updatedLocations = [...locations];
    const [movedLocation] = updatedLocations.splice(fromIndex, 1);
    updatedLocations.splice(toIndex, 0, movedLocation);
    setLocations(updatedLocations);
    localStorage.setItem('visitedLocations', JSON.stringify(updatedLocations));
    
    // 順番が変更されたらルート確定状態をリセット
    setIsRouteConfirmed(false);
    setRouteSegments([]);
    localStorage.setItem('isRouteConfirmed', 'false');
    localStorage.removeItem('routeSegments');
  };

  // ルート確定
  const confirmRoute = () => {
    if (locations.length < 2) return;
    
    // デフォルトで徒歩のルートセグメントを作成
    const newRouteSegments: RouteSegment[] = [];
    for (let i = 0; i < locations.length - 1; i++) {
      newRouteSegments.push({
        fromLocationId: locations[i].id,
        toLocationId: locations[i + 1].id,
        travelMode: 'WALKING',
      });
    }
    
    // ルート確定時に所要時間をリセット
    setRouteSegments([]);
    setIsRouteConfirmed(false);
    
    // 少し遅延してから新しいルートセグメントを設定（リセットを確実にするため）
    setTimeout(() => {
      setRouteSegments(newRouteSegments);
      setIsRouteConfirmed(true);
      localStorage.setItem('routeSegments', JSON.stringify(newRouteSegments));
      localStorage.setItem('isRouteConfirmed', 'true');
    }, 100);
  };

  // ルートセグメントの移動手段を更新
  const updateRouteSegment = (fromLocationId: string, toLocationId: string, travelMode: 'WALKING' | 'DRIVING' | 'TRANSIT' | 'BICYCLING') => {
    const updatedSegments = routeSegments.map(segment => 
      segment.fromLocationId === fromLocationId && segment.toLocationId === toLocationId
        ? { ...segment, travelMode }
        : segment
    );
    setRouteSegments(updatedSegments);
    localStorage.setItem('routeSegments', JSON.stringify(updatedSegments));
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            訪問した場所を記録しよう
          </h1>
          <p className="text-lg text-gray-600">
            場所を登録して、マイマップを作成
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* 左側: マップとフォーム */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                マップ
              </h2>
              <GoogleMapComponent
                locations={locations}
                selectedLocation={selectedLocation}
                onLocationSelect={setSelectedLocation}
                routeSegments={routeSegments}
                isRouteConfirmed={isRouteConfirmed}
              />
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                新しい場所を追加
              </h2>
              <LocationForm onAddLocation={addLocation} />
            </div>
          </div>

          {/* 右側: 場所リスト */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                訪問履歴 ({locations.length}件)
              </h2>
              <RouteList
                locations={locations}
                selectedLocation={selectedLocation}
                onLocationSelect={setSelectedLocation}
                onDeleteLocation={deleteLocation}
                onReorderLocations={reorderLocations}
                onConfirmRoute={confirmRoute}
                isRouteConfirmed={isRouteConfirmed}
                routeSegments={routeSegments}
                onUpdateRouteSegment={updateRouteSegment}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
