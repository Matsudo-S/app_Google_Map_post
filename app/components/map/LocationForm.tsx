'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Location } from '../../post/page';

interface LocationFormProps {
  onAddLocation: (location: Omit<Location, 'id'>) => void;
}

type Prediction = google.maps.places.AutocompletePrediction & { isTransit?: boolean };

export default function LocationForm({ onAddLocation }: LocationFormProps) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [hasNavigated, setHasNavigated] = useState<boolean>(false);
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const svcRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placeSvcRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => {
    const init = () => {
      if (typeof window === 'undefined' || !window.google?.maps?.places) {
        setTimeout(init, 100);
        return;
      }
      svcRef.current = new google.maps.places.AutocompleteService();
      placeSvcRef.current = new google.maps.places.PlacesService(document.createElement('div'));
    };
    init();
  }, []);

  const isTransitType = (types?: string[]) => {
    if (!types) return false;
    return types.includes('transit_station') || types.includes('train_station') || types.includes('subway_station') || types.includes('bus_station');
  };

  const fetchPredictions = (text: string) => {
    if (!svcRef.current || !text.trim()) {
      setPredictions([]);
      setActiveIndex(-1);
      setHasNavigated(false);
      return;
    }
    svcRef.current.getPlacePredictions(
      {
        input: text,
        // 利用可能ならば types を限定（AutocompleteService は厳密にはサポートが限定的）
        // types: ['geocode', 'establishment', 'transit_station'] as any,
      },
      (res) => {
        const list = (res || []).map(p => ({ ...p, isTransit: isTransitType(p.types) }));
        setPredictions(list);
        setOpen(true);
        setActiveIndex(list.length > 0 ? 0 : -1);
        setHasNavigated(false);
      }
    );
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);
    setHasNavigated(false);
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => fetchPredictions(text), 200);
  };

  const handleSelect = (pred: Prediction) => {
    setOpen(false);
    setPredictions([]);
    setQuery(pred.description || pred.structured_formatting?.main_text || '');
    if (!placeSvcRef.current) return;
    placeSvcRef.current.getDetails(
      { placeId: pred.place_id, fields: ['name', 'formatted_address', 'geometry', 'types'] },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
          setError('選択した候補の詳細取得に失敗しました');
          return;
        }
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        onAddLocation({
          name: place.name || pred.structured_formatting?.main_text || pred.description || '場所',
          address: place.formatted_address || pred.description || '',
          lat,
          lng,
          visitedDate: new Date().toISOString().slice(0, 10),
          description: undefined,
        });
        setQuery('');
        setError(null);
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // IME変換中のEnter等は無視
    if (isComposing) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(predictions.length > 0);
    }

    switch (e.key) {
      case 'ArrowDown': {
        if (!predictions.length) return;
        e.preventDefault();
        setActiveIndex(prev => {
          const next = prev < predictions.length - 1 ? prev + 1 : 0;
          return next;
        });
        setHasNavigated(true);
        break;
      }
      case 'ArrowUp': {
        if (!predictions.length) return;
        e.preventDefault();
        setActiveIndex(prev => {
          const next = prev > 0 ? prev - 1 : predictions.length - 1;
          return next;
        });
        setHasNavigated(true);
        break;
      }
      case 'Enter': {
        // 矢印で候補を移動した場合のみEnterで選択
        if (open && hasNavigated && activeIndex >= 0 && activeIndex < predictions.length) {
          e.preventDefault();
          handleSelect(predictions[activeIndex]);
        }
        break;
      }
      case 'Escape': {
        setOpen(false);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="space-y-2 relative">
      <label htmlFor="place" className="block text-sm font-medium text-gray-700">場所名を入力</label>
      <input
        id="place"
        ref={inputRef}
        type="text"
        value={query}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        placeholder="例: 東京タワー / 渋谷駅 / 浅草寺"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
        onFocus={() => { if (predictions.length) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && predictions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-auto" role="listbox">
          {predictions.map((p, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={p.place_id}
                type="button"
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(p)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <span className="text-lg" aria-hidden>
                  {p.isTransit ? '🚆' : '📍'}
                </span>
                <span className="flex-1 text-sm text-black">
                  <span className="font-medium">{p.structured_formatting?.main_text || p.description}</span>
                  {p.structured_formatting?.secondary_text && (
                    <span className="ml-2 text-gray-500">{p.structured_formatting.secondary_text}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <p className="text-xs text-gray-500">駅・バス停などの候補は {""}<span className="font-semibold">🚆</span>{" "}アイコンで表示します。</p>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}
