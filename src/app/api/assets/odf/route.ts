import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const odfs = await prisma.odf.findMany({
            include: { olt: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(odfs);
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
        const { name, latitude, longitude, capacity, oltId } = body;

        // Validate required fields
        if (!name || latitude === undefined || longitude === undefined) {
            return NextResponse.json({ error: 'Name, latitude, and longitude are required' }, { status: 400 });
        }

        const newOdf = await prisma.odf.create({
            data: {
                name,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                capacity: capacity ? parseInt(capacity) : 144,
                oltId: oltId || null,
            }
        });

        return NextResponse.json(newOdf, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'An ODF with this name already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
