import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'DRAFTER') {
        return NextResponse.json({ error: 'Unauthorized (requires Admin/Drafter)' }, { status: 403 });
    }

    try {
        const { id } = await params;

        // Prisma does not automatically delete relations unless onDelete cascade is configured.
        // We delete cores first manually just in case, or we use a transaction
        await prisma.$transaction([
            prisma.cableCore.deleteMany({ where: { cableId: id } }),
            prisma.cable.delete({ where: { id } })
        ]);

        return NextResponse.json({ message: 'Cable deleted' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
