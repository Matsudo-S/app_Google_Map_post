'use client';

import React, { useState } from 'react';
import { Location, RouteSegment } from '../../post/page';

interface RouteListProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationSelect: (location: Location | null) => void;
  onDeleteLocation: (id: string) => void;
  onReorderLocations: (fromIndex: number, toIndex: number) => void;
  onConfirmRoute: () => void;
  isRouteConfirmed: boolean;
  routeSegments: RouteSegment[];
  onUpdateRouteSegment: (fromLocationId: string, toLocationId: string, travelMode: 'WALKING' | 'DRIVING' | 'TRANSIT' | 'BICYCLING') => void;
}

export default function RouteList({
  locations,
  selectedLocation,
  onLocationSelect,
  onDeleteLocation,
  onReorderLocations,
  onConfirmRoute,
  isRouteConfirmed,
  routeSegments,
  onUpdateRouteSegment,
}: RouteListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showRouteConfirmation, setShowRouteConfirmation] = useState(false);

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  // ドラッグリーブ
  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  // ドロップ
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorderLocations(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // ルート確定ボタンクリック
  const handleConfirmRouteClick = () => {
    setShowRouteConfirmation(true);
  };

  // ルート確定確認
  const handleRouteConfirmation = (confirmed: boolean) => {
    setShowRouteConfirmation(false);
    if (confirmed) {
      onConfirmRoute();
    }
  };

  // 移動手段のラベル
  const getTravelModeLabel = (mode: string) => {
    const labels = {
      'WALKING': '🚶 徒歩',
      'DRIVING': '🚗 車',
      'TRANSIT': '🚃 電車',
      'BICYCLING': '🚴 自転車',
    };
    return labels[mode as keyof typeof labels] || mode;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // 確認ダイアログを表示せず即時削除
    onDeleteLocation(id);
  };

  if (locations.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-gray-500">まだ訪問した場所がありません</p>
        <p className="text-sm text-gray-400 mt-1">左側のフォームから場所を追加してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ルート確定ボタン */}
      {locations.length >= 2 && !isRouteConfirmed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-center">
            <p className="text-sm text-black mb-3">
              場所の順番を決めたら、ルートを確定してください
            </p>
            <button
              onClick={handleConfirmRouteClick}
              className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 transition-colors"
            >
              ルート決定
            </button>
          </div>
        </div>
      )}

      {/* ルート確定確認ダイアログ */}
      {showRouteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ルート確定</h3>
            <p className="text-gray-600 mb-6">
              選択したルートで良いですか？<br />
              次に各地点への移動手段を選択します。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleRouteConfirmation(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                閉じる
              </button>
              <button
                onClick={() => handleRouteConfirmation(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ルートセグメント編集 */}
      {isRouteConfirmed && routeSegments.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-black mb-3">移動手段を設定</h3>
          <div className="space-y-3">
            {routeSegments.map((segment, index) => {
              const fromLocation = locations.find(loc => loc.id === segment.fromLocationId);
              const toLocation = locations.find(loc => loc.id === segment.toLocationId);
              
              if (!fromLocation || !toLocation) return null;

              return (
                <div key={`${segment.fromLocationId}-${segment.toLocationId}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-black">
                    <span className="font-medium">{fromLocation.name}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium">{toLocation.name}</span>
                  </div>
                  <select
                    value={segment.travelMode}
                    onChange={(e) => onUpdateRouteSegment(segment.fromLocationId, segment.toLocationId, e.target.value as any)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 text-black"
                  >
                    <option value="WALKING">🚶 徒歩</option>
                    <option value="DRIVING">🚗 車</option>
                    <option value="TRANSIT">🚃 電車</option>
                    <option value="BICYCLING">🚴 自転車</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 場所リスト */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {locations.map((location, index) => (
          <div
            key={location.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
              selectedLocation?.id === location.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            } ${
              draggedIndex === index
                ? 'opacity-50 scale-95'
                : ''
            } ${
              dragOverIndex === index && draggedIndex !== index
                ? 'border-blue-400 bg-blue-25'
                : ''
            }`}
            onClick={() => onLocationSelect(location)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold text-white bg-blue-500 rounded-full">
                    {index + 1}
                  </span>
                  <h3 className="font-semibold text-gray-900 truncate">
                    {location.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-gray-600 mb-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                  <span className="text-xs">ドラッグで順番変更</span>
                </div>
                
                <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                  {location.address}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-gray-700">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(location.visitedDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </span>
                </div>
                
                {location.description && (
                  <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                    {location.description}
                  </p>
                )}
              </div>
              
              <button
                type="button"
                onClick={(e) => handleDelete(location.id, e)}
                className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="削除"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
