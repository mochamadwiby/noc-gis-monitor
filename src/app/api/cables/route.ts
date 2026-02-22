import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const FIBER_COLORS = [
    "Blue", "Orange", "Green", "Brown", "Slate", "White",
    "Red", "Black", "Yellow", "Violet", "Rose", "Aqua"
];

function generateDefaultCores(cableId: string, capacity: number) {
    const cores = [];
    for (let i = 1; i <= capacity; i++) {
        // Core color cycles every 12
        const colorIndex = (i - 1) % 12;
        // Tube color cycles every 12 (1-12 is Tube 1 Blue, 13-24 is Tube 2 Orange)
        const tubeIndex = Math.floor((i - 1) / 12) % 12;

        cores.push({
            cableId,
            number: i,
            color: FIBER_COLORS[colorIndex],
            tubeColor: FIBER_COLORS[tubeIndex]
        });
    }
    return cores;
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const cables = await prisma.cable.findMany({
            include: { cores: true }
        });
        return NextResponse.json(cables);
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
        const { name, type, capacity, path } = body;

        if (!name || !type || !capacity || !path) {
            return NextResponse.json({ error: 'Name, type, capacity, and path are required' }, { status: 400 });
        }

        // Create the cable
        const newCable = await prisma.cable.create({
            data: {
                name,
                type,
                capacity: parseInt(capacity),
                path, // Store the [lat, lng] array
            }
        });

        // Automatically generate cores for the cable
        const coresToCreate = generateDefaultCores(newCable.id, newCable.capacity);

        await prisma.cableCore.createMany({
            data: coresToCreate
        });

        // Fetch the fully created object
        const createdCableWithCores = await prisma.cable.findUnique({
            where: { id: newCable.id },
            include: { cores: true }
        });

        return NextResponse.json(createdCableWithCores, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
