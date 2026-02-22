import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const core = await prisma.cableCore.findUnique({
            where: { id }
        });

        if (!core) return NextResponse.json({ error: 'Core not found' }, { status: 404 });

        return NextResponse.json(core);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'DRAFTER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = await req.json();

        // We only expect updates to the endpoints
        const { startType, startId, endType, endId } = body;

        const updatedCore = await prisma.cableCore.update({
            where: { id },
            data: {
                startType: startType !== undefined ? startType : undefined,
                startId: startId !== undefined ? startId : undefined,
                endType: endType !== undefined ? endType : undefined,
                endId: endId !== undefined ? endId : undefined,
            }
        });

        return NextResponse.json(updatedCore);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
