import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  requested:       { label: 'Requested',    className: 'bg-gray-100 text-gray-600' },
  in_progress:     { label: 'In Progress',  className: 'bg-blue-50 text-blue-700' },
  draft_submitted: { label: 'In Review',    className: 'bg-yellow-50 text-yellow-700' },
  approved:        { label: 'Approved',     className: 'bg-green-50 text-green-700' },
  published:       { label: 'Published',    className: 'bg-green-100 text-green-800 font-medium' },
}

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  high:   { label: 'High',   className: 'bg-red-50 text-red-700' },
  medium: { label: 'Medium', className: 'bg-orange-50 text-orange-700' },
  low:    { label: 'Low',    className: 'bg-gray-50 text-gray-500' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
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
