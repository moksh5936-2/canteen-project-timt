import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderNotification } from "@/lib/twilio";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentName, rollNo, items, totalAmount } = body;

    if (!studentName || !rollNo || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing required checkout fields" }, { status: 400 });
    }

    // Securely calculate total amount on the server
    let calculatedTotal = 0;
    const itemsData = [];
    for (const item of items) {
      const dbItem = await prisma.menuItem.findUnique({ where: { id: item.id } });
      if (!dbItem || !dbItem.isAvailable) {
        return NextResponse.json({ error: `Item ${item.name || item.id} is unavailable` }, { status: 400 });
      }
      calculatedTotal += dbItem.price * item.quantity;
      itemsData.push({ ...item, price: dbItem.price }); // Use DB price securely
    }

    // Create the order
    const order = await prisma.order.create({
      data: {
        studentName,
        rollNo,
        totalAmount: calculatedTotal,
        status: "PENDING",
        // In reality, this would be UNPAID and turn PAID via Stripe webhook. We mock it here.
        paymentStatus: "PAID", 
        items: {
          create: itemsData.map((item: any) => ({
            quantity: item.quantity,
            price: item.price,
            menuItem: { connect: { id: item.id } }
          }))
        }
      },
      include: {
        items: {
          include: { menuItem: { include: { vendor: true } } }
        }
      }
    });

    // Determine the vendor (simplification: assume all items from same vendor for SMS)
    const vendorPhone = order.items[0]?.menuItem.vendor.phone;
    if (vendorPhone) {
      await sendOrderNotification(vendorPhone, order);
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
