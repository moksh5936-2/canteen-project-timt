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
import { SortableItem } from "./SortableItem";
import { Plus, Loader2 } from "lucide-react";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  isAvailable: boolean;
  orderIndex: number;
};

export default function MenuEditorPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
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
    if (!name || !price) return;

    const res = await fetch("/api/vendor/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, price, image }),
    });

    if (res.ok) {
      setName("");
      setDescription("");
      setPrice("");
      setImage("");
      fetchItems();
    }
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
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "32px", alignItems: "start" }}>
        
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
        <div className="glass-panel" style={{ padding: "24px", position: "sticky", top: "24px" }}>
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
              <label className="text-muted" style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Image URL</label>
              <input 
                className="input-field" 
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://..."
              />
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
