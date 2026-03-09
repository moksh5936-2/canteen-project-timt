"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "./sortable-item";
import { Plus, Loader2 } from "lucide-react";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  isAvailable: boolean;
  category: string;
  orderIndex: number;
  halfPrice: number | null;
  fullPrice: number | null;
};

export default function MenuEditorPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [hasHalfFull, setHasHalfFull] = useState(false);
  const [halfPrice, setHalfPrice] = useState("");
  const [fullPrice, setFullPrice] = useState("");
  const [image, setImage] = useState("");
  const [category, setCategory] = useState("Main");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const res = await fetch("/api/vendor/menu");
    if (res.ok) {
      const data = await res.json();
      setItems(data);
    }
    setLoading(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Sync reorder to DB
        const payload = newItems.map((item, index) => ({ id: item.id, orderIndex: index }));
        fetch("/api/vendor/menu", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "REORDER", payload }),
        });

        return newItems;
      });
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (hasHalfFull) {
      if (!name || !halfPrice || !fullPrice) return;
    } else {
      if (!name || !price) return;
    }

    const payload: any = { name, description, image, category };
    if (hasHalfFull) {
        payload.price = 0; // Default or base, not strictly used
        payload.halfPrice = halfPrice;
        payload.fullPrice = fullPrice;
    } else {
        payload.price = price;
    }

    const res = await fetch("/api/vendor/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setName("");
      setDescription("");
      setPrice("");
      setHalfPrice("");
      setFullPrice("");
      setHasHalfFull(false);
      setImage("");
      setCategory("Main");
      fetchItems();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image size must be less than 2MB to keep the app fast!");
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    // Optimistic UI update
    setItems(items.map(item => item.id === id ? { ...item, isAvailable: !currentStatus } : item));
    
    await fetch("/api/vendor/menu", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "TOGGLE_AVAILABILITY", payload: { id, isAvailable: !currentStatus } }),
    });
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this specific item?")) return;
    
    setItems(items.filter(item => item.id !== id));
    await fetch(`/api/vendor/menu?id=${id}`, { method: "DELETE" });
  };

  return (
    <div>
      <h1 className="heading-lg text-gradient" style={{ marginBottom: "24px" }}>Menu Editor</h1>
      
      <div className="vendor-menu-grid">
        
        {/* Drag and Drop List Area */}
        <div className="glass-panel" style={{ padding: "24px", minHeight: "400px" }}>
          <h2 className="heading-md" style={{ marginBottom: "16px" }}>Your Items</h2>
          
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <Loader2 className="animate-pulse" size={40} color="var(--color-primary)" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted" style={{ textAlign: "center", padding: "40px" }}>No items in your menu yet. Add one from the panel!</p>
          ) : (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={items.map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {items.map((item) => (
                    <SortableItem 
                      key={item.id} 
                      item={item} 
                      onToggle={() => toggleAvailability(item.id, item.isAvailable)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Add Item Form Area */}
        <div className="glass-panel" style={{ padding: "24px", position: "sticky", top: "24px", maxHeight: "calc(100vh - 48px)", overflowY: "auto" }}>
          <h2 className="heading-md" style={{ marginBottom: "16px" }}>Add New Item</h2>
          
          <form onSubmit={addItem} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label className="text-muted" style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Item Name*</label>
              <input 
                className="input-field" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Spicy Chicken Wrap"
              />
            </div>

            {category === "Main" && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "var(--color-surface-light)", border: "1px solid var(--color-surface)" }}>
                <input 
                  type="checkbox"
                  id="hasHalfFull"
                  checked={hasHalfFull}
                  onChange={(e) => setHasHalfFull(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "var(--color-primary)" }}
                />
                <label htmlFor="hasHalfFull" style={{ fontWeight: "600", cursor: "pointer", userSelect: "none" }}>Has Half/Full Plate Options?</label>
              </div>
            )}

            {!hasHalfFull ? (
              <div>
                <label className="text-muted" style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Price (₹)*</label>
                <input 
                  className="input-field" 
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  placeholder="e.g. 150"
                />
              </div>
            ) : (
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label className="text-muted" style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Half Plate (₹)*</label>
                  <input 
                    className="input-field" 
                    type="number"
                    step="0.01"
                    value={halfPrice}
                    onChange={(e) => setHalfPrice(e.target.value)}
                    required
                    placeholder="100"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="text-muted" style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Full Plate (₹)*</label>
                  <input 
                    className="input-field" 
                    type="number"
                    step="0.01"
                    value={fullPrice}
                    onChange={(e) => setFullPrice(e.target.value)}
                    required
                    placeholder="180"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-muted" style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Description</label>
              <textarea 
                className="input-field" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ resize: "vertical", minHeight: "80px" }}
                placeholder="Tasty wrap with secret sauce..."
              />
            </div>

            <div>
              <label className="text-muted" style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Category</label>
              <select 
                className="input-field" 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ appearance: "auto" }}
              >
                <option value="Main">Main Item</option>
                <option value="Addon">Addon / Extra</option>
              </select>
            </div>

            <div>
              <label className="text-muted" style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Image Upload</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input 
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="input-field"
                  style={{ padding: "8px 12px", background: "var(--color-surface-light)", cursor: "pointer" }}
                />
                
                {image && (
                  <div style={{ marginTop: "8px", border: "var(--hard-border)", borderRadius: "0px", overflow: "hidden", position: "relative", height: "120px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button 
                      type="button" 
                      onClick={() => setImage("")} 
                      style={{ position: "absolute", top: "4px", right: "4px", background: "var(--color-primary)", color: "white", border: "2px solid #000", cursor: "pointer", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}
                    >
                      X
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: "8px" }}>
              <Plus size={18} /> Add to Menu
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
