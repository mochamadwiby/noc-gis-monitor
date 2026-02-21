"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { FeatureGroup, MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";

// Import CSS
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

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
    onAssetCreated?: (lat: number, lng: number) => void;
    onCableCreated?: (path: [number, number][]) => void;
    center?: [number, number];
    zoom?: number;
    drawMode?: "marker" | "polyline" | "none";
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
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
};

function getCurrentTileMode(): string {
    if (typeof document === "undefined") return "dark";
    const theme = document.documentElement.getAttribute("data-theme") || "dark";
    return theme === "light" ? "light" : "dark";
}

const ThemeTileLayer = () => {
    const map = useMap();
    const [tileMode, setTileMode] = useState("dark");

    useEffect(() => {
        setTileMode(getCurrentTileMode());
        const observer = new MutationObserver(() => setTileMode(getCurrentTileMode()));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        return () => observer.disconnect();
    }, []);

    return <TileLayer url={TILE_URLS[tileMode]} maxZoom={19} subdomains="abcd" />;
};

export default function AdminMapView({
    assets,
    cables = [],
    onAssetCreated,
    onCableCreated,
    center = [-6.2088, 106.8456],
    zoom = 13,
    drawMode = "marker"
}: AdminMapViewProps) {

    useEffect(() => {
        initLeafletIcons();
    }, []);

    const handleCreated = (e: any) => {
        const { layerType, layer } = e;

        if (layerType === "marker" && onAssetCreated) {
            const latLng = layer.getLatLng();
            onAssetCreated(latLng.lat, latLng.lng);
            // Remove marker immediately since caller should handle saving and it will re-render in `assets`
            layer.remove();
        } else if (layerType === "polyline" && onCableCreated) {
            const latLngs = layer.getLatLngs() as L.LatLng[];
            const path: [number, number][] = latLngs.map(ll => [ll.lat, ll.lng]);
            onCableCreated(path);
            layer.remove();
        }
    };

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

    return (
        <div className="w-full h-full min-h-[500px] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm relative z-0">
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ width: "100%", height: "100%", zIndex: 0 }}
                zoomControl={true}
            >
                <ThemeTileLayer />

                <FeatureGroup>
                    {drawMode !== "none" && (
                        <EditControl
                            position="topright"
                            onCreated={handleCreated}
                            draw={{
                                marker: drawMode === "marker",
                                polyline: drawMode === "polyline" ? { shapeOptions: { color: "#2196F3", weight: 3 } } : false,
                                circle: false,
                                circlemarker: false,
                                polygon: false,
                                rectangle: false,
                            }}
                            edit={{ edit: false, remove: false }} // Edit operations handled via external UI list
                        />
                    )}
                </FeatureGroup>

                {/* Render Assets */}
                {assets.map((asset) => (
                    <Marker
                        key={`${asset.type}-${asset.id}`}
                        position={[asset.latitude, asset.longitude]}
                        icon={createCustomMarker(asset.type)}
                    >
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
                    </Marker>
                ))}

                {/* Cables rendering logic will go here once API is built */}

            </MapContainer>
        </div>
    );
}
