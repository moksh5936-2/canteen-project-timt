import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cookieStore = await cookies();
  const vendorId = cookieStore.get('vendor_session')?.value;
  if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Fetch orders that contain items belonging to this vendor
  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
      },
      items: {
        some: {
          menuItem: { vendorId }
        }
      }
    },
    include: {
      items: {
        where: { menuItem: { vendorId } },
        include: { menuItem: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(orders);
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const vendorId = cookieStore.get('vendor_session')?.value;
  if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { orderId, status } = await request.json();

    // Verify the vendor has items in this order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { menuItem: true } } }
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const hasVendorItem = order.items.some((item: any) => item.menuItem.vendorId === vendorId);
    
    if (!hasVendorItem) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
