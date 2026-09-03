export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
      <div>
        <h1 className="text-xl font-bold text-[#3a2e22]">{title}</h1>
        {subtitle && <p className="text-sm text-[#8a7a66] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`admin-card p-4 ${className}`}>{children}</div>;
}

import type { LucideIcon } from 'lucide-react';

export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="text-center py-10">
      <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: '#f0e8d8' }}>
        <Icon size={22} className="text-[#a07c4a]" />
      </div>
      <p className="text-sm font-semibold text-[#5a4430]">{title}</p>
      {hint && <p className="text-xs text-[#8a7a66] mt-1">{hint}</p>}
    </div>
  );
}

export function ConfirmButton({ onConfirm, children, className = '' }: { onConfirm: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button onClick={() => { if (confirm('Are you sure? This cannot be undone.')) onConfirm(); }}
      className={`btn-danger ${className}`}>
      {children}
    </button>
  );
}

export function StatCard({ label, value, icon: Icon, tint }: { label: string; value: string | number; icon: LucideIcon; tint: string }) {
  return (
    <div className="admin-card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: tint }}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#3a2e22] leading-none">{value}</p>
        <p className="text-xs text-[#8a7a66] mt-1">{label}</p>
      </div>
    </div>
  );
}
