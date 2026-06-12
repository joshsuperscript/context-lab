'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, ChevronDown } from 'lucide-react'
import type { ContextFile } from '@/lib/notion'
import { displayStatus } from '@/lib/notion'

export interface TreeNodeData {
  segment: string           // raw path segment
  label: string             // display label
  file: ContextFile | null  // null for intermediate folder nodes with no own tracker entry
  children: Record<string, TreeNodeData>
}

const STATUS_DOT: Record<string, string> = {
  published:  'bg-[#00A3FF]',
  assigned:   'bg-[#FF8B4A]',
  unassigned: 'bg-[#FF426F]',
  stale:      'bg-[#FF8B4A] opacity-60',
}

interface TreeNodeProps {
  node: TreeNodeData
  depth: number
  currentUserEmail: string
  filter: string
  onClaim: (id: string) => void
  onMarkStale: (file: ContextFile) => void
}

function nodeMatchesFilter(node: TreeNodeData, filter: string): boolean {
  if (filter === 'all') return true
  const check = (n: TreeNodeData): boolean => {
    if (n.file) {
      const ds = displayStatus(n.file)
      if (filter === 'not_started' && ds === 'unassigned') return true
      if (filter === 'assigned' && ds === 'assigned') return true
      if (filter === 'published' && ds === 'published') return true
      if (filter === 'stale' && ds === 'stale') return true
    }
    return Object.values(n.children).some(check)
  }
  return check(node)
}

export default function TreeNode({ node, depth, currentUserEmail, filter, onClaim, onMarkStale }: TreeNodeProps) {
  const hasChildren = Object.keys(node.children).length > 0
  const [expanded, setExpanded] = useState(depth < 2)

  if (!nodeMatchesFilter(node, filter)) return null

  const ds = node.file ? displayStatus(node.file) : null
  const dotColor = ds ? STATUS_DOT[ds] : null

  const isMine = node.file?.assigned_to === currentUserEmail
  const isPublished = ds === 'published' || ds === 'stale'

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1 px-2 hover:bg-[#F1F1F1] group cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={() => hasChildren && setExpanded(!expanded)}
          className="w-4 h-4 flex items-center justify-center text-[#999] shrink-0"
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : (
            <span className="w-3 h-px bg-[#E1E1E1] block" />
          )}
        </button>

        {/* Status dot */}
        {dotColor ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (node.file && isPublished) onMarkStale(node.file)
            }}
            className={`w-2 h-2 rounded-full shrink-0 ${dotColor} ${isPublished ? 'hover:scale-125 transition-transform' : ''}`}
            title={ds ?? undefined}
          />
        ) : (
          <span className="w-2 h-2 rounded-full shrink-0 bg-[#E1E1E1]" />
        )}

        {/* Label — link if has a file */}
        {node.file ? (
          <Link
            href={`/view/${node.file.id}`}
            className="flex-1 text-sm text-black hover:text-[#00A3FF] truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {node.label}
          </Link>
        ) : (
          <span
            className="flex-1 text-sm text-[#333] font-medium truncate"
            onClick={() => setExpanded(!expanded)}
          >
            {node.label}
          </span>
        )}

        {/* Actions — appear on hover */}
        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
          {node.file && ds === 'unassigned' && (
            <button
              onClick={(e) => { e.stopPropagation(); onClaim(node.file!.id) }}
              className="text-xs text-[#00A3FF] hover:underline px-1"
            >
              Claim
            </button>
          )}
          {node.file && isMine && ds !== 'published' && (
            <Link
              href={`/write/${node.file.id}`}
              className="text-xs text-[#FF8B4A] hover:underline px-1"
              onClick={(e) => e.stopPropagation()}
            >
              Write
            </Link>
          )}
          {node.file && ds === 'stale' && (
            <span className="text-xs text-[#FF8B4A] font-mono px-1">stale</span>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {Object.values(node.children)
            .sort((a, b) => {
              // Folders before leaves, then alpha
              const aHasChildren = Object.keys(a.children).length > 0
              const bHasChildren = Object.keys(b.children).length > 0
              if (aHasChildren !== bHasChildren) return aHasChildren ? -1 : 1
              return a.label.localeCompare(b.label)
            })
            .map((child) => (
              <TreeNode
                key={child.segment}
                node={child}
                depth={depth + 1}
                currentUserEmail={currentUserEmail}
                filter={filter}
                onClaim={onClaim}
                onMarkStale={onMarkStale}
              />
            ))}
        </div>
      )}
    </div>
  )
}
