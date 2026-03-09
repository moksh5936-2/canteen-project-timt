"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Menu as MenuIcon, LogOut, Utensils } from "lucide-react";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/vendor/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await fetch("/api/vendor/logout", { method: "POST" });
    router.push("/vendor/login");
  };

  const navLinks = [
    { href: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/vendor/menu", label: "Menu Editor", icon: MenuIcon },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
      {/* Sidebar */}
      <aside className="glass-panel" style={{ width: "260px", padding: "24px", display: "flex", flexDirection: "column", borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderRight: "var(--glass-border)", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
          <Utensils color="var(--color-primary)" size={28} />
          <h2 className="heading-md" style={{ margin: 0 }}>Canteen</h2>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "12px", flexGrow: 1 }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  textDecoration: "none",
                  color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                  background: isActive ? "rgba(255, 46, 147, 0.1)" : "transparent",
                  transition: "all var(--transition-fast)",
                  fontWeight: isActive ? 600 : 400
                }}
              >
                <Icon size={20} />
                {link.label}
              </Link>
            )
          })}
        </nav>

        <button 
          onClick={handleLogout}
          className="btn btn-outline" 
          style={{ width: "100%", justifyContent: "flex-start", padding: "12px 16px", border: "none" }}
        >
          <LogOut size={20} style={{ marginRight: "12px" }} />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ flexGrow: 1, padding: "32px", overflowY: "auto", position: 'relative' }}>
        {children}
      </main>
    </div>
  );
}
