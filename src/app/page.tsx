"use client";

import { useState, useEffect } from "react";
import { Loader2, ShoppingCart, UtensilsCrossed, ArrowRight, CheckCircle, Clock, Truck, PartyPopper, ChevronDown } from "lucide-react";

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  category: string;
  isAvailable: boolean;
  halfPrice: number | null;
  fullPrice: number | null;
  vendor: { name: string };
};

type CartItem = MenuItem & { quantity: number, variant?: "Half" | "Full" };

export default function Home() {
  // Restore state from sessionStorage (survives app-switch / page refresh)
  const [view, setView] = useState<"MENU" | "CHECKOUT" | "TRACKING">(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("cc_view");
      if (saved === "TRACKING" || saved === "CHECKOUT") return saved;
    }
    return "MENU";
  });
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Checkout form
  const [name, setName] = useState("");
  const [role, setRole] = useState<"Student" | "Teacher">("Student");
  const [phone, setPhone] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upsell Side-Drawer flow
  const [upsellItem, setUpsellItem] = useState<MenuItem | null>(null);
  const [animatingItemId, setAnimatingItemId] = useState<string | null>(null);
  // "You'd Also Like" section collapsed by default
  const [youLikeOpen, setYouLikeOpen] = useState(false);

  // Tracking
  const [orderId, setOrderId] = useState<string | null>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("cc_orderId") : null
  );
  const [orderStatus, setOrderStatus] = useState<string>(() =>
    typeof window !== "undefined" ? (sessionStorage.getItem("cc_orderStatus") || "PENDING") : "PENDING"
  );

  // Persist view/orderId/orderStatus to sessionStorage whenever they change
  useEffect(() => { sessionStorage.setItem("cc_view", view); }, [view]);
  useEffect(() => { if (orderId) sessionStorage.setItem("cc_orderId", orderId); }, [orderId]);
  useEffect(() => { sessionStorage.setItem("cc_orderStatus", orderStatus); }, [orderStatus]);

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

  const addToCartAndTriggerUpsell = (item: MenuItem, variant?: "Half" | "Full", fromDrawer?: boolean) => {
    // Check if it's already in cart (incrementing) — if so, no drawer needed
    const alreadyInCart = cart.some(i => i.id === item.id && i.variant === variant);

    // Add to cart
    addToCart(item, variant);

    // Trigger pop animation
    setAnimatingItemId(item.id);
    setTimeout(() => setAnimatingItemId(null), 300);

    // Open drawer only on FIRST add (not when user bumps quantity with +)
    // If already in drawer (fromDrawer=true), keep it open on the same item
    if (!alreadyInCart) {
      const hasUpsells = menu.some(m =>
        m.vendor.name === item.vendor.name &&
        m.isAvailable &&
        (m.category === "Addon" || (m.category === "Main" && m.id !== item.id))
      );
      if (hasUpsells) {
        setYouLikeOpen(false); // always reset collapse on new open
        setUpsellItem(item);
      }
    }
  };

  const addToCart = (item: MenuItem, variant?: "Half" | "Full") => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.variant === variant);
      if (existing) {
        return prev.map(i => (i.id === item.id && i.variant === variant) ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, variant }];
    });
  };

  const removeFromCart = (id: string, variant?: "Half" | "Full") => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id && i.variant === variant);
      if (existing && existing.quantity > 1) {
        return prev.map(i => (i.id === id && i.variant === variant) ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => !(i.id === id && i.variant === variant));
    });
  };

  const getItemPrice = (item: CartItem) => {
    if (item.variant === "Half" && item.halfPrice) return item.halfPrice;
    if (item.variant === "Full" && item.fullPrice) return item.fullPrice;
    return item.price;
  }

  const totalAmount = cart.reduce((acc, item) => acc + (getItemPrice(item) * item.quantity), 0);
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || (role === "Student" && rollNo.length !== 8) || phone.length !== 10 || cart.length === 0) {
      alert("Please ensure phone is 10 digits and roll number is exactly 8 characters.");
      return;
    }
    setIsSubmitting(true);

    const payload = {
      studentName: name,
      role,
      phone,
      rollNo: role === "Teacher" ? null : rollNo,
      items: cart.map(i => ({ id: i.id, quantity: i.quantity, price: getItemPrice(i), variant: i.variant })),
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
      setOrderStatus("PENDING");
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

  if (view === ("DOCS" as any)) {
    return (
      <div className="container" style={{ padding: "40px 24px" }}>
        <button onClick={() => setView("MENU")} className="btn btn-outline" style={{ marginBottom: "32px" }}>← Back to Menu</button>
        
        <div className="glass-panel" style={{ padding: "48px", maxWidth: "800px", margin: "0 auto" }}>
          <h1 className="heading-xl text-gradient" style={{ marginBottom: "16px", fontSize: "3rem" }}>TIMT Canteen</h1>
          <p className="text-muted" style={{ fontSize: "1.2rem", marginBottom: "32px", lineHeight: "1.6" }}>
            Built with ♥ by <strong>Moksh Gupta & Himanshu</strong><br/>
            Contact No: <strong>9034432401</strong><br/>
            Title: <strong>Code Architect - Member Tech Warriors</strong>
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            <section>
              <h2 className="heading-md" style={{ color: "var(--color-secondary)", marginBottom: "12px" }}>Scope of the Project</h2>
              <p style={{ lineHeight: 1.8, fontSize: "1.05rem" }}>
                The core scope of this project is to modernize and digitize the manual ordering framework of the college canteen. It provides a real-time platform ensuring a seamless, queue-free ordering experience for students, directly connecting them to the canteen vendors with live status tracking and dynamic inventory management.
              </p>
            </section>

            <section>
              <h2 className="heading-md" style={{ color: "var(--color-accent)", marginBottom: "12px" }}>Features</h2>
              <ul style={{ lineHeight: 1.8, fontSize: "1.05rem", paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <li><strong>Live Tracker:</strong> Students can track queue states (Accepted, Cooking, Ready).</li>
                <li><strong>Drag & Drop Menu:</strong> Vendors can open standard desktop dashboards to organically edit, re-arrange, and modify their items instantaneously.</li>
                <li><strong>Funky & Poppy:</strong> Using dynamic styling via Glassmorphism layouts to be visually exceptional.</li>
              </ul>
            </section>

             <section>
              <h2 className="heading-md" style={{ color: "var(--color-primary)", marginBottom: "12px" }}>Technology</h2>
              <p style={{ lineHeight: 1.8, fontSize: "1.05rem" }}>
                Developed using <strong>Next.js 16</strong> (Serverless architecture), <strong>PostgreSQL</strong> via Prisma ORM for permanent cloud database scaling, and responsive <strong>Vanilla CSS</strong> gradients.
              </p>
            </section>
          </div>
          
          <div style={{ marginTop: "48px", textAlign: "center", borderTop: "var(--glass-border)", paddingTop: "24px" }}>
            <p className="text-muted">© 2026 TIMT Canteen Project</p>
          </div>

        </div>
      </div>
    );
  }

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
        
        <div className="glass-panel text-center" style={{ padding: "60px", maxWidth: "500px", width: "100%", textAlign: "center", borderTop: `8px solid ${color}`, transition: "all 0.5s ease" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
            {icon}
          </div>
          <h2 className="heading-lg" style={{ color, marginBottom: "16px" }}>{orderStatus}</h2>
          <p className="text-muted" style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{text}</p>
          
          <div style={{ marginTop: "40px", padding: "16px", background: "var(--color-surface-light)", border: "var(--hard-border)", borderRadius: "0px" }}>
            <p className="text-muted" style={{ margin: 0, fontSize: "0.9rem", fontWeight: "bold", textTransform: "uppercase" }}>Order ID: {orderId}</p>
          </div>
        </div>

        {orderStatus === "COMPLETED" && (
          <button onClick={() => {
            // Clear session so a fresh order can start
            sessionStorage.removeItem("cc_view");
            sessionStorage.removeItem("cc_orderId");
            sessionStorage.removeItem("cc_orderStatus");
            setView("MENU");
          }} className="btn btn-primary" style={{ marginTop: "32px" }}>
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
        
        <div className="checkout-grid">
          
          <div className="glass-panel" style={{ padding: "32px" }}>
            <h2 className="heading-lg text-gradient" style={{ marginBottom: "24px" }}>Checkout</h2>
            <form onSubmit={handleCheckout} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label className="text-muted" style={{ display: "block", marginBottom: "8px" }}>Role</label>
                <select 
                  className="input-field" 
                  value={role} 
                  onChange={e => setRole(e.target.value as "Student" | "Teacher")}
                  style={{ width: "100%", padding: "12px", background: "var(--color-surface)", color: "var(--color-text)", border: "var(--hard-border)", borderRadius: "0px", outline: "none" }}
                >
                  <option value="Student">Student</option>
                  <option value="Teacher">Teacher</option>
                </select>
              </div>

              <div>
                <label className="text-muted" style={{ display: "block", marginBottom: "8px" }}>Full Name</label>
                <input required className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" />
              </div>

              <div>
                <label className="text-muted" style={{ display: "block", marginBottom: "8px" }}>Phone Number</label>
                <input required type="tel" pattern="[0-9]{10}" maxLength={10} minLength={10} title="Please enter exactly 10 digits" className="input-field" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 9876543210" />
              </div>

              {role === "Student" && (
                <div>
                  <label className="text-muted" style={{ display: "block", marginBottom: "8px" }}>Roll Number</label>
                  <input required maxLength={8} minLength={8} title="Roll number must be exactly 8 characters" className="input-field" value={rollNo} onChange={e => setRollNo(e.target.value.toUpperCase())} placeholder="e.g. 21CS001A" />
                </div>
              )}

              <div style={{ background: "var(--color-accent)", border: "var(--hard-border)", borderRadius: "0px", padding: "16px", marginTop: "12px" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-text)", fontWeight: "bold" }}>
                  Payments are collected at the counter.
                </p>
              </div>

              <button type="submit" disabled={isSubmitting || cart.length === 0} className="btn btn-primary" style={{ marginTop: "8px", width: "100%", padding: "16px" }}>
                {isSubmitting ? "Processing..." : `Pay at Counter ₹${totalAmount.toFixed(2)}`}
              </button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h3 className="heading-md" style={{ margin: 0 }}>Order Summary</h3>
              {cart.length > 0 && (
                <button type="button" onClick={() => setCart([])} className="btn btn-outline" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                  EMPTY CART
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {cart.map((item, idx) => (
                <div key={`${item.id}-${item.variant || 'std'}-${idx}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{item.quantity}x {item.name} {item.variant ? `(${item.variant})` : ''}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--color-secondary)" }}>₹{(getItemPrice(item) * item.quantity).toFixed(2)}</span>
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
      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ background: "var(--color-primary)", padding: "12px", borderRadius: "0px", border: "var(--hard-border)", boxShadow: "var(--hard-shadow)" }}>
             <UtensilsCrossed color="white" size={24} />
          </div>
          <h1 className="heading-ld" style={{ margin: 0, letterSpacing: "-0.05em", fontSize: "1.75rem" }}>Canteen Cartel</h1>
        </div>

        <div className="header-actions" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <button onClick={() => setView("DOCS" as any)} className="btn btn-outline" style={{ display: "flex", gap: "8px", fontWeight: "800" }}>
            <PartyPopper size={18} /> ABOUT
          </button>
          
          <a href="/vendor/login" className="btn btn-secondary" style={{ display: "flex", gap: "8px", fontWeight: "800" }}>
            DASHBOARD <ArrowRight size={18} />
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container" style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h1 className="heading-xl hero-responsive-text" style={{ margin: 0, textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: "0.95" }}>
            <span style={{ display: "block", color: "white" }}>SKIP THE</span>
            <span style={{ display: "block", color: "var(--color-accent)" }}>LINE.</span>
            <span style={{ display: "block", color: "white" }}>GRAB A</span>
            <span style={{ display: "block", color: "var(--color-primary)" }}>BITE.</span>
          </h1>
          <p style={{ marginTop: "24px", fontSize: "1.25rem", color: "rgba(255,255,255,0.9)", maxWidth: "500px", lineHeight: 1.6 }}>
            Order from your favorite campus menu instantly.<br/>
            Fresh, hot, and ready when you are.
          </p>
        </div>
      </section>

        {cartItemCount > 0 && (
          <div className="mobile-cart-btn" style={{ position: "fixed", bottom: "32px", right: "32px", zIndex: 50 }}>
            <button onClick={() => setView("CHECKOUT")} className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 24px", cursor: "pointer", background: "var(--color-surface)", border: "var(--hard-border)", boxShadow: "var(--hard-shadow)", outline: "none" }}>
              <ShoppingCart color="var(--color-text)" size={24} />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span style={{ fontWeight: 800, lineHeight: 1, fontSize: "1.1rem" }}>{cartItemCount} items of the menu</span>
                <span style={{ fontSize: "0.95rem", color: "var(--color-primary)", fontWeight: "700" }}>₹{totalAmount.toFixed(2)}</span>
              </div>
              <ArrowRight size={20} style={{ marginLeft: "8px" }} />
            </button>
          </div>
        )}

      <main className="container" style={{ paddingTop: "60px", maxWidth: "1200px", margin: "0 auto" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "40px" }}>
          <h2 className="heading-lg" style={{ margin: 0 }}>Campus Menu</h2>
          <div style={{ flex: 1, height: "2px", background: "var(--color-text-muted)", opacity: 0.3 }}></div>
        </div>

        {menu.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px" }}>
            <p className="heading-md text-muted">The canteen is currently updating the menu. Come back soon!</p>
          </div>
        ) : (
          <div className="menu-grid">
            {menu.filter(m => m.category === "Main").map(item => {
              const inCart = cart.find(i => i.id === item.id);
              return (
                <div key={item.id} className={`glass-panel ${animatingItemId === item.id ? 'animate-pop' : ''}`} style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative", overflow: "hidden", background: "var(--color-surface-light)", padding: "0" }}>
                  
                  {/* Card Yellow Hero Content  */}
                  <div style={{ background: item.image ? `url(${item.image}) center/cover` : "var(--color-accent)", height: "200px", padding: "20px", position: "relative", borderBottom: "var(--hard-border)", filter: item.isAvailable ? "none" : "grayscale(80%)", opacity: item.isAvailable ? 1 : 0.6 }}>
                    {item.isAvailable ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--color-surface)", padding: "6px 16px", borderRadius: "0px", border: "var(--hard-border)", boxShadow: "4px 4px 0 #000", fontWeight: "800", fontSize: "0.85rem", textTransform: "uppercase" }}>
                        <span style={{ width: "10px", height: "10px", borderRadius: "0px", background: "var(--color-success)", border: "2px solid #000" }}></span> OPEN
                      </div>
                    ) : (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--color-danger)", color: "white", padding: "6px 16px", borderRadius: "0px", border: "var(--hard-border)", boxShadow: "2px 2px 0 #000", fontWeight: "800", fontSize: "0.85rem", textTransform: "uppercase" }}>
                        OUT OF STOCK
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "24px", flexGrow: 1, display: "flex", flexDirection: "column", opacity: item.isAvailable ? 1 : 0.5 }}>
                    <div style={{ flexGrow: 1, marginBottom: "24px" }}>
                      <h3 className="heading-md" style={{ marginBottom: "12px", fontSize: "2rem" }}>{item.name}</h3>
                      <p className="text-muted" style={{ fontSize: "1.05rem", minHeight: "48px" }}>
                        {item.description || "The best food on campus."}
                      </p>
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", flexWrap: "wrap", gap: "12px" }}>
                      <span style={{ color: "var(--color-secondary)", fontWeight: "800", display: "flex", alignItems: "center", gap: "6px", fontSize: "1.1rem" }}>
                         ◎ {item.vendor.name.toUpperCase()}
                      </span>
                      
                      {!item.isAvailable ? (
                        <button disabled style={{ background: "var(--color-text-muted)", color: "white", border: "var(--hard-border)", padding: "12px 24px", borderRadius: "0px", fontWeight: "800", textTransform: "uppercase", cursor: "not-allowed" }}>
                          UNAVAILABLE
                        </button>
                      ) : (item.halfPrice && item.fullPrice) ? (
                        <div style={{ display: "flex", gap: "8px", flexDirection: "column", alignItems: "flex-end" }}>
                          {/* Half Plate Controls */}
                          {cart.find(i => i.id === item.id && i.variant === "Half") ? (
                            <div style={{ display: "inline-flex", alignItems: "center", background: "var(--color-primary)", color: "white", borderRadius: "0px", border: "var(--hard-border)", boxShadow: "2px 2px 0 #000" }}>
                              <button onClick={() => removeFromCart(item.id, "Half")} style={{ padding: "6px 12px", background: "transparent", border: "none", borderRight: "var(--hard-border)", color: "white", cursor: "pointer", fontWeight: "800", fontSize: "1.1rem" }}>-</button>
                              <span style={{ fontWeight: 800, padding: "0 12px", fontSize: "0.95rem" }}>{cart.find(i => i.id === item.id && i.variant === "Half")?.quantity} Half</span>
                              <button onClick={() => addToCartAndTriggerUpsell(item, "Half")} style={{ padding: "6px 12px", background: "transparent", border: "none", borderLeft: "var(--hard-border)", color: "white", cursor: "pointer", fontWeight: "800", fontSize: "1.1rem" }}>+</button>
                            </div>
                          ) : (
                            <button onClick={() => addToCartAndTriggerUpsell(item, "Half")} style={{ background: "var(--color-surface)", color: "var(--color-text)", border: "var(--hard-border)", boxShadow: "2px 2px 0 #000", padding: "8px 16px", borderRadius: "0px", cursor: "pointer", fontWeight: "800", fontSize: "0.85rem" }}>
                              HALF - ₹{item.halfPrice} +
                            </button>
                          )}
                          {/* Full Plate Controls */}
                          {cart.find(i => i.id === item.id && i.variant === "Full") ? (
                            <div style={{ display: "inline-flex", alignItems: "center", background: "var(--color-accent)", color: "var(--color-text)", borderRadius: "0px", border: "var(--hard-border)", boxShadow: "2px 2px 0 #000" }}>
                              <button onClick={() => removeFromCart(item.id, "Full")} style={{ padding: "6px 12px", background: "transparent", border: "none", borderRight: "var(--hard-border)", color: "inherit", cursor: "pointer", fontWeight: "800", fontSize: "1.1rem" }}>-</button>
                              <span style={{ fontWeight: 800, padding: "0 12px", fontSize: "0.95rem" }}>{cart.find(i => i.id === item.id && i.variant === "Full")?.quantity} Full</span>
                              <button onClick={() => addToCartAndTriggerUpsell(item, "Full")} style={{ padding: "6px 12px", background: "transparent", border: "none", borderLeft: "var(--hard-border)", color: "inherit", cursor: "pointer", fontWeight: "800", fontSize: "1.1rem" }}>+</button>
                            </div>
                          ) : (
                            <button onClick={() => addToCartAndTriggerUpsell(item, "Full")} style={{ background: "var(--color-surface)", color: "var(--color-text)", border: "var(--hard-border)", boxShadow: "2px 2px 0 #000", padding: "8px 16px", borderRadius: "0px", cursor: "pointer", fontWeight: "800", fontSize: "0.85rem" }}>
                              FULL - ₹{item.fullPrice} +
                            </button>
                          )}
                        </div>
                      ) : inCart ? (
                        <div style={{ display: "inline-flex", alignItems: "center", background: "var(--color-primary)", color: "white", borderRadius: "0px", border: "var(--hard-border)", boxShadow: "4px 4px 0 #000" }}>
                          <button onClick={() => removeFromCart(item.id)} style={{ padding: "10px 16px", background: "transparent", border: "none", borderRight: "var(--hard-border)", color: "white", cursor: "pointer", fontWeight: "800", fontSize: "1.2rem" }}>-</button>
                          <span style={{ fontWeight: 800, padding: "0 16px", fontSize: "1.1rem" }}>{inCart.quantity}</span>
                          <button onClick={() => addToCartAndTriggerUpsell(item)} style={{ padding: "10px 16px", background: "transparent", border: "none", borderLeft: "var(--hard-border)", color: "white", cursor: "pointer", fontWeight: "800", fontSize: "1.2rem" }}>+</button>
                        </div>
                      ) : (
                        <button onClick={() => addToCartAndTriggerUpsell(item)} style={{ background: "var(--color-primary)", color: "white", border: "var(--hard-border)", boxShadow: "4px 4px 0 #000", padding: "12px 24px", borderRadius: "0px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", textTransform: "uppercase", transition: "all 0.1s" }} onMouseOver={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = "6px 6px 0 #000"; }} onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "4px 4px 0 #000"; }}>
                          ADD - ₹{item.price} +
                        </button>
                      )}
                    </div>
                  </div>
                  
                </div>
              );
            })}
          </div>
        )}

        {/* Categories Separation (Addons listed explicitly at the bottom) */}
        {menu.some(m => m.category === "Addon") && (
          <div style={{ marginTop: "60px" }}>
             <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "40px" }}>
              <h2 className="heading-lg" style={{ margin: 0 }}>Addons & Extras</h2>
              <div style={{ flex: 1, height: "2px", background: "var(--color-text-muted)", opacity: 0.3 }}></div>
            </div>
            <div className="menu-grid">
              {menu.filter(m => m.category === "Addon").map(item => {
                const inCart = cart.find(i => i.id === item.id);
                return (
                  <div key={item.id} className={`glass-panel ${animatingItemId === item.id ? 'animate-pop' : ''}`} style={{ padding: "20px", background: "var(--color-surface)", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: item.isAvailable ? 1 : 0.5 }}>
                    <div>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, textDecoration: item.isAvailable ? "none" : "line-through" }}>{item.name}</h4>
                      <span style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>{item.vendor.name} • ₹{item.price} {!item.isAvailable && "(Out of Stock)"}</span>
                    </div>
                    
                    {!item.isAvailable ? (
                        <button disabled className="btn btn-outline" style={{ padding: "8px 16px", background: "var(--color-text-muted)", color: "white", cursor: "not-allowed" }}>
                          UNAVAILABLE
                        </button>
                    ) : inCart ? (
                        <div style={{ display: "inline-flex", alignItems: "center", background: "var(--color-primary)", color: "white", borderRadius: "0px", border: "2px solid #000" }}>
                          <button onClick={() => removeFromCart(item.id)} style={{ padding: "6px 12px", background: "transparent", border: "none", borderRight: "2px solid #000", color: "white", cursor: "pointer", fontWeight: "800", fontSize: "1.2rem" }}>-</button>
                          <span style={{ fontWeight: 800, padding: "0 12px", fontSize: "1rem" }}>{inCart.quantity}</span>
                          <button onClick={() => addToCartAndTriggerUpsell(item)} style={{ padding: "6px 12px", background: "transparent", border: "none", borderLeft: "2px solid #000", color: "white", cursor: "pointer", fontWeight: "800", fontSize: "1.2rem" }}>+</button>
                        </div>
                      ) : (
                        <button onClick={() => addToCartAndTriggerUpsell(item)} className="btn btn-outline" style={{ padding: "8px 16px" }}>
                          ADD
                        </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* Addon / Recommendation Side Drawer */}
      {upsellItem && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", justifyContent: "flex-end" }}
          onClick={(e) => { if (e.target === e.currentTarget) setUpsellItem(null); }}
        >
           <div className="glass-panel slide-in-right" style={{ background: "var(--color-surface)", padding: "32px", width: "100%", maxWidth: "450px", height: "100vh", overflowY: "auto", borderRadius: "0px", borderLeft: "var(--hard-border)", boxShadow: "-4px 0px 0 #000", display: "flex", flexDirection: "column" }}>
              <h2 className="heading-ld" style={{ marginBottom: "16px", fontSize: "1.8rem", color: "var(--color-success)" }}>Added to Cart! 🎉</h2>

              {/* Quantity control for the main upsellItem itself */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "var(--color-surface-light)", border: "var(--hard-border)", boxShadow: "3px 3px 0 #000", marginBottom: "24px" }}>
                <div>
                  <span style={{ fontWeight: 800, fontSize: "1.05rem", display: "block" }}>{upsellItem.name}</span>
                  <span style={{ fontSize: "0.9rem", color: "var(--color-secondary)", fontWeight: 700 }}>
                    ₹{upsellItem.price} each
                  </span>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", background: "var(--color-primary)", color: "white", border: "var(--hard-border)", boxShadow: "2px 2px 0 #000" }}>
                  <button
                    onClick={() => removeFromCart(upsellItem.id)}
                    style={{ padding: "8px 14px", background: "transparent", border: "none", borderRight: "var(--hard-border)", color: "white", cursor: "pointer", fontWeight: "800", fontSize: "1.2rem" }}
                  >-</button>
                  <span style={{ fontWeight: 800, padding: "0 14px", fontSize: "1.05rem", minWidth: "32px", textAlign: "center" }}>
                    {cart.find(i => i.id === upsellItem.id && !i.variant)?.quantity ?? 0}
                  </span>
                  <button
                    onClick={() => { addToCart(upsellItem); setAnimatingItemId(upsellItem.id); setTimeout(() => setAnimatingItemId(null), 300); }}
                    style={{ padding: "8px 14px", background: "transparent", border: "none", borderLeft: "var(--hard-border)", color: "white", cursor: "pointer", fontWeight: "800", fontSize: "1.2rem" }}
                  >+</button>
                </div>
              </div>

              <p className="text-muted" style={{ marginBottom: "24px", lineHeight: "1.4" }}>Would you like to add anything else from <strong>{upsellItem.vendor.name}</strong>?</p>
              
              {/* Addons / Extras Section — always visible */}
              {menu.filter(m => m.category === "Addon" && m.vendor.name === upsellItem.vendor.name && m.isAvailable).length > 0 && (
                <div style={{ marginBottom: "32px" }}>
                  <h3 className="heading-md" style={{ marginBottom: "16px", color: "var(--color-secondary)" }}>Options & Extras</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {menu.filter(m => m.category === "Addon" && m.vendor.name === upsellItem.vendor.name && m.isAvailable).map(addon => {
                      const inCart = cart.find(i => i.id === addon.id);
                      return (
                        <div key={addon.id} className={animatingItemId === addon.id ? 'animate-pop' : ''} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "var(--hard-border)", background: "var(--color-surface-light)" }}>
                          <div>
                            <span style={{ fontWeight: 700, display: "block" }}>{addon.name}</span>
                            <span style={{ fontSize: "0.9rem", color: "var(--color-secondary)", fontWeight: 800 }}>+₹{addon.price}</span>
                          </div>
                          {inCart ? (
                              <div style={{ display: "inline-flex", alignItems: "center", background: "var(--color-primary)", color: "white", borderRadius: "0px", border: "var(--hard-border)" }}>
                                <button onClick={() => removeFromCart(addon.id)} style={{ padding: "4px 10px", background: "transparent", border: "none", color: "white", cursor: "pointer", fontWeight: "800" }}>-</button>
                                <span style={{ fontWeight: 800, padding: "0 8px", fontSize: "0.9rem" }}>{inCart.quantity}</span>
                                <button onClick={() => { addToCart(addon); setAnimatingItemId(addon.id); setTimeout(() => setAnimatingItemId(null), 300); }} style={{ padding: "4px 10px", background: "transparent", border: "none", color: "white", cursor: "pointer", fontWeight: "800" }}>+</button>
                              </div>
                          ) : (
                            <button onClick={() => addToCartAndTriggerUpsell(addon, undefined, true)} className="btn btn-outline" style={{ padding: "6px 12px", minWidth: "80px" }}>ADD</button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* "You'd Also Like" — COLLAPSED by default with attention-grabbing arrow */}
              {menu.filter(m => m.category === "Main" && m.vendor.name === upsellItem.vendor.name && m.isAvailable && m.id !== upsellItem.id).length > 0 && (
                <div style={{ marginBottom: "32px" }}>
                  {/* Collapsible Header */}
                  <button
                    onClick={() => setYouLikeOpen(o => !o)}
                    className="animate-peek-wiggle"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      background: "var(--color-accent)",
                      border: "var(--hard-border)",
                      boxShadow: "4px 4px 0 #000",
                      cursor: "pointer",
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "1rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--color-text)",
                      outline: "none",
                      borderRadius: "0px",
                      marginBottom: youLikeOpen ? "12px" : "0",
                    }}
                  >
                    <span>👀 You'd Also Like</span>
                    <span
                      className={!youLikeOpen ? "animate-bounce-arrow" : ""}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        transition: "transform 0.3s ease",
                        transform: youLikeOpen ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    >
                      <ChevronDown size={22} strokeWidth={3} />
                    </span>
                  </button>

                  {/* Collapsible Content */}
                  {youLikeOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {menu.filter(m => m.category === "Main" && m.vendor.name === upsellItem.vendor.name && m.isAvailable && m.id !== upsellItem.id).slice(0, 3).map(rec => {
                        const inCart = cart.find(i => i.id === rec.id);
                        return (
                          <div key={rec.id} className={animatingItemId === rec.id ? 'animate-pop' : ''} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "var(--hard-border)", background: "var(--color-surface-light)" }}>
                            <div>
                              <span style={{ fontWeight: 700, display: "block", textTransform: "capitalize" }}>{rec.name}</span>
                              <span style={{ fontSize: "0.9rem", color: "var(--color-secondary)", fontWeight: 800 }}>₹{rec.price}</span>
                            </div>
                            {inCart ? (
                                <div style={{ display: "inline-flex", alignItems: "center", background: "var(--color-primary)", color: "white", borderRadius: "0px", border: "var(--hard-border)" }}>
                                  <button onClick={() => removeFromCart(rec.id)} style={{ padding: "4px 10px", background: "transparent", border: "none", color: "white", cursor: "pointer", fontWeight: "800" }}>-</button>
                                  <span style={{ fontWeight: 800, padding: "0 8px", fontSize: "0.9rem" }}>{inCart.quantity}</span>
                                  <button onClick={() => { addToCart(rec); setAnimatingItemId(rec.id); setTimeout(() => setAnimatingItemId(null), 300); }} style={{ padding: "4px 10px", background: "transparent", border: "none", color: "white", cursor: "pointer", fontWeight: "800" }}>+</button>
                                </div>
                            ) : (
                              <button onClick={() => addToCartAndTriggerUpsell(rec, undefined, true)} className="btn btn-outline" style={{ padding: "6px 12px", minWidth: "80px" }}>ADD</button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: "auto", paddingTop: "24px" }}>
                <button onClick={() => setUpsellItem(null)} className="btn btn-primary" style={{ width: "100%" }}>
                  BACK TO MENU
                </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
