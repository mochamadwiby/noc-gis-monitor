import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const odps = await prisma.odp.findMany({
            include: { odc: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(odps);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'DRAFTER') {
        return NextResponse.json({ error: 'Unauthorized (requires Admin/Drafter)' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, latitude, longitude, capacity, odcId } = body;

        // Validate required fields
        if (!name || latitude === undefined || longitude === undefined || !odcId) {
            return NextResponse.json({ error: 'Name, latitude, longitude, and ODC association are required' }, { status: 400 });
        }

        const newOdp = await prisma.odp.create({
            data: {
                name,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                capacity: capacity ? parseInt(capacity) : 8,
                odcId,
            }
        });

        return NextResponse.json(newOdp, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'An ODP with this name already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
