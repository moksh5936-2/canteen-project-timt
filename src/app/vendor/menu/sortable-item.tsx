"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, IndianRupee } from "lucide-react";

type SortableItemProps = {
  item: {
    id: string;
    name: string;
    price: number;
    description: string | null;
    isAvailable: boolean;
  };
  onToggle: () => void;
  onDelete: () => void;
};

export function SortableItem({ item, onToggle, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="glass-panel"
    >
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        padding: "16px",
        gap: "16px",
        background: item.isAvailable ? "transparent" : "var(--color-surface-light)",
        borderBottom: isDragging ? "var(--hard-border)" : "2px solid #000",
        borderRadius: "0px"
      }}>
        <div 
          {...attributes} 
          {...listeners}
          style={{ cursor: "grab", color: "var(--color-text-muted)" }}
        >
          <GripVertical size={20} />
        </div>
        
        <div style={{ flexGrow: 1, opacity: item.isAvailable ? 1 : 0.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>{item.name}</h3>
            <span style={{ display: "flex", alignItems: "center", color: "var(--color-secondary)", fontWeight: 700 }}>
              <IndianRupee size={14} style={{ marginRight: "2px" }} />
              {item.price.toFixed(2)}
            </span>
          </div>
          {item.description && (
            <p className="text-muted" style={{ fontSize: "0.9rem", marginTop: "4px", margin: 0 }}>{item.description}</p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", cursor: "pointer", gap: "8px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
              {item.isAvailable ? "Available" : "Hidden"}
            </span>
            <input 
              type="checkbox" 
              checked={item.isAvailable}
              onChange={onToggle}
              style={{
                accentColor: "var(--color-primary)",
                width: "18px",
                height: "18px",
                cursor: "pointer"
              }}
            />
          </label>

          <button 
            onClick={onDelete}
            style={{ 
              background: "transparent", 
              border: "none", 
              color: "var(--color-danger)", 
              cursor: "pointer",
              padding: "4px",
              opacity: 0.7,
              transition: "opacity var(--transition-fast)" 
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
