"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
// Fix Leaflet setup
if (typeof window !== "undefined") {
    // @ts-ignore
    window.L = window.L || L;
}
import "@geoman-io/leaflet-geoman-free";
import { FeatureGroup, MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";

// Interface definitions matches database schema structure
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
    path: [number, number][]; // LatLng tuple array
}

interface AdminMapViewProps {
    assets: AssetNode[];
    cables?: CablePath[];
    onus?: any[];
    onAssetCreated?: (lat: number, lng: number) => void;
    onAssetEdited?: (asset: AssetNode) => void;
    onCableCreated?: (path: [number, number][]) => void;
    onCableEdited?: (cable: CablePath) => void;
    center?: [number, number];
    zoom?: number;
    drawMode?: "marker" | "polyline" | "all" | "none";
}

// Ensure Leaflet marker icons work in Next.js
const initLeafletIcons = () => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
};

const TILE_URLS: Record<string, string> = {
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
};

function getCurrentTileMode(): string {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

const ThemeTileLayer = () => {
    const map = useMap();
    const [tileMode, setTileMode] = useState("dark");

    useEffect(() => {
        setTileMode(getCurrentTileMode());
        const observer = new MutationObserver(() => setTileMode(getCurrentTileMode()));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    // Force map size invalidation to fix blank map issues on mount
    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 250);
    }, [map]);

    return <TileLayer key={tileMode} url={TILE_URLS[tileMode]} maxZoom={19} subdomains="abcd" />;
};

// Geoman Draw Control Wrapper for robust drawing on Leaflet 1.9+
const GeomanDrawControl = ({ drawMode, onCreated }: { drawMode: string, onCreated: (e: any) => void }) => {
    const map = useMap();

    useEffect(() => {
        if (drawMode === "none") {
            map.pm.removeControls();
            return;
        }

        map.pm.setLang('en');
        // Add Geoman controls
        map.pm.addControls({
            position: 'topright',
            drawMarker: drawMode === "marker" || drawMode === "all",
            drawPolyline: drawMode === "polyline" || drawMode === "all",
            drawCircleMarker: false,
            drawRectangle: false,
            drawPolygon: false,
            drawCircle: false,
            drawText: false,
            editMode: false,
            dragMode: false,
            cutPolygon: false,
            removalMode: false,
            rotateMode: false,
        });

        // Set global styles for drawing polylines
        map.pm.setPathOptions({
            color: '#2196F3',
            weight: 3
        });

        const handleCreate = (e: any) => {
            const layer = e.layer;
            const shape = e.shape;

            // Re-map "Line" to "polyline" to match existing code logic
            const layerType = shape === "Marker" ? "marker" : (shape === "Line" || shape === "Polyline" || shape === "line" || shape === "polyline" ? "polyline" : shape.toLowerCase());
            onCreated({ layerType, layer });
        };

        map.on('pm:create', handleCreate);

        return () => {
            map.off('pm:create', handleCreate);
            map.pm.removeControls();
        };
    }, [map, drawMode, onCreated]);

    return null;
};

// Extracted helper functions
const getMarkerColor = (type: AssetType) => {
    const colors = {
        OLT: "#9c27b0", // Purple
        ODF: "#e91e63", // Pink
        OTB: "#00bcd4", // Cyan
        ODC: "#ff9800", // Orange
        ODP: "#4caf50", // Green
    };
    return colors[type];
};

const createCustomMarker = (type: AssetType) => {
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

const createOnuMarker = (status: string) => {
    const isOnline = status === 'Online';
    const color = isOnline ? '#00e676' : '#ff1744';
    const pulseAnim = isOnline ? 'pulse-glow' : 'none';

    return L.divIcon({
        className: "custom-onu-marker",
        html: `
            <div style="position: relative; width: 14px; height: 14px;">
                <div style="
                    position: absolute; inset: 0;
                    background: ${color}; 
                    border-radius: 50%;
                    animation: ${pulseAnim} 2s infinite;
                "></div>
                <div style="
                    position: absolute; inset: 2px;
                    background: ${color}; 
                    border: 1.5px solid white; 
                    border-radius: 50%;
                    box-shadow: 0 0 5px rgba(0,0,0,0.5);
                "></div>
            </div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });
};

const getCableColor = (type: string) => {
    const colors: Record<string, string> = {
        BACKBONE: "#e53935",    // Red
        DISTRIBUTION: "#1e88e5",// Blue
        DROP: "#43a047",        // Green
    };
    return colors[type] || "#ffffff";
};

const getCableWeight = (type: string) => {
    const weights: Record<string, number> = {
        BACKBONE: 5,
        DISTRIBUTION: 4,
        DROP: 3,
    };
    return weights[type] || 3;
};

const MapLayers = ({ assets, onus, cables, onAssetEdited, onCableEdited, isDrawing }: any) => {
    const map = useMap();

    const handleAssetClick = (asset: any) => {
        // Prevent edit popup if Geoman is actively drawing something
        if (isDrawing) return;
        if (onAssetEdited) onAssetEdited(asset);
    };

    const handleCableClick = (cable: any) => {
        if (isDrawing) return;
        if (onCableEdited) onCableEdited(cable);
    };

    return (
        <>
            {/* Render Assets */}
            {assets.map((asset: any) => (
                <Marker
                    key={`${asset.type}-${asset.id}`}
                    position={[asset.latitude, asset.longitude]}
                    icon={createCustomMarker(asset.type)}
                    interactive={!isDrawing} // Crucial: ignore clicks when drawing so line can snap behind the marker
                    eventHandlers={{
                        click: () => handleAssetClick(asset)
                    }}
                >
                    {!onAssetEdited && (
                        <Popup className="dark-popup">
                            <div className="font-sans">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase tracking-wider">{asset.type}</span>
                                <span className="font-semibold text-gray-900 dark:text-white block">{asset.name}</span>
                                <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                                    <div>Capacity: {asset.capacity || "N/A"}</div>
                                    {asset.brand && <div>Brand: {asset.brand}</div>}
                                    <div className="text-[10px] mt-2 text-gray-400 font-mono">
                                        {asset.latitude.toFixed(5)}, {asset.longitude.toFixed(5)}
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    )}
                </Marker>
            ))}

            {/* Render ONUs */}
            {onus.map((onu: any) => (
                <Marker
                    key={`onu-${onu.id}`}
                    position={[onu.latitude, onu.longitude]}
                    icon={createOnuMarker(onu.status)}
                    interactive={!isDrawing} // Ignore clicks while drawing
                >
                    <Popup className="dark-popup">
                        <div className="font-sans">
                            <span className="text-xs font-bold text-blue-500 block mb-1 uppercase tracking-wider">Customer ONU</span>
                            <span className="font-semibold text-gray-900 dark:text-white block">{onu.name}</span>
                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                                <div className="flex justify-between"><span>SN:</span> <span className="font-mono">{onu.sn}</span></div>
                                <div className="flex justify-between"><span>OLT:</span> <span>{onu.olt_name}</span></div>
                                <div className="flex justify-between"><span>Zone:</span> <span>{onu.zone_name || '-'}</span></div>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                                    <span className="font-semibold">Status:</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${onu.status === 'Online' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                        {onu.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold">Signal:</span>
                                    <span className="font-mono">{onu.signal ? `${onu.signal} dBm` : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {/* Render Cables */}
            {cables.map((cable: any) => (
                <FeatureGroup key={cable.id}>
                    <Polyline
                        positions={cable.path}
                        color={getCableColor(cable.type)}
                        weight={getCableWeight(cable.type)}
                        opacity={0.8}
                        interactive={!isDrawing} // Ignore clicks while drawing lines cross over existing lines
                        eventHandlers={{
                            click: () => handleCableClick(cable)
                        }}
                    >
                        {!onCableEdited && (
                            <Popup className="dark-popup">
                                <div className="font-sans">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase tracking-wider">Kabel {cable.type}</span>
                                    <span className="font-semibold text-gray-900 dark:text-white block">{cable.name}</span>
                                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                                        <div>Capacity: {cable.capacity} Core</div>
                                        <div>Points: {cable.path?.length || 0} span</div>
                                    </div>
                                </div>
                            </Popup>
                        )}
                    </Polyline>
                </FeatureGroup>
            ))}
        </>
    );
};

export default function AdminMapView({
    assets,
    cables = [],
    onus = [],
    onAssetCreated,
    onAssetEdited,
    onCableCreated,
    onCableEdited,
    center = [
        Number(process.env.NEXT_PUBLIC_MAP_CENTER_LAT) || -6.2088,
        Number(process.env.NEXT_PUBLIC_MAP_CENTER_LNG) || 106.8456
    ],
    zoom = Number(process.env.NEXT_PUBLIC_MAP_ZOOM) || 13,
    drawMode = "marker"
}: AdminMapViewProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const mapRef = useRef<L.Map | null>(null);

    useEffect(() => {
        initLeafletIcons();
        setIsMounted(true);
    }, []);

    // Listen to global draw events on the map instance when Geoman is active
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;

        const handleDrawStart = () => setIsDrawing(true);
        const handleDrawEnd = () => setIsDrawing(false);

        map.on('pm:drawstart', handleDrawStart);
        map.on('pm:drawend', handleDrawEnd);

        // Map creation handler might fire a draw end immediately, check global state
        return () => {
            map.off('pm:drawstart', handleDrawStart);
            map.off('pm:drawend', handleDrawEnd);
        };
    }, [isMounted]);

    const handleCreated = (e: any) => {
        const { layerType, layer } = e;

        if (layerType === "marker" && onAssetCreated) {
            const latLng = layer.getLatLng();
            onAssetCreated(latLng.lat, latLng.lng);
            // Remove marker immediately since caller should handle saving and it will re-render in `assets`
            layer.remove();
        } else if (layerType === "polyline" && onCableCreated) {
            const rawLatLngs = layer.getLatLngs();
            // Flatten if it's an array of arrays (MultiPolyline)
            const latLngs = Array.isArray(rawLatLngs[0]) ? rawLatLngs[0] : rawLatLngs;
            const path: [number, number][] = latLngs.map((ll: any) => [ll.lat, ll.lng]);
            onCableCreated(path);
            layer.remove();
        }
    };
    return (
        <div className="w-full h-full min-h-[600px] flex flex-col border border-border rounded-xl overflow-hidden shadow-sm relative z-0">
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ width: "100%", height: "100%", minHeight: "600px", flex: 1, zIndex: 0 }}
                zoomControl={true}
                ref={mapRef}
            >
                <ThemeTileLayer />

                {isMounted && (
                    <GeomanDrawControl drawMode={drawMode} onCreated={handleCreated} />
                )}

                <MapLayers
                    assets={assets}
                    onus={onus}
                    cables={cables}
                    onAssetEdited={onAssetEdited}
                    onCableEdited={onCableEdited}
                    isDrawing={isDrawing}
                />

            </MapContainer>
        </div>
    );
}
