import { NextResponse } from 'next/server';
import { fetchDashboardData, DashboardOnu } from '@/lib/smartolt';
import { generateMockData } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface DashboardResponse {
    onus: DashboardOnu[];
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

export async function GET() {
    try {
        const hasCredentials = process.env.SMARTOLT_BASE_URL && process.env.SMARTOLT_API_TOKEN;

        let onus: DashboardOnu[];
        let isMock = false;

        if (hasCredentials) {
            console.log('[Dashboard API] Fetching from SmartOLT...');
            onus = await fetchDashboardData();

            // Fall back to mock data when the API returns empty results
            // (e.g. invalid API key, expired token, no GPS data configured)
            if (onus.length === 0) {
                console.warn('[Dashboard API] SmartOLT returned 0 ONUs, falling back to mock data');
                onus = generateMockData(500);
                isMock = true;
            }
        } else {
            // Use mock data for demo/development
            console.log('[Dashboard API] No SmartOLT credentials, using mock data');
            onus = generateMockData(500);
            isMock = true;
        }

        const stats = {
            total: onus.length,
            online: onus.filter(o => o.status === 'Online').length,
            los: onus.filter(o => o.status === 'LOS').length,
            offline: onus.filter(o => o.status === 'Offline').length,
            powerFail: onus.filter(o => o.status === 'Power fail').length,
            unconfigured: onus.filter(o => o.status === 'Unconfigured').length,
        };

        const response: DashboardResponse = {
            onus,
            stats,
            mapConfig: {
                centerLat: parseFloat(process.env.NEXT_PUBLIC_MAP_CENTER_LAT || '-6.2088'),
                centerLng: parseFloat(process.env.NEXT_PUBLIC_MAP_CENTER_LNG || '106.8456'),
                zoom: parseInt(process.env.NEXT_PUBLIC_MAP_ZOOM || '12', 10),
                refreshInterval: parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || '30000', 10),
            },
            timestamp: new Date().toISOString(),
            isMock,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('[Dashboard API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}
