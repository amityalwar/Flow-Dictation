import type { ReactNode } from "react";

interface FloatingPanelProps {
  children: ReactNode;
}

export function FloatingPanel({ children }: FloatingPanelProps) {
  return (
    <div className="h-full w-full overflow-hidden rounded-[28px]"
      style={{ background: "var(--md-surface-container-low)" }}
    >
      {children}
    </div>
  );
}
