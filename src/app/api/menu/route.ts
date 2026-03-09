import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await prisma.menuItem.findMany({
      where: { isAvailable: true },
      orderBy: { orderIndex: 'asc' },
      include: { vendor: { select: { name: true } } }
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("DEBUG MENU API ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch menu", details: String(error) }, { status: 500 });
  }
}
