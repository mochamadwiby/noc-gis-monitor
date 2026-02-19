'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import StatsBar from '@/components/StatsBar';
import OltSelector from '@/components/OltSelector';
import Legend from '@/components/Legend';

// Dynamic import for Leaflet (SSR incompatible)
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <div className="loading-spinner" />
      <p>Memuat peta...</p>
    </div>
  ),
});

interface OnuData {
  id: string;
  sn: string;
  name: string;
  status: 'Online' | 'Power fail' | 'LOS' | 'Offline' | 'Unconfigured';
  lat: number;
  lng: number;
  olt_name: string;
  zone: string;
  board?: string;
  port?: string;
}

interface DashboardData {
  onus: OnuData[];
  stats: {
    total: number;
    online: number;
    los: number;
    offline: number;
    powerFail: number;
    unconfigured: number;
  };
  mapConfig: {
    centerLat: number;
    centerLng: number;
    zoom: number;
    refreshInterval: number;
  };
  timestamp: string;
  isMock: boolean;
}

function computeStats(onus: OnuData[]) {
  return {
    total: onus.length,
    online: onus.filter(o => o.status === 'Online').length,
    los: onus.filter(o => o.status === 'LOS').length,
    offline: onus.filter(o => o.status === 'Offline').length,
    powerFail: onus.filter(o => o.status === 'Power fail').length,
    unconfigured: onus.filter(o => o.status === 'Unconfigured').length,
  };
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterOlt, setFilterOlt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: DashboardData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Gagal mengambil data. Mencoba kembali...');
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = data?.mapConfig?.refreshInterval || 30000;
    const timer = setInterval(fetchData, interval);
    return () => clearInterval(timer);
  }, [fetchData, data?.mapConfig?.refreshInterval]);

  // Extract unique OLT names, excluding OLTs where ALL ONUs are Unconfigured
  const oltList = useMemo(() => {
    if (!data) return [];
    const oltGroups = new Map<string, { total: number; unconfigured: number }>();
    for (const o of data.onus) {
      const g = oltGroups.get(o.olt_name) || { total: 0, unconfigured: 0 };
      g.total++;
      if (o.status === 'Unconfigured') g.unconfigured++;
      oltGroups.set(o.olt_name, g);
    }
    return Array.from(oltGroups.entries())
      .filter(([, g]) => g.total > g.unconfigured) // hide OLTs with only unconfigured
      .map(([name]) => name)
      .sort();
  }, [data]);

  // Filter by OLT first, then compute stats for that OLT
  const filteredByOlt = useMemo(() => {
    if (!data) return [];
    if (!filterOlt) return data.onus;
    return data.onus.filter(o => o.olt_name === filterOlt);
  }, [data, filterOlt]);

  const displayStats = useMemo(() => {
    if (!data) return { total: 0, online: 0, los: 0, offline: 0, powerFail: 0, unconfigured: 0 };
    if (!filterOlt) return data.stats; // global stats from API
    return computeStats(filteredByOlt);
  }, [data, filterOlt, filteredByOlt]);

  const handleFilterClick = useCallback((status: string | null) => {
    setFilterStatus((prev) => (prev === status ? null : status));
  }, []);

  const handleOltFilter = useCallback((olt: string | null) => {
    setFilterOlt(olt);
    setFilterStatus(null); // reset status filter when switching OLT
  }, []);

  return (
    <main className="dashboard">
      <StatsBar
        stats={displayStats}
        lastRefresh={data?.timestamp || ''}
        isMock={data?.isMock || false}
        onFilterClick={handleFilterClick}
        activeFilter={filterStatus}
        activeOlt={filterOlt}
      />

      {oltList.length > 1 && (
        <OltSelector
          oltList={oltList}
          activeOlt={filterOlt}
          onSelect={handleOltFilter}
          oltStats={data?.onus || []}
        />
      )}

      <div className="map-wrapper">
        <MapView
          onus={filteredByOlt}
          filterStatus={filterStatus}
          mapConfig={data?.mapConfig}
        />
        <Legend />

        {error && (
          <div className="error-toast">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {!data && !error && (
          <div className="initial-loading">
            <div className="loading-spinner large" />
            <p>Menghubungkan ke SmartOLT...</p>
          </div>
        )}
      </div>
    </main>
  );
}
