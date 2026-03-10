"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle, Clock, CheckCircle2, TrendingUp, RefreshCw, ChevronDown, ChevronUp, BellRing } from "lucide-react";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  menuItem: { name: string };
};

type Order = {
  id: string;
  studentName: string;
  role: string;
  rollNo: string | null;
  phone: string | null;
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
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
  const knownOrderIdsRef = useRef<Set<string>>(new Set());

  const fetchOrders = async (background = false) => {
    if (!background) setLoading(true);
    else setIsRefreshing(true);

    const res = await fetch("/api/vendor/orders");
    if (res.ok) {
      const data: Order[] = await res.json();
      const currentKnown = knownOrderIdsRef.current;
      
      // Check if there is any active order that is not in our known state.
      // We only do this if knownOrderIds has been initialized (size > 0),
      // so we don't play sounds and toasts when the page first loads.
      if (currentKnown.size > 0 && data.length > 0) {
        const newActiveOrders = data.filter(o => 
          o.status !== "COMPLETED" && 
          o.status !== "CANCELLED" && 
          !currentKnown.has(o.id)
        );

        if (newActiveOrders.length > 0) {
          // Play sound
          try {
            const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
            audio.volume = 1.0;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.warn("Audio playback prevented by browser:", error);
              });
            }
          } catch (err) {
            console.error("Audio error:", err);
          }

          // Show Toast
          setNotification({ message: `New Order from ${newActiveOrders[0].studentName}!`, visible: true });
          setTimeout(() => {
            setNotification(prev => ({ ...prev, visible: false }));
          }, 5000); // hide after 5 seconds
        }
      }

      setOrders(data);
      // Update known orders to whatever we just fetched
      knownOrderIdsRef.current = new Set(data.map(o => o.id));
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

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
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
      {/* Floating Notification Toast */}
      {notification.visible && (
        <div className="glass-panel animate-pop" style={{ position: "fixed", top: "24px", right: "24px", zIndex: 1000, display: "flex", alignItems: "center", gap: "12px", background: "var(--color-success)", color: "white", padding: "16px 24px", borderRadius: "0px", border: "4px solid #000", boxShadow: "6px 6px 0 #000", fontWeight: 800, textTransform: "uppercase" }}>
          <BellRing className="animate-pulse" size={24} />
          {notification.message}
        </div>
      )}

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
              {activeOrders.map(order => {
                const isExpanded = expandedOrders.includes(order.id);
                return (
                  <div key={order.id} className="glass-panel animate-float" style={{ padding: 0, display: "flex", flexDirection: "column", borderTop: `8px solid ${getStatusColor(order.status)}`, borderRadius: "0px", overflow: "hidden" }}>
                    
                    {/* Top/Left: Order Entry Info (Header) */}
                    <div 
                      onClick={() => toggleOrderExpansion(order.id)}
                      style={{ padding: "20px", background: "var(--color-surface)", display: "flex", flexDirection: "column", gap: "12px", flexGrow: 1, cursor: "pointer", userSelect: "none" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
                            {order.studentName} {isExpanded ? <ChevronUp size={18} color="var(--color-text-muted)" /> : <ChevronDown size={18} color="var(--color-text-muted)" />}
                          </h3>
                          <p className="text-muted" style={{ fontSize: "0.9rem", margin: 0, fontWeight: 600 }}>
                            {order.role.toUpperCase()} {order.rollNo ? `| ROLL: ${order.rollNo}` : ''} {order.phone ? (
                               <span> | PHONE: <a href={`tel:${order.phone}`} style={{ color: "inherit", textDecoration: "underline" }}>{order.phone}</a></span>
                            ) : ''}
                          </p>
                        </div>
                        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--color-secondary)", lineHeight: 1 }}>₹{order.totalAmount}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", background: getStatusColor(order.status), color: "white", padding: "4px 8px", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {order.status}
                          </div>
                        </div>
                      </div>
                      <div className="text-muted" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={14} /> 
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Expandable Content Area */}
                    {isExpanded && (
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {/* Distinct Items List Container */}
                        <div style={{ background: "var(--color-bg)", padding: "16px 20px", borderTop: "2px solid #000" }}>
                          <h4 className="heading-md" style={{ fontSize: "0.9rem", marginBottom: "12px", color: "var(--color-text-muted)" }}>ORDER ITEMS</h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {order.items.map(item => (
                              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: "0.95rem", background: "var(--color-surface-light)", padding: "8px 12px", border: "1px dashed #000" }}>
                                <span style={{ fontWeight: 600 }}>{item.menuItem.name}</span>
                                <span style={{ color: "var(--color-primary)", fontWeight: 800, background: "var(--color-surface)", border: "1px solid #000", padding: "2px 6px", fontSize: "0.85rem" }}>x{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: "flex", borderTop: "2px solid #000" }}>
                          {order.status === "PENDING" && (
                            <button onClick={() => updateOrderStatus(order.id, "ACCEPTED")} className="btn btn-secondary" style={{ flexGrow: 1, padding: "16px", borderRadius: "0px", border: "none", display: "flex", justifyContent: "center" }}>
                              ACCEPT <CheckCircle size={18} />
                            </button>
                          )}
                          {(order.status === "ACCEPTED" || order.status === "PREPARING") && (
                            <button onClick={() => updateOrderStatus(order.id, "READY")} className="btn btn-outline" style={{ flexGrow: 1, padding: "16px", background: "var(--color-accent)", color: "var(--color-text)", borderRadius: "0px", border: "none", display: "flex", justifyContent: "center" }}>
                              MARK READY <Clock size={18} />
                            </button>
                          )}
                          {order.status === "READY" && (
                            <button onClick={() => updateOrderStatus(order.id, "COMPLETED")} className="btn btn-primary" style={{ flexGrow: 1, padding: "16px", background: "var(--color-success)", color: "var(--color-text)", borderRadius: "0px", border: "none", display: "flex", justifyContent: "center" }}>
                              COMPLETE <CheckCircle2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
