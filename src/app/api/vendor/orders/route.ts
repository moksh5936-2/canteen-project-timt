import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cookieStore = await cookies();
  const vendorId = cookieStore.get('vendor_session')?.value;
  if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch orders that contain items belonging to this vendor
  const orders = await prisma.order.findMany({
    where: {
      items: {
        some: {
          menuItem: { vendorId }
        }
      }
    },
    include: {
      items: {
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

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
