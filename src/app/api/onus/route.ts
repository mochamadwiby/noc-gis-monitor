import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const onus = await prisma.smartOltOnu.findMany({
            where: {
                latitude: { not: null },
                longitude: { not: null },
            },
            select: {
                id: true,
                sn: true,
                name: true,
                zone_name: true,
                olt_name: true,
                status: true,
                signal: true,
                latitude: true,
                longitude: true,
                last_online: true,
            },
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json(onus);
    } catch (error) {
        console.error("Error fetching ONUs:", error);
        return NextResponse.json({ error: "Gagal mengambil data ONU" }, { status: 500 });
    }
}
