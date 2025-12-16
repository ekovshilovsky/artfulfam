import * as React from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
}

export function DialogContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative z-50 bg-card p-6 md:p-8 rounded-2xl shadow-2xl border-2 border-border max-w-lg w-full mx-4 ${className}`}>
      {children}
    </div>
  );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 space-y-2">{children}</div>;
}

export function DialogTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-2xl font-bold ${className}`}>{children}</h2>;
}

export function DialogDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm text-muted-foreground mt-1 ${className}`}>{children}</p>;
}
