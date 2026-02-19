/**
 * Mock data for development/demo when SmartOLT API is not available
 */

import { DashboardOnu } from './smartolt';

// Generate mock ONUs scattered around Jakarta area
function randomCoord(centerLat: number, centerLng: number, radiusKm: number) {
    const r = radiusKm / 111.32; // rough degrees
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * r;
    return {
        lat: centerLat + dist * Math.cos(angle),
        lng: centerLng + dist * Math.sin(angle),
    };
}

const statuses: DashboardOnu['status'][] = ['Online', 'Online', 'Online', 'Online', 'Online', 'Online', 'Online', 'Online', 'LOS', 'Power fail', 'Offline', 'Online', 'Online', 'Online', 'Unconfigured', 'Online', 'Online', 'Online', 'Online', 'Online'];

const oltNames = ['OLT-JAKARTA-01', 'OLT-JAKARTA-02', 'OLT-BOGOR-01', 'OLT-TANGERANG-01', 'OLT-BEKASI-01'];
const zones = ['Zone-A', 'Zone-B', 'Zone-C', 'Zone-D', 'Zone-E'];

export function generateMockData(count: number = 500): DashboardOnu[] {
    const centerLat = parseFloat(process.env.NEXT_PUBLIC_MAP_CENTER_LAT || '-6.2088');
    const centerLng = parseFloat(process.env.NEXT_PUBLIC_MAP_CENTER_LNG || '106.8456');

    const onus: DashboardOnu[] = [];

    for (let i = 0; i < count; i++) {
        const { lat, lng } = randomCoord(centerLat, centerLng, 15);
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const olt = oltNames[Math.floor(Math.random() * oltNames.length)];
        const zone = zones[Math.floor(Math.random() * zones.length)];

        onus.push({
            id: `ONU-${String(i + 1).padStart(5, '0')}`,
            sn: `ZTEG${String(Math.floor(Math.random() * 99999999)).padStart(8, '0')}`,
            name: `Customer-${i + 1}`,
            status,
            lat,
            lng,
            olt_name: olt,
            zone,
            board: String(Math.floor(Math.random() * 4)),
            port: String(Math.floor(Math.random() * 16)),
        });
    }

    return onus;
}
