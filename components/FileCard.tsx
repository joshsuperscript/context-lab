import Link from 'next/link'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import type { ContextFile } from '@/lib/notion'

interface FileCardProps {
  file: ContextFile
  currentUserEmail?: string
  onClaim?: (id: string) => void
  onAssign?: (id: string, email: string) => void
  isAdmin?: boolean
}

export default function FileCard({ file, currentUserEmail, onClaim, isAdmin }: FileCardProps) {
  const isMine = file.assigned_to === currentUserEmail
  const canClaim = !file.assigned_to && onClaim
  const pathParts = file.path.split('/')
  const section = pathParts[1] ?? ''
  const name = pathParts[pathParts.length - 1].replace('.md', '')

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      {/* Path */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs text-gray-400 font-mono">{section}/</span>
          <span className="text-sm font-medium text-gray-900 truncate">{name}</span>
          {file.bus_factor && (
            <span title="Bus-factor risk">
              <AlertTriangle size={12} className="text-orange-500 shrink-0" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 truncate">{file.title}</span>
          {file.is_expansion && (
            <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Expansion</span>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 shrink-0">
        <PriorityBadge priority={file.priority} />
        <StatusBadge status={file.status} />
      </div>

      {/* Assignee / claim */}
      <div className="shrink-0 w-28 text-right">
        {file.assigned_to ? (
          <span className={`text-xs ${isMine ? 'text-[#00A3FF] font-medium' : 'text-gray-500'}`}>
            {isMine ? 'You' : file.assigned_to.split('@')[0]}
          </span>
        ) : canClaim ? (
          <button
            onClick={() => onClaim(file.id)}
            className="text-xs text-[#00A3FF] hover:underline"
          >
            Claim
          </button>
        ) : (
          <span className="text-xs text-gray-400">Unassigned</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {file.linear_ticket_id && (
          <a
            href={`https://linear.app/issue/${file.linear_ticket_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600"
          >
            <ExternalLink size={13} />
          </a>
        )}
        {(isMine || isAdmin) && (
          <Link
            href={`/write/${file.id}`}
            className="text-xs px-2.5 py-1 bg-[#00A3FF] text-white rounded-md hover:bg-[#0091e6] transition-colors"
          >
            {file.status === 'requested' || file.status === 'in_progress' ? 'Write' : 'View'}
          </Link>
        )}
      </div>
    </div>
  )
}
