import type {
  DonorStatus,
  RequestStatus,
  ResponseStatus,
  Urgency,
} from '@/lib/types'

export function formatDistance(meters?: number) {
  if (meters === undefined) return '—'
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`
}

export function formatTime(iso: string | number) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDate(iso: string | number) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function relativeTime(iso?: string | number, now = new Date()) {
  if (!iso) return 'Just now'
  const time = typeof iso === 'number' ? iso : new Date(iso).getTime()
  if (isNaN(time)) return 'Just now'
  const diff = Math.round((now.getTime() - time) / 1000)
  const abs = Math.abs(diff)
  if (abs < 60) return `${abs}s ago`
  if (abs < 3600) return `${Math.round(abs / 60)}m ago`
  if (abs < 86400) return `${Math.round(abs / 3600)}h ago`
  return `${Math.round(abs / 86400)}d ago`
}

export function countdown(iso?: string | number, now = new Date()) {
  if (!iso) return 'Immediate'
  const time = typeof iso === 'number' ? iso : new Date(iso).getTime()
  if (isNaN(time)) return 'Immediate'
  const diff = time - now.getTime()
  if (diff <= 0) return 'Overdue'
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  return hours > 0 ? `${hours}h ${mins % 60}m left` : `${mins}m left`
}

export const urgencyTone: Record<string, string> = {
  critical: 'border-primary/40 bg-primary/15 text-primary',
  Critical: 'border-primary/40 bg-primary/15 text-primary',
  urgent: 'border-chart-5/40 bg-chart-5/15 text-chart-5',
  High: 'border-chart-5/40 bg-chart-5/15 text-chart-5',
  standard: 'border-border bg-secondary text-muted-foreground',
  Normal: 'border-border bg-secondary text-muted-foreground',
}

export const urgencyLabel: Record<string, string> = {
  critical: 'Critical',
  Critical: 'Critical',
  urgent: 'Urgent',
  High: 'High',
  standard: 'Standard',
  Normal: 'Normal',
}

export const donorStatusTone: Record<DonorStatus, string> = {
  available: 'border-success/40 bg-success/15 text-success',
  responding: 'border-primary/40 bg-primary/15 text-primary',
  cooldown: 'border-chart-5/40 bg-chart-5/15 text-chart-5',
  unavailable: 'border-border bg-secondary text-muted-foreground',
}

export const donorStatusLabel: Record<DonorStatus, string> = {
  available: 'Available',
  responding: 'Responding',
  cooldown: 'Cooldown',
  unavailable: 'Unavailable',
}

export const requestStatusTone: Record<string, string> = {
  searching: 'border-chart-5/40 bg-chart-5/15 text-chart-5',
  active: 'border-chart-5/40 bg-chart-5/15 text-chart-5',
  matched: 'border-primary/40 bg-primary/15 text-primary',
  'en-route': 'border-primary/40 bg-primary/15 text-primary',
  fulfilled: 'border-success/40 bg-success/15 text-success',
  cancelled: 'border-border bg-secondary text-muted-foreground',
}

export const requestStatusLabel: Record<string, string> = {
  searching: 'Searching',
  active: 'Active',
  matched: 'Matched',
  'en-route': 'En route',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
}

export const responseStatusTone: Record<ResponseStatus, string> = {
  notified: 'border-border bg-secondary text-muted-foreground',
  accepted: 'border-primary/40 bg-primary/15 text-primary',
  declined: 'border-border bg-secondary text-muted-foreground',
  arrived: 'border-success/40 bg-success/15 text-success',
  donated: 'border-success/40 bg-success/15 text-success',
}

export const responseStatusLabel: Record<ResponseStatus, string> = {
  notified: 'Notified',
  accepted: 'Accepted',
  declined: 'Declined',
  arrived: 'Arrived',
  donated: 'Donated',
}

export function initials(name: string) {
  if (!name) return 'LX'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
