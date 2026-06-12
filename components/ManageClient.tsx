'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import type { ContextFile } from '@/lib/notion'

const SECTIONS = ['pricing', 'technology', 'customers', 'products', 'healthcare', 'go-to-market', 'design', 'company']

export default function ManageClient({
  unassigned,
  staff,
}: {
  unassigned: ContextFile[]
  staff: { name: string; email: string }[]
}) {
  const [bulkPaths, setBulkPaths] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [singleTitle, setSingleTitle] = useState('')
  const [singleSection, setSingleSection] = useState('company')
  const [singlePath, setSinglePath] = useState('')
  const [singleLoading, setSingleLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const router = useRouter()

  async function bulkAdd() {
    const paths = bulkPaths.split('\n').map((p) => p.trim()).filter(Boolean)
    if (!paths.length) return
    setBulkLoading(true)
    let added = 0
    for (const rawPath of paths) {
      const path = rawPath.startsWith('context/') ? rawPath : `context/${rawPath}`
      const section = path.split('/')[1] ?? 'company'
      const slug = path.split('/').pop()?.replace(/\.md$/, '') ?? 'untitled'
      const title = slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      try {
        await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, title, section, priority: 'medium', is_expansion: false, author_hints: [], bus_factor: false }),
        })
        added++
      } catch { /* continue */ }
    }
    setBulkLoading(false)
    setBulkPaths('')
    toast.success(`Added ${added} of ${paths.length} files`)
    router.refresh()
  }

  async function singleAdd() {
    if (!singleTitle || !singlePath) return
    setSingleLoading(true)
    const path = singlePath.startsWith('context/') ? singlePath : `context/${singleSection}/${singlePath}`
    try {
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, title: singleTitle, section: singleSection, priority: 'medium', is_expansion: false, author_hints: [], bus_factor: false }),
      })
      toast.success(`Added: ${singleTitle}`)
      setSingleTitle(''); setSinglePath('')
      router.refresh()
    } catch { toast.error('Failed') }
    setSingleLoading(false)
  }

  async function assign(fileId: string, email: string) {
    await fetch(`/api/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: email, status: 'in_progress' }),
    })
    toast.success(`Assigned to ${email.split('@')[0]}`)
    router.refresh()
  }

  async function syncNotion() {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/sync-notion', { method: 'POST' })
      const data = await res.json()
      toast.success(`Sync complete — ${data.added} added, ${data.skipped} already tracked`)
      router.refresh()
    } catch { toast.error('Sync failed') }
    setSyncing(false)
  }

  return (
    <div className="p-8 max-w-3xl space-y-10">
      {/* Bulk add */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-[#999] mb-3">Bulk add context files</h2>
        <textarea
          value={bulkPaths}
          onChange={(e) => setBulkPaths(e.target.value)}
          placeholder="One path per line, e.g.&#10;context/pricing/ale-service.md&#10;context/customers/new-customer/quirks.md"
          rows={6}
          className="w-full text-sm font-mono border border-[#E1E1E1] focus:border-black p-3 resize-none focus:outline-none bg-white"
        />
        <button
          onClick={bulkAdd}
          disabled={bulkLoading || !bulkPaths.trim()}
          className="mt-2 px-5 py-2 bg-black text-white text-xs rounded-full hover:bg-[#00A3FF] disabled:opacity-40 transition-colors"
        >
          {bulkLoading ? 'Adding…' : 'Add all'}
        </button>
      </section>

      {/* Single add */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-[#999] mb-3">Add single file</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            value={singleTitle}
            onChange={(e) => setSingleTitle(e.target.value)}
            placeholder="Title"
            className="text-sm border border-[#E1E1E1] focus:border-black px-3 py-2 focus:outline-none bg-white"
          />
          <select
            value={singleSection}
            onChange={(e) => setSingleSection(e.target.value)}
            className="text-sm border border-[#E1E1E1] focus:border-black px-3 py-2 focus:outline-none bg-white"
          >
            {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <input
          value={singlePath}
          onChange={(e) => setSinglePath(e.target.value)}
          placeholder="Path (e.g. context/pricing/ale-service.md)"
          className="w-full text-sm font-mono border border-[#E1E1E1] focus:border-black px-3 py-2 focus:outline-none bg-white mb-3"
        />
        <button
          onClick={singleAdd}
          disabled={singleLoading || !singleTitle || !singlePath}
          className="px-5 py-2 bg-black text-white text-xs rounded-full hover:bg-[#00A3FF] disabled:opacity-40 transition-colors"
        >
          {singleLoading ? 'Adding…' : 'Add file'}
        </button>
      </section>

      {/* Unassigned files */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-[#999]">
            Unassigned files ({unassigned.length})
          </h2>
          <button
            onClick={syncNotion}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs text-[#666] border border-[#E1E1E1] hover:border-black px-3 py-1.5 transition-colors"
          >
            <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync from Notion'}
          </button>
        </div>
        {unassigned.length === 0 ? (
          <p className="text-sm text-[#999] border border-dashed border-[#E1E1E1] px-4 py-6 text-center">
            All files are assigned.
          </p>
        ) : (
          <div className="space-y-px border border-[#E1E1E1]">
            {unassigned.slice(0, 50).map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-[#F9F9F9]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-black truncate">{f.title}</p>
                  <p className="text-xs text-[#999] font-mono truncate">{f.path}</p>
                </div>
                <select
                  defaultValue=""
                  onChange={(e) => e.target.value && assign(f.id, e.target.value)}
                  className="text-xs border border-[#E1E1E1] px-2 py-1 focus:border-black focus:outline-none bg-white"
                >
                  <option value="">Assign to…</option>
                  {staff.map((s) => (
                    <option key={s.email} value={s.email}>{s.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
