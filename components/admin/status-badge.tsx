import { Badge } from '@/components/ui/badge';
import { Plane } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmed', color: '#22c55e', bg: '#052e16' },
  success: { label: 'Success', color: '#22c55e', bg: '#052e16' },
  landed: { label: 'Landed', color: '#22c55e', bg: '#052e16' },
  checked_in: { label: 'Checked In', color: '#22c55e', bg: '#052e16' },
  pending: { label: 'Pending', color: '#3b82f6', bg: '#0c1a3a' },
  scheduled: { label: 'Scheduled', color: '#3b82f6', bg: '#0c1a3a' },
  delayed: { label: 'Delayed', color: '#ef4444', bg: '#2d0a0a' },
  failed: { label: 'Failed', color: '#ef4444', bg: '#2d0a0a' },
  cancelled: { label: 'Cancelled', color: '#6b7280', bg: '#1f2937' },
  boarding: { label: 'Boarding', color: '#FF6600', bg: '#2d1200' },
  departed: { label: 'Departed', color: '#8b5cf6', bg: '#1e0a3c' },
  refunded: { label: 'Refunded', color: '#eab308', bg: '#2d2600' },
  paid: { label: 'Paid', color: '#22c55e', bg: '#052e16' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = statusConfig[status?.toLowerCase()] || { label: status, color: '#6b7280', bg: '#1f2937' };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.color}40` }}
    >
      {status?.toLowerCase() === 'checked_in' && <Plane className="h-3 w-3" />}
      {cfg.label}
    </span>
  );
}
