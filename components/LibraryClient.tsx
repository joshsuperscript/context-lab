'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import FileCard from './FileCard'
import { toast } from 'sonner'
import type { ContextFile } from '@/lib/notion'
import { Plus } from 'lucide-react'

const SECTIONS = ['all', 'pricing', 'technology', 'customers', 'products', 'healthcare', 'go-to-market', 'design', 'company']

type ViewTab = 'all' | 'needs_work' | 'published' | 'stale'

const TABS: { key: ViewTab; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'needs_work', label: 'Needs Work' },
  { key: 'published',  label: 'Published' },
  { key: 'stale',      label: 'Stale' },
]

const NEEDS_WORK_STATUSES = new Set(['requested', 'in_progress', 'draft_submitted'])

export default function LibraryClient({
  files: initialFiles,
  currentUserEmail,
  isAdmin,
  staff = [],
}: {
  files: ContextFile[]
  currentUserEmail: string
  isAdmin: boolean
  staff?: { name: string; email: string }[]
}) {
  const [files, setFiles] = useState(initialFiles)
  const [section, setSection] = useState('all')
  const [tab, setTab] = useState<ViewTab>('all')
  const [mine, setMine] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const filtered = files.filter((f) => {
    if (section !== 'all' && f.section !== section) return false
    if (tab === 'needs_work' && !NEEDS_WORK_STATUSES.has(f.status)) return false
    if (tab === 'published' && f.status !== 'published') return false
    if (tab === 'stale' && f.status !== 'stale') return false
    if (mine && f.assigned_to !== currentUserEmail) return false
    return true
  })

  async function patchFile(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/files/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('Update failed')
    return res.json()
  }

  async function claim(id: string) {
    try {
      const updated = await patchFile(id, { assigned_to: currentUserEmail })
      setFiles((prev) => prev.map((f) => (f.id === id ? updated : f)))
      toast.success('File claimed')
      startTransition(() => router.refresh())
    } catch { toast.error('Failed to claim') }
  }

  async function assign(id: string, email: string) {
    try {
      const updated = await patchFile(id, { assigned_to: email })
      setFiles((prev) => prev.map((f) => (f.id === id ? updated : f)))
      toast.success(`Assigned to ${email.split('@')[0]}`)
      startTransition(() => router.refresh())
    } catch { toast.error('Failed to assign') }
  }

  async function markStale(id: string) {
    try {
      const updated = await patchFile(id, { status: 'stale', assigned_to: null })
      setFiles((prev) => prev.map((f) => (f.id === id ? updated : f)))
      toast.success('Marked as stale')
    } catch { toast.error('Failed to mark stale') }
  }

  const counts = {
    needs_work: files.filter((f) => NEEDS_WORK_STATUSES.has(f.status)).length,
    published:  files.filter((f) => f.status === 'published').length,
    stale:      files.filter((f) => f.status === 'stale').length,
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-black tracking-tight">Library</h1>
          <p className="text-xs text-[#999] mt-0.5 font-mono">{files.length} context files</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => router.push('/library/new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs rounded-full hover:bg-[#00A3FF] transition-colors"
          >
            <Plus size={13} /> Add file
          </button>
        )}
      </div>

      {/* View tabs — sharp underline style */}
      <div className="flex border-b border-[#E1E1E1] mb-5 gap-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-xs transition-colors flex items-center gap-2 border-b-2 -mb-px ${
              tab === t.key
                ? 'border-[#00A3FF] text-[#00A3FF] font-medium'
                : 'border-transparent text-[#666] hover:text-black'
            }`}
          >
            {t.label}
            {t.key !== 'all' && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                tab === t.key ? 'bg-[#00A3FF]/10 text-[#00A3FF]' : 'bg-[#F1F1F1] text-[#999]'
              }`}>
                {counts[t.key as keyof typeof counts] ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Section + mine filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`px-3 py-1 text-xs transition-colors whitespace-nowrap rounded-full border ${
                section === s
                  ? 'bg-black text-white border-black'
                  : 'border-[#E1E1E1] text-[#666] hover:border-black hover:text-black'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <button
          onClick={() => setMine(!mine)}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            mine ? 'bg-[#00A3FF] text-white border-[#00A3FF]' : 'border-[#E1E1E1] text-[#666] hover:border-black'
          }`}
        >
          Mine only
        </button>
      </div>

      {/* File list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-[#999] text-center py-12">No files match your filters.</p>
      ) : (
        <div className="space-y-px border border-[#E1E1E1]">
          {filtered.map((f) => (
            <FileCard
              key={f.id}
              file={f}
              currentUserEmail={currentUserEmail}
              staff={staff}
              onClaim={claim}
              onAssign={isAdmin ? assign : undefined}
              onMarkStale={isAdmin ? markStale : undefined}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  )
}
