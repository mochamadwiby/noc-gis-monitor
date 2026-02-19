import { NextResponse } from 'next/server';
import { fetchOnuDetails, fetchAllOnuCoordinates, fetchAllOnuStatuses, OnuDetailRaw } from '@/lib/smartolt';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sn = searchParams.get('sn');

    if (!sn) {
        return NextResponse.json({ error: 'Please provide ?sn=ZTEGC...' }, { status: 400 });
    }

    try {
        const [details, statuses] = await Promise.all([
            fetchOnuDetails(),
            fetchAllOnuStatuses(),
        ]);

        // Helper to extract all fields to check for hidden coordinates
        const detail = details.find(d => d.sn === sn);

        // We need to fetch coordinates with OLT ID if possible to trigger fallback
        let oltIds: string[] = [];
        if (detail && detail.olt_id) {
            oltIds = [detail.olt_id];
        } else {
            // Try to find OLT ID from statuses if details missing
            const s = statuses.find(x => x.sn === sn);
            if (s && s.olt_id) oltIds = [s.olt_id];
        }

        const coords = await fetchAllOnuCoordinates(oltIds);
        const coord = coords.find(c => c.sn === sn);
        const status = statuses.find(s => s.sn === sn);

        // Simulate fetchDashboardData logic to see what it WOULD pick
        let resolved_lat = 0;
        let resolved_lng = 0;
        let method = 'Unknown';

        if (coord) {
            resolved_lat = parseFloat(coord.latitude);
            resolved_lng = parseFloat(coord.longitude);
            method = 'GPS_ENDPOINT';
        } else if (detail && detail.latitude && detail.longitude) {
            resolved_lat = parseFloat(detail.latitude as string);
            resolved_lng = parseFloat(detail.longitude as string);
            method = 'DETAILS_FALLBACK';
        } else {
            method = 'SEEDED_OFFSET (Failed)';
        }

        return NextResponse.json({
            requested_sn: sn,
            timestamp: new Date().toISOString(),
            app_version: 'v1.0.2', // Hardcoded marker to check deployment
            logic_test: {
                resolved_lat,
                resolved_lng,
                method,
                detail_has_lat: detail ? 'latitude' in detail : false,
                detail_has_lng: detail ? 'longitude' in detail : false,
                lat_value: detail?.latitude,
            },
            debug_summary: {
                found_in_details: !!detail,
                found_in_gps_endpoint: !!coord,
                found_in_statuses: !!status,
            },
            raw_data: {
                // Return full objects to see all fields
                detail_endpoint: detail || null,
                gps_endpoint: coord || null,
                status_endpoint: status || null,
            }
        }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
