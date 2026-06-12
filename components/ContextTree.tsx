'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import TreeNode, { type TreeNodeData } from './TreeNode'
import type { ContextFile } from '@/lib/notion'
import { displayStatus, pathToBreadcrumb } from '@/lib/notion'
import ContextChat from './ContextChat'
import StaleModal from './StaleModal'

type FilterKey = 'all' | 'not_started' | 'assigned' | 'published' | 'stale'

const FILTERS: { key: FilterKey; label: string; dot?: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'not_started', label: 'Not Started', dot: 'bg-[#FF426F]' },
  { key: 'assigned',    label: 'Assigned',    dot: 'bg-[#FF8B4A]' },
  { key: 'published',   label: 'Published',   dot: 'bg-[#00A3FF]' },
  { key: 'stale',       label: 'Stale',       dot: 'bg-[#FF8B4A] opacity-60' },
]

const SECTION_ORDER = ['company', 'products', 'customers', 'technology', 'pricing', 'healthcare', 'go-to-market', 'design']

function buildTree(files: ContextFile[]): Record<string, TreeNodeData> {
  const root: Record<string, TreeNodeData> = {}

  for (const file of files) {
    const segments = file.path
      .replace(/^context\//, '')
      .replace(/\.md$/, '')
      .split('/')

    let current = root
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      const label = seg.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      if (!current[seg]) {
        current[seg] = { segment: seg, label, file: null, children: {} }
      }
      if (i === segments.length - 1) {
        current[seg].file = file
      }
      current = current[seg].children
    }
  }

  return root
}

export default function ContextTree({
  files: initialFiles,
  currentUserEmail,
  staff,
}: {
  files: ContextFile[]
  currentUserEmail: string
  staff: { name: string; email: string }[]
}) {
  const [files, setFiles] = useState(initialFiles)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [staleTarget, setStaleTarget] = useState<ContextFile | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const tree = buildTree(files)

  async function claim(id: string) {
    const res = await fetch(`/api/files/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: currentUserEmail, status: 'in_progress' }),
    })
    if (!res.ok) { toast.error('Failed to claim'); return }
    const updated = await res.json()
    setFiles((prev) => prev.map((f) => (f.id === id ? updated : f)))
    toast.success('Claimed — it\'s in your dashboard now')
    startTransition(() => router.refresh())
  }

  async function markStaleWithReason(file: ContextFile, reason: string) {
    const res = await fetch(`/api/files/${file.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'stale', review_note: reason }),
    })
    if (!res.ok) { toast.error('Failed to mark stale'); return }
    const updated = await res.json()
    setFiles((prev) => prev.map((f) => (f.id === file.id ? updated : f)))
    toast.success('Marked as stale')
    setStaleTarget(null)
  }

  // Summary counts
  const counts = files.reduce((acc, f) => {
    const ds = displayStatus(f)
    acc[ds] = (acc[ds] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const orderedSections = SECTION_ORDER.filter((s) => tree[s])
    .concat(Object.keys(tree).filter((s) => !SECTION_ORDER.includes(s)))

  return (
    <div className="flex flex-col h-full">
      {/* Context AI Chat */}
      <ContextChat />

      {/* Stats row */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-[#E1E1E1] bg-white shrink-0">
        {[
          { label: 'Not started', key: 'unassigned', color: 'text-[#FF426F]' },
          { label: 'Assigned',    key: 'assigned',   color: 'text-[#FF8B4A]' },
          { label: 'Published',   key: 'published',  color: 'text-[#00A3FF]' },
          { label: 'Stale',       key: 'stale',      color: 'text-[#FF8B4A]' },
        ].map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className={`text-sm font-semibold ${s.color}`}>{counts[s.key] ?? 0}</span>
            <span className="text-xs text-[#999]">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 px-5 py-2.5 border-b border-[#E1E1E1] bg-white shrink-0">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-colors ${
              filter === f.key
                ? 'bg-black text-white border-black'
                : 'border-[#E1E1E1] text-[#666] hover:border-black'
            }`}
          >
            {f.dot && <span className={`w-2 h-2 rounded-full shrink-0 ${f.dot}`} />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {orderedSections.map((sectionKey) => (
          <TreeNode
            key={sectionKey}
            node={tree[sectionKey]}
            depth={0}
            currentUserEmail={currentUserEmail}
            filter={filter}
            onClaim={claim}
            onMarkStale={setStaleTarget}
          />
        ))}
      </div>

      {/* Stale modal */}
      {staleTarget && (
        <StaleModal
          file={staleTarget}
          onConfirm={(reason) => markStaleWithReason(staleTarget, reason)}
          onCancel={() => setStaleTarget(null)}
        />
      )}
    </div>
  )
}
