# TIMT Canteen Web Application

**Made by: Moksh**

Welcome to the TIMT Canteen Web App! This is a modern, responsive, and dynamic platform designed to digitize the college canteen experience, empowering both students and the vendor.

## Features Let's Dive In

### For Students
- **Funky & Poppy UI:** A fully custom, dark-themed glassmorphic design that looks appealing on all devices.
- **Dynamic Menu & Cart:** Quickly browse food items, adjust quantities, and build a cart instantly.
- **Fast Checkout:** Seamlessly provide your Name and Roll Number.
- **Live Tracker Display:** Watch your order change states in real-time (e.g. "Order Accepted", "Cooking your meal", "Ready for Pickup!"). 

### For The Vendor
- **Protected Dashboard:** Log in natively through `/vendor/login` (Default username: `canteen@timt.ac.in`).
- **Live Orders System:** Watch incoming orders populate your dashboard dynamically via polling. Change statuses efficiently.
- **Interactive Menu Editor:** Utilizes `@dnd-kit` for full drag-and-drop capabilities. Effortlessly create, toggle visibility, delete, or rearrange items. Everything Syncs securely.
- **Future SMS Integration:** Skeleton logic built to plug in Twilio keys seamlessly to ping your phone immediately!

## Technology Stack
- **Framework:** Next.js 16 (React) Serverless
- **Database:** PostgreSQL (via Prisma ORM)
- **Styling:** Custom Next.js pure CSS (`globals.css`)
- **Drag-And-Drop:** `@dnd-kit` React Native implementation
- **Icons:** Lucide React

## Local Development Instructions
1. Clone the repository.
2. Install dependencies: `npm install`.
3. You need a Postgres database. To generate the SQL mappings on your DB, run `npx prisma db push`.
4. Run locally: `npm run dev` and navigate to `http://localhost:3000`.

*Note: For a simple local test environment without Postgres, change the Prisma schema provider back to "sqlite" and the URL to "file:./dev.db".*

> Project structure and codebase maintained under MIT License conventions for internal educational purposes by Moksh.
