"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, Clock, CheckCircle2, TrendingUp, RefreshCw } from "lucide-react";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  menuItem: { name: string };
};

type Order = {
  id: string;
  studentName: string;
  rollNo: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
};

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOrders = async (background = false) => {
    if (!background) setLoading(true);
    else setIsRefreshing(true);

    const res = await fetch("/api/vendor/orders");
    if (res.ok) {
      const data = await res.json();
      setOrders(data);
    }
    
    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchOrders();
    // Poll every 5 seconds for new orders
    const interval = setInterval(() => fetchOrders(true), 5000);
    return () => clearInterval(interval);
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // Optimistic UI update
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    
    await fetch("/api/vendor/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status: newStatus }),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "var(--color-primary)";
      case "ACCEPTED": return "var(--color-secondary)";
      case "PREPARING": return "var(--color-accent)";
      case "READY": return "var(--color-success)";
      case "COMPLETED": return "var(--color-text-muted)";
      default: return "var(--color-text-muted)";
    }
  };

  const activeOrders = orders.filter(o => o.status !== "COMPLETED" && o.status !== "CANCELLED");
  const pastOrders = orders.filter(o => o.status === "COMPLETED" || o.status === "CANCELLED");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="heading-lg text-gradient" style={{ marginBottom: "8px" }}>Live Orders</h1>
          <p className="text-muted">Manage your fast-paced flow 🚀</p>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {isRefreshing && <RefreshCw size={20} className="animate-pulse" color="var(--color-secondary)" />}
          <div className="glass-panel" style={{ padding: "12px 24px", display: "flex", gap: "12px", alignItems: "center", borderRadius: "0px", border: "var(--hard-border)", boxShadow: "var(--hard-shadow)", background: "var(--color-accent)" }}>
            <TrendingUp size={20} color="var(--color-text)" />
            <span style={{ fontSize: "1.2rem", fontWeight: 700 }}>₹{orders.reduce((acc, o) => acc + o.totalAmount, 0).toFixed(2)}</span>
            <span className="text-muted" style={{ fontSize: "0.9rem" }}>today</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px" }}>
          <Loader2 className="animate-pulse" size={48} color="var(--color-primary)" />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <h2 className="heading-md">Active Orders ({activeOrders.length})</h2>
          {activeOrders.length === 0 ? (
            <div className="glass-panel" style={{ padding: "40px", textAlign: "center", borderRadius: "0px" }}>
              <p className="text-muted">No active orders right now. Time to prep!</p>
            </div>
          ) : (
            <div className="vendor-dashboard-grid">
              {activeOrders.map(order => (
                <div key={order.id} className="glass-panel animate-float" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", borderTop: `8px solid ${getStatusColor(order.status)}`, borderRadius: "0px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>{order.studentName}</h3>
                      <p className="text-muted" style={{ fontSize: "0.9rem", margin: 0 }}>Roll: {order.rollNo}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--color-secondary)" }}>₹{order.totalAmount}</span>
                      <p style={{ fontSize: "0.8rem", color: getStatusColor(order.status), fontWeight: 700, margin: 0 }}>{order.status}</p>
                    </div>
                  </div>

                  <div style={{ background: "var(--color-surface-light)", borderRadius: "0px", border: "var(--hard-border)", padding: "12px", boxShadow: "4px 4px 0 #000" }}>
                    {order.items.map(item => (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", marginBottom: "4px" }}>
                        <span><span style={{ color: "var(--color-primary)", fontWeight: 700 }}>{item.quantity}x</span> {item.menuItem.name}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: "auto", display: "flex", gap: "8px" }}>
                    {order.status === "PENDING" && (
                      <button onClick={() => updateOrderStatus(order.id, "ACCEPTED")} className="btn btn-secondary" style={{ flexGrow: 1, padding: "12px", borderRadius: "0px" }}>
                        Accept <CheckCircle size={16} />
                      </button>
                    )}
                    {(order.status === "ACCEPTED" || order.status === "PREPARING") && (
                      <button onClick={() => updateOrderStatus(order.id, "READY")} className="btn btn-outline" style={{ flexGrow: 1, padding: "12px", borderColor: "var(--color-accent)", color: "var(--color-accent)", borderRadius: "0px" }}>
                        Mark Ready <Clock size={16} />
                      </button>
                    )}
                    {order.status === "READY" && (
                      <button onClick={() => updateOrderStatus(order.id, "COMPLETED")} className="btn btn-primary" style={{ flexGrow: 1, padding: "12px", background: "var(--color-success)", color: "var(--color-text)", borderRadius: "0px" }}>
                        Complete <CheckCircle2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {pastOrders.length > 0 && (
            <>
              <h2 className="heading-md" style={{ marginTop: "32px", opacity: 0.7 }}>Completed Orders ({pastOrders.length})</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", opacity: 0.7 }}>
                {pastOrders.map(order => (
                  <div key={order.id} className="glass-panel" style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{order.studentName}</span>
                      <span className="text-muted" style={{ margin: "0 12px" }}>|</span>
                      <span className="text-muted">{order.items.length} items of the menu</span>
                    </div>
                    <span style={{ fontWeight: 700 }}>₹{order.totalAmount}</span>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}
