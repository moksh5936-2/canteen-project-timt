import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function getVendorId() {
  const cookieStore = await cookies();
  return cookieStore.get('vendor_session')?.value;
}

export async function GET() {
  const vendorId = await getVendorId();
  if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.menuItem.findMany({
    where: { vendorId },
    orderBy: { orderIndex: 'asc' },
  });

  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const vendorId = await getVendorId();
  if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await request.json();
    
    // Get max orderIndex
    const lastItem = await prisma.menuItem.findFirst({
      where: { vendorId },
      orderBy: { orderIndex: 'desc' }
    });
    const nextIndex = lastItem ? lastItem.orderIndex + 1 : 0;

    const newItem = await prisma.menuItem.create({
      data: {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        halfPrice: data.halfPrice ? parseFloat(data.halfPrice) : null,
        fullPrice: data.fullPrice ? parseFloat(data.fullPrice) : null,
        image: data.image || null,
        category: data.category || "Main",
        vendorId,
        orderIndex: nextIndex,
      }
    });

    return NextResponse.json(newItem);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const vendorId = await getVendorId();
  if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { action, payload } = await request.json();

    if (action === "REORDER") {
      // payload is [{ id, orderIndex }]
      await prisma.$transaction(
        payload.map((item: any) => 
          prisma.menuItem.update({
            where: { id: item.id, vendorId },
            data: { orderIndex: item.orderIndex }
          })
        )
      );
      return NextResponse.json({ success: true });
    }

    if (action === "TOGGLE_AVAILABILITY") {
      const { id, isAvailable } = payload;
      const updated = await prisma.menuItem.update({
        where: { id, vendorId },
        data: { isAvailable }
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const vendorId = await getVendorId();
  if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const item = await prisma.menuItem.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (item.vendorId !== vendorId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.$transaction([
      prisma.orderItem.deleteMany({
        where: { menuItemId: id }
      }),
      prisma.menuItem.delete({
        where: { id }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Deletion failed", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
