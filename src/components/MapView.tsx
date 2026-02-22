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

export type AssetType = "OLT" | "ODF" | "OTB" | "ODC" | "ODP";

export interface AssetNode {
    id: string;
    name: string;
    type: AssetType;
    latitude: number;
    longitude: number;
    capacity?: number;
    brand?: string;
}

export interface CablePath {
    id: string;
    name: string;
    type: "BACKBONE" | "DISTRIBUTION" | "DROP";
    capacity: number;
    path: [number, number][];
}

interface MapViewProps {
    onus: OnuData[];
    assets?: AssetNode[];
    cables?: CablePath[];
    filterStatus: string | null;
    mapConfig?: {
        centerLat: number;
        centerLng: number;
        zoom: number;
        refreshInterval?: number;
    };
    viewMode: 'clustered' | 'unclustered';
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

export default function MapView({ onus, assets = [], cables = [], filterStatus, mapConfig, viewMode }: MapViewProps) {
    const mapRef = useRef<L.Map | null>(null);
    const clusterGroupRef = useRef<L.MarkerClusterGroup | L.LayerGroup | null>(null);
    const assetsLayerRef = useRef<L.LayerGroup | null>(null);
    const cablesLayerRef = useRef<L.LayerGroup | null>(null);
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

    const hasSetInitialView = useRef(false);

    // Update map view when config changes (ONLY INITIAL)
    useEffect(() => {
        if (!mapRef.current || !mapConfig || hasSetInitialView.current) return;

        const currentCenter = mapRef.current.getCenter();
        const newLat = mapConfig.centerLat;
        const newLng = mapConfig.centerLng;

        // Set view only once
        mapRef.current.setView([newLat, newLng], mapConfig.zoom);
        hasSetInitialView.current = true;
    }, [mapConfig]);

    // Update markers
    const updateMarkers = useCallback(() => {
        if (!mapRef.current || !isReady) return;

        const map = mapRef.current;

        // Remove existing cluster group
        if (clusterGroupRef.current) {
            map.removeLayer(clusterGroupRef.current);
        }

        // Helper to create popup content
        const createPopupContent = (onu: OnuData, statusColor: string) => `
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
            <div style="margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 8px;">
               <span style="color: var(--popup-label);">Koordinat:</span> ${onu.lat.toFixed(5)}, ${onu.lng.toFixed(5)}
               <div style="margin-top: 4px;">
                 <a href="https://www.google.com/maps/search/?api=1&query=${onu.lat},${onu.lng}" target="_blank" style="color: var(--accent-color); text-decoration: none; font-weight: 600;">
                   📍 Buka di Google Maps
                 </a>
               </div>
            </div>
          </div>
        </div>
      `;

        const filteredOnus = filterStatus
            ? onus.filter(o => o.status === filterStatus)
            : onus;

        // If clustered mode, use MarkerClusterGroup
        if (viewMode === 'clustered') {
            const clusterGroup = L.markerClusterGroup({
                maxClusterRadius: 60,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                iconCreateFunction: createClusterIcon,
                animate: true,
                animateAddingMarkers: false,
            });

            for (const onu of filteredOnus) {
                const icon = createMarkerIcon(onu.status);
                const marker = L.marker([onu.lat, onu.lng], {
                    icon,
                    status: onu.status,
                } as L.MarkerOptions & { status: string });

                const statusColor = STATUS_COLORS[onu.status] || '#78909c';
                marker.bindPopup(createPopupContent(onu, statusColor), {
                    className: 'dark-popup',
                    closeButton: true,
                    maxWidth: 300,
                });

                clusterGroup.addLayer(marker);
            }
            map.addLayer(clusterGroup);
            clusterGroupRef.current = clusterGroup;
        }
        // If unclustered mode, move markers directly to a LayerGroup (no clustering)
        else {
            const layerGroup = L.layerGroup();

            for (const onu of filteredOnus) {
                const icon = createMarkerIcon(onu.status);
                const marker = L.marker([onu.lat, onu.lng], {
                    icon,
                    status: onu.status,
                } as L.MarkerOptions & { status: string });

                const statusColor = STATUS_COLORS[onu.status] || '#78909c';
                marker.bindPopup(createPopupContent(onu, statusColor), {
                    className: 'dark-popup',
                    closeButton: true,
                    maxWidth: 300,
                });

                layerGroup.addLayer(marker);
            }
            map.addLayer(layerGroup);
            // We reuse clusterGroupRef to store this layer so we can remove it later
            clusterGroupRef.current = layerGroup as any;
        }

    }, [onus, filterStatus, isReady, viewMode]);

    // Update physical assets and cables
    const updateInfrastructure = useCallback(() => {
        if (!mapRef.current || !isReady) return;
        const map = mapRef.current;

        // Clean up old layers
        if (assetsLayerRef.current) map.removeLayer(assetsLayerRef.current);
        if (cablesLayerRef.current) map.removeLayer(cablesLayerRef.current);

        const assetsGroup = L.layerGroup();
        const cablesGroup = L.layerGroup();

        // 1. Assets
        const getMarkerColor = (type: AssetType) => {
            const colors = { OLT: "#9c27b0", ODF: "#e91e63", OTB: "#00bcd4", ODC: "#ff9800", ODP: "#4caf50" };
            return colors[type];
        };

        const createCustomAssetMarker = (type: AssetType) => {
            const bg = getMarkerColor(type);
            return L.divIcon({
                className: "custom-asset-marker",
                html: `
            <div style="
              width: 24px; height: 24px; 
              background: ${bg}; 
              border: 2px solid white; 
              border-radius: 50%;
              box-shadow: 0 0 8px rgba(0,0,0,0.4);
              display: flex; align-items: center; justify-content: center;
              color: white; font-size: 10px; font-weight: bold; font-family: sans-serif;
            ">
              ${type.substring(0, 2)}
            </div>
          `,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            });
        };

        assets.forEach((asset) => {
            const marker = L.marker([asset.latitude, asset.longitude], {
                icon: createCustomAssetMarker(asset.type)
            });

            marker.bindPopup(`
                <div class="dark-popup font-sans p-2">
                    <span style="font-size: 10px; font-weight: bold; color: gray; text-transform: uppercase;">${asset.type}</span>
                    <strong style="display: block; margin-top: 2px;">${asset.name}</strong>
                    <div style="margin-top: 6px; font-size: 12px; color: #ccc;">
                        <div>Capacity: ${asset.capacity || 'N/A'}</div>
                        ${asset.brand ? `<div>Brand: ${asset.brand}</div>` : ''}
                    </div>
                </div>
            `);
            assetsGroup.addLayer(marker);
        });

        // 2. Cables
        const getCableColor = (type: string) => {
            const colors: Record<string, string> = { BACKBONE: "#e53935", DISTRIBUTION: "#1e88e5", DROP: "#43a047" };
            return colors[type] || "#ffffff";
        };
        const getCableWeight = (type: string) => {
            const weights: Record<string, number> = { BACKBONE: 5, DISTRIBUTION: 4, DROP: 3 };
            return weights[type] || 3;
        };

        cables.forEach((cable) => {
            const polyline = L.polyline(cable.path, {
                color: getCableColor(cable.type),
                weight: getCableWeight(cable.type),
                opacity: 0.8
            });

            polyline.bindPopup(`
                <div class="dark-popup font-sans p-2">
                    <span style="font-size: 10px; font-weight: bold; color: gray; text-transform: uppercase;">Kabel ${cable.type}</span>
                    <strong style="display: block; margin-top: 2px;">${cable.name}</strong>
                    <div style="margin-top: 6px; font-size: 12px; color: #ccc;">
                        <div>Capacity: ${cable.capacity} Core</div>
                        <div>Points: ${cable.path.length} span</div>
                    </div>
                </div>
            `);
            cablesGroup.addLayer(polyline);
        });

        map.addLayer(assetsGroup);
        map.addLayer(cablesGroup);

        assetsLayerRef.current = assetsGroup;
        cablesLayerRef.current = cablesGroup;

    }, [assets, cables, isReady]);

    useEffect(() => {
        updateMarkers();
    }, [updateMarkers]);

    useEffect(() => {
        updateInfrastructure();
    }, [updateInfrastructure]);

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
