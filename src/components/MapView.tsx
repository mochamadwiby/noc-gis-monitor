'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

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

interface MapViewProps {
    onus: OnuData[];
    filterStatus: string | null;
    mapConfig?: {
        centerLat: number;
        centerLng: number;
        zoom: number;
    };
}

const STATUS_COLORS: Record<string, string> = {
    Online: '#00e676',
    LOS: '#ff1744',
    'Power fail': '#ffea00',
    Offline: '#78909c',
    Unconfigured: '#448aff',
};

const TILE_URLS: Record<string, string> = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
};

function getCurrentTileMode(): string {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    return theme === 'light' ? 'light' : 'dark';
}

const STATUS_GLOW: Record<string, string> = {
    Online: 'rgba(0, 230, 118, 0.4)',
    LOS: 'rgba(255, 23, 68, 0.6)',
    'Power fail': 'rgba(255, 234, 0, 0.4)',
    Offline: 'rgba(120, 144, 156, 0.3)',
    Unconfigured: 'rgba(68, 138, 255, 0.4)',
};

function createMarkerIcon(status: string) {
    const color = STATUS_COLORS[status] || '#78909c';
    const glow = STATUS_GLOW[status] || 'rgba(120, 144, 156, 0.3)';
    const size = status === 'Online' ? 10 : 14;
    const glowSize = size + 8;

    return L.divIcon({
        className: 'custom-marker',
        html: `
      <div style="
        position: relative;
        width: ${glowSize}px;
        height: ${glowSize}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: ${glowSize}px;
          height: ${glowSize}px;
          border-radius: 50%;
          background: ${glow};
          ${status !== 'Online' ? 'animation: pulse-glow 2s ease-in-out infinite;' : ''}
        "></div>
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid rgba(255,255,255,0.3);
          position: relative;
          z-index: 1;
          box-shadow: 0 0 6px ${color};
        "></div>
      </div>
    `,
        iconSize: [glowSize, glowSize],
        iconAnchor: [glowSize / 2, glowSize / 2],
    });
}

function createClusterIcon(cluster: L.MarkerCluster) {
    const childMarkers = cluster.getAllChildMarkers();
    const count = childMarkers.length;

    // Calculate status breakdown
    let hasLOS = false;
    let hasOffline = false;
    let hasPowerFail = false;
    let allOnline = true;

    childMarkers.forEach((marker) => {
        const status = (marker.options as { status?: string }).status;
        if (status !== 'Online') allOnline = false;
        if (status === 'LOS') hasLOS = true;
        if (status === 'Offline') hasOffline = true;
        if (status === 'Power fail') hasPowerFail = true;
    });

    let bgColor = '#00e676';
    let borderColor = 'rgba(0, 230, 118, 0.4)';
    if (hasLOS) {
        bgColor = '#ff1744';
        borderColor = 'rgba(255, 23, 68, 0.5)';
    } else if (hasPowerFail) {
        bgColor = '#ffea00';
        borderColor = 'rgba(255, 234, 0, 0.5)';
    } else if (hasOffline) {
        bgColor = '#78909c';
        borderColor = 'rgba(120, 144, 156, 0.4)';
    } else if (!allOnline) {
        bgColor = '#448aff';
        borderColor = 'rgba(68, 138, 255, 0.4)';
    }

    const size = count > 100 ? 56 : count > 50 ? 48 : count > 10 ? 40 : 34;
    const fontSize = count > 100 ? 14 : count > 10 ? 13 : 12;

    return L.divIcon({
        html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${bgColor};
        border: 3px solid ${borderColor};
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${hasLOS || hasOffline ? '#fff' : '#0a0e17'};
        font-weight: 700;
        font-size: ${fontSize}px;
        font-family: 'Inter', sans-serif;
        box-shadow: 0 0 20px ${borderColor}, 0 2px 8px rgba(0,0,0,0.5);
        transition: all 0.3s ease;
      ">${count}</div>
    `,
        className: 'custom-cluster-icon',
        iconSize: L.point(size, size),
    });
}

export default function MapView({ onus, filterStatus, mapConfig }: MapViewProps) {
    const mapRef = useRef<L.Map | null>(null);
    const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);

    // Initialize map
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const centerLat = mapConfig?.centerLat ?? -6.2088;
        const centerLng = mapConfig?.centerLng ?? 106.8456;
        const zoom = mapConfig?.zoom ?? 12;

        const map = L.map(containerRef.current, {
            center: [centerLat, centerLng],
            zoom,
            zoomControl: false,
            attributionControl: false,
            preferCanvas: true,
        });

        // Theme-aware tile layer
        const tileMode = getCurrentTileMode();
        const tileLayer = L.tileLayer(TILE_URLS[tileMode], {
            maxZoom: 19,
            subdomains: 'abcd',
        }).addTo(map);
        tileLayerRef.current = tileLayer;

        // Zoom control in bottom-right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        mapRef.current = map;
        setIsReady(true);

        // Watch for theme changes and swap tile layer
        const observer = new MutationObserver(() => {
            if (!mapRef.current || !tileLayerRef.current) return;
            const newMode = getCurrentTileMode();
            const newUrl = TILE_URLS[newMode];
            tileLayerRef.current.setUrl(newUrl);
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });

        return () => {
            observer.disconnect();
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Update markers
    const updateMarkers = useCallback(() => {
        if (!mapRef.current || !isReady) return;

        const map = mapRef.current;

        // Remove existing cluster group
        if (clusterGroupRef.current) {
            map.removeLayer(clusterGroupRef.current);
        }

        // Create new cluster group
        const clusterGroup = L.markerClusterGroup({
            maxClusterRadius: 60,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: createClusterIcon,
            animate: true,
            animateAddingMarkers: false,
        });

        const filteredOnus = filterStatus
            ? onus.filter(o => o.status === filterStatus)
            : onus;

        for (const onu of filteredOnus) {
            const icon = createMarkerIcon(onu.status);
            const marker = L.marker([onu.lat, onu.lng], {
                icon,
                status: onu.status,
            } as L.MarkerOptions & { status: string });

            const statusColor = STATUS_COLORS[onu.status] || '#78909c';

            marker.bindPopup(`
        <div style="
          background: var(--popup-bg);
          color: var(--popup-text);
          padding: 12px 16px;
          border-radius: 10px;
          font-family: 'Inter', sans-serif;
          min-width: 220px;
          border: 1px solid var(--popup-border);
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        ">
          <div style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color: var(--popup-heading);">
            ${onu.name}
          </div>
          <div style="
            display: inline-block;
            padding: 3px 10px;
            border-radius: 20px;
            background: ${statusColor}22;
            color: ${statusColor};
            font-size: 11px;
            font-weight: 600;
            border: 1px solid ${statusColor}44;
            margin-bottom: 10px;
          ">● ${onu.status}</div>
          <div style="font-size: 12px; color: var(--popup-detail); line-height: 1.8;">
            <div><span style="color: var(--popup-label);">SN:</span> ${onu.sn}</div>
            <div><span style="color: var(--popup-label);">OLT:</span> ${onu.olt_name}</div>
            <div><span style="color: var(--popup-label);">Zone:</span> ${onu.zone}</div>
            ${onu.board != null ? `<div><span style="color: var(--popup-label);">Board/Port:</span> ${onu.board}/${onu.port}</div>` : ''}
            <div><span style="color: var(--popup-label);">Koordinat:</span> ${onu.lat.toFixed(5)}, ${onu.lng.toFixed(5)}</div>
          </div>
        </div>
      `, {
                className: 'dark-popup',
                closeButton: true,
                maxWidth: 300,
            });

            clusterGroup.addLayer(marker);
        }

        map.addLayer(clusterGroup);
        clusterGroupRef.current = clusterGroup;
    }, [onus, filterStatus, isReady]);

    useEffect(() => {
        updateMarkers();
    }, [updateMarkers]);

    return (
        <div
            ref={containerRef}
            id="map-container"
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
            }}
        />
    );
}
