import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchDashboardData } from '@/lib/smartolt';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const cronSecret = url.searchParams.get('secret');

    const isAuthorizedAdmin = session?.user?.role === 'ADMIN';
    const isAuthorizedCron = cronSecret === process.env.CRON_SECRET && process.env.CRON_SECRET;

    if (!isAuthorizedAdmin && !isAuthorizedCron) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('Starting SmartOLT ONU Sync using robust Dashboard Data fetcher...');

        // Use our robust helper which handles rate limits, caching, and GPS fallbacks!
        const dashboardData = await fetchDashboardData();

        if (!dashboardData || dashboardData.length === 0) {
            throw new Error('No data returned from SmartOLT (or rate limits completely blocked us)');
        }

        console.log(`Fetched ${dashboardData.length} ONUs from SmartOLT. Starting DB upsert...`);

        let updatedCount = 0;

        // Process records
        for (const onu of dashboardData) {
            const onuData = {
                sn: onu.sn,
                name: onu.name,
                zone_id: onu.zone, // We store zone name into zone_id field for simplicity in this mapper
                zone_name: onu.zone,
                olt_id: onu.olt_name, // Store name in ID for simplicity
                olt_name: onu.olt_name,
                status: onu.status,
                signal: null, // Signals are not passed in dashboardData currently, would need details lookup
                latitude: onu.lat,
                longitude: onu.lng,
                last_online: new Date(), // Approximate since we just fetched it
            };

            await prisma.smartOltOnu.upsert({
                where: { id: onu.id },
                update: onuData,
                create: {
                    id: onu.id,
                    ...onuData,
                },
            });

            updatedCount++;
        }

        return NextResponse.json({
            success: true,
            message: 'Sync completed successfully',
            syncedCount: updatedCount,
        });

    } catch (error: any) {
        console.error('SmartOLT Sync Error:', error.message);
        return NextResponse.json({ error: 'Failed to sync with SmartOLT', details: error.message }, { status: 500 });
    }
}
