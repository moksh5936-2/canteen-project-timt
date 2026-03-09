"use client";

import { useState, useEffect } from "react";
import { Loader2, Minus, Plus, ShoppingCart, UtensilsCrossed, ArrowRight, CheckCircle, Clock, Truck, PartyPopper } from "lucide-react";

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  vendor: { name: string };
};

type CartItem = MenuItem & { quantity: number };

export default function Home() {
  const [view, setView] = useState<"MENU" | "CHECKOUT" | "TRACKING">("MENU");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Checkout form
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tracking
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState("PENDING");

  useEffect(() => {
    fetch("/api/menu")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMenu(data);
        } else {
          console.error("API returned error:", data);
          setMenu([]); 
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setMenu([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (view === "TRACKING" && orderId && orderStatus !== "COMPLETED" && orderStatus !== "CANCELLED") {
      interval = setInterval(() => {
        fetch(`/api/orders/${orderId}`)
          .then(res => res.json())
          .then(data => {
            if (data.status) setOrderStatus(data.status);
          });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [view, orderId, orderStatus]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rollNo || cart.length === 0) return;
    setIsSubmitting(true);

    const payload = {
      studentName: name,
      rollNo,
      items: cart.map(i => ({ id: i.id, quantity: i.quantity, price: i.price })),
      totalAmount
    };

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      setOrderId(data.orderId);
      setCart([]);
      setView("TRACKING");
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={64} className="animate-pulse" color="var(--color-primary)" />
      </div>
    );
  }

  // --- RENDERING VIEWS ---

  if (view === "TRACKING") {
    const getStatusDetails = () => {
      switch (orderStatus) {
        case "PENDING": return { icon: <Clock size={48} className="animate-pulse" color="var(--color-primary)" />, text: "Waiting for vendor to accept", color: "var(--color-primary)" };
        case "ACCEPTED": return { icon: <CheckCircle size={48} color="var(--color-secondary)" />, text: "Order Accepted! Preparing to cook.", color: "var(--color-secondary)" };
        case "PREPARING": return { icon: <UtensilsCrossed size={48} className="animate-pulse" color="var(--color-accent)" />, text: "Cooking your meal... 🍳", color: "var(--color-accent)" };
        case "READY": return { icon: <Truck size={48} className="animate-float" color="var(--color-success)" />, text: "Order is Ready for Pickup! 🏃", color: "var(--color-success)" };
        case "COMPLETED": return { icon: <PartyPopper size={48} color="var(--color-text-muted)" />, text: "Order Completed. Enjoy! 🎉", color: "var(--color-text-muted)" };
        default: return { icon: <Loader2 size={48} />, text: "Tracking...", color: "white" };
      }
    };

    const { icon, text, color } = getStatusDetails();

    return (
      <div className="container" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <h1 className="heading-xl" style={{ textAlign: "center", marginBottom: "40px" }}>Live Tracker</h1>
        
        <div className="glass-panel text-center" style={{ padding: "60px", maxWidth: "500px", width: "100%", textAlign: "center", borderTop: `4px solid ${color}`, transition: "all 0.5s ease" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
            {icon}
          </div>
          <h2 className="heading-lg" style={{ color, marginBottom: "16px" }}>{orderStatus}</h2>
          <p className="text-muted" style={{ fontSize: "1.2rem" }}>{text}</p>
          
          <div style={{ marginTop: "40px", padding: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
            <p className="text-muted" style={{ margin: 0, fontSize: "0.9rem" }}>Order ID: {orderId}</p>
          </div>
        </div>

        {orderStatus === "COMPLETED" && (
          <button onClick={() => setView("MENU")} className="btn btn-primary" style={{ marginTop: "32px" }}>
            Order Again
          </button>
        )}
      </div>
    );
  }

  if (view === "CHECKOUT") {
    return (
      <div className="container" style={{ padding: "40px 24px" }}>
        <button onClick={() => setView("MENU")} className="btn btn-outline" style={{ marginBottom: "32px" }}>← Back to Menu</button>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
          
          <div className="glass-panel" style={{ padding: "32px" }}>
            <h2 className="heading-lg text-gradient" style={{ marginBottom: "24px" }}>Checkout</h2>
            <form onSubmit={handleCheckout} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label className="text-muted" style={{ display: "block", marginBottom: "8px" }}>Full Name</label>
                <input required className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" />
              </div>
              <div>
                <label className="text-muted" style={{ display: "block", marginBottom: "8px" }}>Roll Number</label>
                <input required className="input-field" value={rollNo} onChange={e => setRollNo(e.target.value)} placeholder="e.g. 21CS001" />
              </div>

              <div style={{ background: "rgba(0, 210, 255, 0.1)", border: "1px solid var(--color-secondary)", borderRadius: "12px", padding: "16px", marginTop: "12px" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
                  Payments are simulated internally for this demonstration.
                </p>
              </div>

              <button type="submit" disabled={isSubmitting || cart.length === 0} className="btn btn-primary" style={{ marginTop: "8px", width: "100%", padding: "16px" }}>
                {isSubmitting ? "Processing..." : `Pay ₹${totalAmount.toFixed(2)}`}
              </button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: "32px" }}>
            <h3 className="heading-md" style={{ marginBottom: "24px" }}>Order Summary</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{item.quantity}x {item.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--color-secondary)" }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "var(--glass-border)", margin: "24px 0" }}></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="heading-md" style={{ color: "var(--color-text-muted)" }}>Total</span>
              <span className="heading-md text-gradient">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // DEFAULT VIEW: MENU
  return (
    <div style={{ paddingBottom: "100px" }}>
      {/* Header */}
      <header className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px", paddingTop: "40px", marginBottom: "24px" }}>
        <h1 className="heading-xl text-gradient" style={{ margin: 0 }}>Canteen</h1>
        
        {cartItemCount > 0 && (
          <button onClick={() => setView("CHECKOUT")} className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 24px", cursor: "pointer", border: "1px solid var(--color-primary)", background: "rgba(255, 46, 147, 0.15)", outline: "none" }}>
            <ShoppingCart color="var(--color-text)" size={24} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ fontWeight: 800, lineHeight: 1 }}>{cartItemCount} items</span>
              <span style={{ fontSize: "0.85rem", color: "var(--color-secondary)" }}>₹{totalAmount.toFixed(2)}</span>
            </div>
            <ArrowRight size={20} style={{ marginLeft: "8px" }} />
          </button>
        )}
      </header>

      <main className="container">
        {menu.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px" }}>
            <p className="heading-md text-muted">The canteen is currently updating the menu. Come back soon!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "32px" }}>
            {menu.map(item => {
              const inCart = cart.find(i => i.id === item.id);
              return (
                <div key={item.id} className="glass-panel" style={{ display: "flex", flexDirection: "column", padding: "24px", height: "100%", position: "relative", overflow: "hidden" }}>
                  {inCart && (
                    <div style={{ position: "absolute", top: 0, right: 0, background: "var(--color-primary)", color: "white", padding: "8px 16px", borderBottomLeftRadius: "16px", fontWeight: 800 }}>
                      {inCart.quantity} in cart
                    </div>
                  )}
                  
                  <div style={{ flexGrow: 1, marginBottom: "24px", marginTop: "12px" }}>
                    <h3 className="heading-md" style={{ marginBottom: "8px" }}>{item.name}</h3>
                    <span className="text-muted" style={{ display: "inline-block", padding: "4px 12px", background: "var(--color-surface-light)", borderRadius: "100px", fontSize: "0.8rem", marginBottom: "12px" }}>
                      {item.vendor.name}
                    </span>
                    {item.description && <p className="text-muted" style={{ fontSize: "0.95rem" }}>{item.description}</p>}
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="heading-lg" style={{ color: "var(--color-secondary)" }}>₹{item.price}</span>
                    
                    {inCart ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--color-surface-light)", padding: "4px", borderRadius: "12px" }}>
                        <button onClick={() => removeFromCart(item.id)} style={{ padding: "8px", background: "var(--color-bg)", border: "none", borderRadius: "8px", cursor: "pointer", color: "white" }}>
                          <Minus size={16} />
                        </button>
                        <span style={{ fontWeight: 700, width: "20px", textAlign: "center" }}>{inCart.quantity}</span>
                        <button onClick={() => addToCart(item)} style={{ padding: "8px", background: "var(--color-primary)", border: "none", borderRadius: "8px", cursor: "pointer", color: "white" }}>
                          <Plus size={16} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(item)} className="btn btn-outline" style={{ padding: "12px 16px", borderColor: "var(--color-primary)", color: "var(--color-primary)" }}>
                        Add to Cart <Plus size={16} style={{ marginLeft: "4px" }} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
