import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  requested:       { label: 'Requested',    className: 'bg-[#F1F1F1] text-[#666]' },
  in_progress:     { label: 'In Progress',  className: 'bg-[#00A3FF]/10 text-[#00A3FF]' },
  draft_submitted: { label: 'In Review',    className: 'bg-[#FF8B4A]/10 text-[#FF8B4A]' },
  approved:        { label: 'Approved',     className: 'bg-[#01CE91]/10 text-[#01CE91]' },
  published:       { label: 'Published',    className: 'bg-[#01CE91]/15 text-[#01CE91] font-medium' },
  stale:           { label: 'Stale',        className: 'bg-[#FF8B4A]/10 text-[#FF8B4A]' },
}

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  high:   { label: 'High',   className: 'bg-[#FF426F]/10 text-[#FF426F]' },
  medium: { label: 'Medium', className: 'bg-[#FF8B4A]/10 text-[#FF8B4A]' },
  low:    { label: 'Low',    className: 'bg-[#F1F1F1] text-[#999]' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-[#F1F1F1] text-[#666]' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs', config.className)}>
      {config.label}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: string }) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs', config.className)}>
      {config.label}
    </span>
  )
}
