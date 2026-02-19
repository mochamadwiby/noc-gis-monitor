/**
 * SmartOLT API Client
 * Handles all communication with the SmartOLT REST API
 *
 * Two-tier data fetching strategy:
 *  - Fast path (every 30s): get_onus_statuses (no rate limit)
 *  - Slow path (cached 20min): get_all_onus_details (3 calls/hour limit)
 *    → provides customer names, OLT names, zone names
 */

import { cacheGet, cacheSet, DETAILS_CACHE_TTL, ZONES_CACHE_TTL } from './cache';

const BASE_URL = process.env.SMARTOLT_BASE_URL || '';
const API_TOKEN = process.env.SMARTOLT_API_TOKEN || '';

// ── Response wrappers ────────────────────────────────────────────────
interface SmartOLTResponse<T> {
    status: boolean;
    response: T;
}

interface SmartOLTOnusResponse {
    status: boolean;
    onus: OnuDetailRaw[];
}

// ── Raw API types ────────────────────────────────────────────────────

/** /api/onu/get_onus_statuses — no rate limit */
export interface OnuStatusRaw {
    unique_external_id: string;
    sn: string;
    olt_id: string;
    board: string;
    port: string;
    onu: string;
    zone_id: string;
    odb_id: string;
    status: string;
    last_status_change: string;
}

/** /api/onu/get_all_onus_details — 3 calls/hour */
export interface OnuDetailRaw {
    unique_external_id: string;
    sn: string;
    name: string;
    olt_id: string;
    olt_name: string;
    board: string;
    port: string;
    onu: string;
    zone: string;
    zone_id: string;
    odb_id: string;
    [key: string]: unknown; // many other fields we don't need
}

/** /api/system/get_zones */
export interface ZoneRaw {
    id: string;
    name: string;
    imported_date?: string;
    imported_from_olt?: string;
}

/** /api/onu/get_unconfigured_onus */
export interface UnconfiguredOnuRaw {
    sn: string;
    olt_id: string;
    olt_name?: string;
    board: string;
    port: string;
}

/** /api/onu/get_all_onus_gps_coordinates — 3 calls/hour */
export interface OnuCoordinateRaw {
    unique_external_id?: string;
    sn: string;
    name?: string;
    latitude: string;
    longitude: string;
    olt_id?: string;
    olt_name?: string;
    zone?: string;
}

// ── Dashboard output type ────────────────────────────────────────────
export interface DashboardOnu {
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

// ── Generic fetch helper ─────────────────────────────────────────────
async function smartoltFetch<T>(endpoint: string): Promise<T | null> {
    if (!BASE_URL || !API_TOKEN) {
        console.warn('[SmartOLT] Missing BASE_URL or API_TOKEN');
        return null;
    }

    const url = `${BASE_URL}${endpoint}`;

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Token': API_TOKEN,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            console.error(`[SmartOLT] API error ${res.status}: ${res.statusText} for ${endpoint}`);
            return null;
        }

        return await res.json();
    } catch (error) {
        console.error(`[SmartOLT] Fetch error for ${endpoint}:`, error);
        return null;
    }
}

// ── API functions ────────────────────────────────────────────────────

/** Statuses — no rate limit, called every 30s */
export async function fetchAllOnuStatuses(): Promise<OnuStatusRaw[]> {
    const raw = await smartoltFetch<SmartOLTResponse<OnuStatusRaw[]>>('/api/onu/get_onus_statuses');
    if (!raw || !raw.status) return [];
    return raw.response || [];
}

/** ONU details — 3/hour, cached 20min. Returns name, olt_name, zone */
export async function fetchOnuDetails(): Promise<OnuDetailRaw[]> {
    const CACHE_KEY = 'onu_details';
    const cached = cacheGet<OnuDetailRaw[]>(CACHE_KEY);
    if (cached) {
        console.log(`[SmartOLT] Using cached ONU details (${cached.length} items)`);
        return cached;
    }

    console.log('[SmartOLT] Fetching ONU details (rate-limited: 3/hour)...');
    const raw = await smartoltFetch<SmartOLTOnusResponse>('/api/onu/get_all_onus_details');
    if (!raw || !raw.status || !raw.onus) {
        console.warn('[SmartOLT] get_all_onus_details returned no data');
        return [];
    }

    cacheSet(CACHE_KEY, raw.onus, DETAILS_CACHE_TTL);
    console.log(`[SmartOLT] Cached ${raw.onus.length} ONU details for ${DETAILS_CACHE_TTL / 60000}min`);
    return raw.onus;
}

/** Zones — probably no rate limit, cached 30min */
export async function fetchZones(): Promise<ZoneRaw[]> {
    const CACHE_KEY = 'zones';
    const cached = cacheGet<ZoneRaw[]>(CACHE_KEY);
    if (cached) return cached;

    const raw = await smartoltFetch<SmartOLTResponse<ZoneRaw[]>>('/api/system/get_zones');
    if (!raw || !raw.status) return [];

    const zones = raw.response || [];
    cacheSet(CACHE_KEY, zones, ZONES_CACHE_TTL);
    console.log(`[SmartOLT] Cached ${zones.length} zones`);
    return zones;
}

/** Unconfigured ONUs — no rate limit */
export async function fetchUnconfiguredOnus(): Promise<UnconfiguredOnuRaw[]> {
    const raw = await smartoltFetch<SmartOLTResponse<UnconfiguredOnuRaw[]>>('/api/onu/unconfigured_onus');
    if (!raw || !raw.status) return [];
    return raw.response || [];
}

/** GPS coordinates response — uses 'onus' wrapper like details */
interface SmartOLTGpsResponse {
    status: boolean;
    onus: OnuCoordinateRaw[];
}

/** GPS coordinates — 3/hour, cached 20min. Falls back to per-OLT fetching on 403 */
export async function fetchAllOnuCoordinates(oltIds?: string[]): Promise<OnuCoordinateRaw[]> {
    const CACHE_KEY = 'onu_coordinates';
    const cached = cacheGet<OnuCoordinateRaw[]>(CACHE_KEY);
    if (cached) {
        console.log(`[SmartOLT] Using cached GPS coordinates (${cached.length} items)`);
        return cached;
    }

    console.log('[SmartOLT] Fetching GPS coordinates (rate-limited: 3/hour)...');

    // Try bulk endpoint first
    const raw = await smartoltFetch<SmartOLTGpsResponse>('/api/onu/get_all_onus_gps_coordinates');
    if (raw && raw.status && raw.onus && raw.onus.length > 0) {
        cacheSet(CACHE_KEY, raw.onus, DETAILS_CACHE_TTL);
        console.log(`[SmartOLT] Cached ${raw.onus.length} GPS coordinates`);
        return raw.onus;
    }

    // Fallback: try per-OLT if we have OLT IDs (works when bulk is 403)
    if (oltIds && oltIds.length > 0) {
        console.log(`[SmartOLT] Bulk GPS failed, trying per-OLT for ${oltIds.length} OLTs...`);
        const allCoords: OnuCoordinateRaw[] = [];
        for (const oltId of oltIds) {
            const perOlt = await smartoltFetch<SmartOLTGpsResponse>(
                `/api/onu/get_all_onus_gps_coordinates?olt_id=${oltId}`
            );
            if (perOlt && perOlt.status && perOlt.onus) {
                allCoords.push(...perOlt.onus);
            }
        }
        if (allCoords.length > 0) {
            cacheSet(CACHE_KEY, allCoords, DETAILS_CACHE_TTL);
            console.log(`[SmartOLT] Cached ${allCoords.length} GPS coordinates (per-OLT fallback)`);
        }
        return allCoords;
    }

    return [];
}

// ── Deterministic coordinate spread ──────────────────────────────────
function seededOffset(seed: string, radiusKm: number): { dlat: number; dlng: number } {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    const r = radiusKm / 111.32;
    const angle = ((hash & 0xFFFF) / 0xFFFF) * Math.PI * 2;
    const dist = (((hash >>> 16) & 0xFFFF) / 0xFFFF) * r;
    return {
        dlat: dist * Math.cos(angle),
        dlng: dist * Math.sin(angle),
    };
}

// ── Main dashboard merge ─────────────────────────────────────────────
export async function fetchDashboardData(): Promise<DashboardOnu[]> {
    // Fast path: statuses + unconfigured (always fresh, no rate limit)
    // Slow path: details + zones (cached, rate-limited)
    const [statuses, unconfigured, details, zones] = await Promise.all([
        fetchAllOnuStatuses(),
        fetchUnconfiguredOnus(),
        fetchOnuDetails(),
        fetchZones(),
    ]);

    // Extract unique OLT IDs from details for per-OLT GPS fallback
    const oltIds = [...new Set(details.map(d => d.olt_id).filter(Boolean))];

    // Fetch GPS coordinates (tries bulk first, falls back to per-OLT)
    const coordinates = await fetchAllOnuCoordinates(oltIds);

    console.log(`[SmartOLT] Merge: ${statuses.length} statuses, ${unconfigured.length} unconfigured, ${details.length} details, ${zones.length} zones, ${coordinates.length} coords`);

    // Build lookup maps from cached data
    const detailMap = new Map<string, OnuDetailRaw>();
    for (const d of details) {
        detailMap.set(d.sn, d);
    }

    const zoneMap = new Map<string, string>();
    for (const z of zones) {
        zoneMap.set(z.id, z.name);
    }

    const coordMap = new Map<string, { lat: number; lng: number }>();
    for (const c of coordinates) {
        const lat = parseFloat(c.latitude);
        const lng = parseFloat(c.longitude);
        if (!isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0)) {
            coordMap.set(c.sn, { lat, lng });
        }
    }

    // Build olt_id → olt_name map from details
    const oltIdToName = new Map<string, string>();
    for (const d of details) {
        if (d.olt_id && d.olt_name && !oltIdToName.has(d.olt_id)) {
            oltIdToName.set(d.olt_id, d.olt_name);
        }
    }

    // Map center fallback
    const centerLat = parseFloat(process.env.NEXT_PUBLIC_MAP_CENTER_LAT || '-6.2088');
    const centerLng = parseFloat(process.env.NEXT_PUBLIC_MAP_CENTER_LNG || '106.8456');

    const dashboard: DashboardOnu[] = [];

    for (const s of statuses) {
        const detail = detailMap.get(s.sn);
        const coord = coordMap.get(s.sn);

        // Coordinates: prefer GPS, else deterministic spread
        let lat: number, lng: number;
        if (coord) {
            lat = coord.lat;
            lng = coord.lng;
        } else {
            const offset = seededOffset(s.sn, 12);
            lat = centerLat + offset.dlat;
            lng = centerLng + offset.dlng;
        }

        // Status
        const validStatuses = ['Online', 'Power fail', 'LOS', 'Offline'] as const;
        let status: DashboardOnu['status'] = 'Offline';
        if (validStatuses.includes(s.status as typeof validStatuses[number])) {
            status = s.status as DashboardOnu['status'];
        }

        // Name: from details (customer name) > SN fallback
        const name = detail?.name || s.sn;

        // OLT name: from details > oltId map > "OLT-{id}" fallback
        const oltName = detail?.olt_name || oltIdToName.get(s.olt_id) || `OLT-${s.olt_id}`;

        // Zone: from details > zone map > "Zone-{id}" fallback
        const zone = detail?.zone || zoneMap.get(s.zone_id) || `Zone-${s.zone_id}`;

        dashboard.push({
            id: s.unique_external_id || s.sn,
            sn: s.sn,
            name,
            status,
            lat,
            lng,
            olt_name: oltName,
            zone,
            board: s.board,
            port: s.port,
        });
    }

    // Append unconfigured ONUs (they are NOT in get_onus_statuses)
    const statusSns = new Set(statuses.map(s => s.sn));
    for (const u of unconfigured) {
        if (statusSns.has(u.sn)) continue; // skip if already in statuses

        const detail = detailMap.get(u.sn);
        const coord = coordMap.get(u.sn);

        let lat: number, lng: number;
        if (coord) {
            lat = coord.lat;
            lng = coord.lng;
        } else {
            const offset = seededOffset(u.sn, 12);
            lat = centerLat + offset.dlat;
            lng = centerLng + offset.dlng;
        }

        // Resolve OLT name: unconfigured endpoint often has empty olt_name
        const oltName = u.olt_name || oltIdToName.get(u.olt_id) || detail?.olt_name || `OLT-${u.olt_id}`;

        dashboard.push({
            id: u.sn,
            sn: u.sn,
            name: detail?.name || u.sn,
            status: 'Unconfigured',
            lat,
            lng,
            olt_name: oltName,
            zone: detail?.zone || `Zone-unknown`,
            board: u.board,
            port: u.port,
        });
    }

    return dashboard;
}
