import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // For simplicity, we are implementing a basic mock authentication.
    // In a real scenario, use proper password hashing (e.g. bcrypt)
    let vendor = await prisma.vendor.findUnique({
      where: { email },
    });

    // Seed a default admin if none exists for demo purposes
    if (!vendor && email === "canteen@timt.ac.in" && password === "canteen@123") {
      vendor = await prisma.vendor.create({
        data: {
          email: "canteen@timt.ac.in",
          password: "canteen@123", // Note: In production, hash this password
          name: "Main Canteen",
          phone: "+1234567890",
        }
      });
    }

    if (!vendor || vendor.password !== password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Set a session cookie
    const cookieStore = await cookies();
    cookieStore.set('vendor_session', vendor.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return NextResponse.json({ success: true, vendorId: vendor.id });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}
