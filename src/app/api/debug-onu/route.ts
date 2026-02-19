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

        return NextResponse.json({
            requested_sn: sn,
            timestamp: new Date().toISOString(),
            debug_summary: {
                found_in_details: !!detail,
                found_in_gps_endpoint: !!coord,
                found_in_statuses: !!status,
                coordinate_source: coord ? 'GPS_ENDPOINT' : 'NONE (Using default fallback)',
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
