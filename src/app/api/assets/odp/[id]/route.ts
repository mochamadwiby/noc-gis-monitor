import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'DRAFTER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = await req.json();
        const { name, latitude, longitude, capacity, odcId } = body;

        const updatedOdp = await prisma.odp.update({
            where: { id },
            data: {
                name,
                latitude: latitude ? parseFloat(latitude) : undefined,
                longitude: longitude ? parseFloat(longitude) : undefined,
                capacity: capacity ? parseInt(capacity) : undefined,
                odcId,
            }
        });

        return NextResponse.json(updatedOdp);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'DRAFTER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { id } = await params;
        await prisma.odp.delete({ where: { id } });
        return NextResponse.json({ message: 'ODP deleted' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
