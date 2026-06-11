'use client'

import Link from 'next/link'
import { useState } from 'react'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { AlertTriangle, ExternalLink, ChevronDown } from 'lucide-react'
import type { ContextFile } from '@/lib/notion'

const NOTION_WORKSPACE = process.env.NEXT_PUBLIC_NOTION_WORKSPACE
function notionUrl(pageId: string): string {
  const id = pageId.replace(/-/g, '')
  return NOTION_WORKSPACE
    ? `https://www.notion.so/${NOTION_WORKSPACE}/${id}`
    : `https://notion.so/${id}`
}

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
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-[#E1E1E1] hover:border-black transition-colors">
      {/* Path + title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs text-[#999] font-mono tracking-tight">{section}/</span>
          <span className="text-sm font-medium text-black truncate">{name}</span>
          {file.bus_factor && (
            <span title="Bus-factor risk">
              <AlertTriangle size={12} className="text-[#FF8B4A] shrink-0" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#666] truncate">{file.title}</span>
          {file.is_expansion && (
            <span className="text-xs text-[#AF5EFF] bg-[#AF5EFF]/10 px-1.5 py-0.5">Expansion</span>
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
              className="flex items-center gap-1 text-xs text-[#666] hover:text-black border border-[#E1E1E1] hover:border-black px-2 py-1 transition-colors"
            >
              {file.assigned_to ? file.assigned_to.split('@')[0] : 'Assign'}
              <ChevronDown size={11} />
            </button>
            {assignOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-black z-20 py-1 max-h-48 overflow-y-auto">
                {staff.map((s) => (
                  <button
                    key={s.email}
                    onClick={() => { onAssign(file.id, s.email); setAssignOpen(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-black hover:bg-[#F1F1F1]"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : file.assigned_to ? (
          <span className={`text-xs ${isMine ? 'text-[#00A3FF] font-medium' : 'text-[#666]'}`}>
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
          <span className="text-xs text-[#999]">Unassigned</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {file.linear_ticket_id && (
          <a
            href={`https://linear.app/issue/${file.linear_ticket_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#999] hover:text-black"
          >
            <ExternalLink size={13} />
          </a>
        )}
        {isAdmin && file.status === 'published' && onMarkStale && (
          <button
            onClick={() => onMarkStale(file.id)}
            className="text-xs px-3 py-1 text-[#FF8B4A] border border-[#FF8B4A]/40 hover:border-[#FF8B4A] rounded-full transition-colors"
          >
            Stale
          </button>
        )}
        {canWrite && canWrite2 && (
          <Link
            href={`/write/${file.id}`}
            className="text-xs px-4 py-1.5 bg-black text-white rounded-full hover:bg-[#00A3FF] transition-colors"
          >
            Write
          </Link>
        )}
        {(isAdmin || file.status === 'published' || file.source_page_id) && (
          <a
            href={notionUrl(file.source_page_id ?? file.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#999] hover:text-black"
            title="Open in Notion"
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  )
}
