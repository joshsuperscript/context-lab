'use client'

import Link from 'next/link'
import { useState } from 'react'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { AlertTriangle, ExternalLink, ChevronDown } from 'lucide-react'
import type { ContextFile } from '@/lib/notion'

interface FileCardProps {
  file: ContextFile
  currentUserEmail?: string
  staff?: { name: string; email: string }[]
  onClaim?: (id: string) => void
  onAssign?: (id: string, email: string) => void
  onMarkStale?: (id: string) => void
  isAdmin?: boolean
}

export default function FileCard({
  file,
  currentUserEmail,
  staff = [],
  onClaim,
  onAssign,
  onMarkStale,
  isAdmin,
}: FileCardProps) {
  const [assignOpen, setAssignOpen] = useState(false)
  const isMine = file.assigned_to === currentUserEmail
  const canClaim = !file.assigned_to && onClaim && !isAdmin
  const pathParts = file.path.split('/')
  const section = pathParts[1] ?? ''
  const name = pathParts[pathParts.length - 1].replace('.md', '')
  const canWrite = isMine || isAdmin
  const canWrite2 = file.status !== 'published' && file.status !== 'stale'

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      {/* Path + title */}
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

      {/* Assignee / assign / claim */}
      <div className="shrink-0 w-32 text-right relative">
        {isAdmin && onAssign ? (
          <div className="relative inline-block text-left">
            <button
              onClick={() => setAssignOpen(!assignOpen)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-md px-2 py-1"
            >
              {file.assigned_to ? file.assigned_to.split('@')[0] : 'Assign'}
              <ChevronDown size={11} />
            </button>
            {assignOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 max-h-48 overflow-y-auto">
                {staff.map((s) => (
                  <button
                    key={s.email}
                    onClick={() => { onAssign(file.id, s.email); setAssignOpen(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : file.assigned_to ? (
          <span className={`text-xs ${isMine ? 'text-[#00A3FF] font-medium' : 'text-gray-500'}`}>
            {isMine ? 'You' : file.assigned_to.split('@')[0]}
          </span>
        ) : canClaim ? (
          <button
            onClick={() => onClaim!(file.id)}
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
        {isAdmin && file.status === 'published' && onMarkStale && (
          <button
            onClick={() => onMarkStale(file.id)}
            className="text-xs px-2 py-1 text-amber-600 border border-amber-200 rounded-md hover:bg-amber-50"
          >
            Stale
          </button>
        )}
        {canWrite && canWrite2 && (
          <Link
            href={`/write/${file.id}`}
            className="text-xs px-2.5 py-1 bg-[#00A3FF] text-white rounded-md hover:bg-[#0091e6] transition-colors"
          >
            Write
          </Link>
        )}
        {(isAdmin || file.status === 'published') && (
          <a
            href={`https://notion.so/${file.id.replace(/-/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-600"
            title="Open in Notion"
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  )
}
