'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { StatusBadge, PriorityBadge } from './StatusBadge'
import type { ContextFile } from '@/lib/notion'
import { CheckCircle, XCircle, ExternalLink, RefreshCw } from 'lucide-react'
import NotionPageViewer from './NotionPageViewer'

export default function AdminClient({
  pending: initialPending,
  reviewerEmail,
}: {
  pending: ContextFile[]
  reviewerEmail: string
}) {
  const [pending, setPending] = useState(initialPending)
  const [selected, setSelected] = useState<ContextFile | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const router = useRouter()

  async function syncNotion() {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/sync-notion', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Sync complete — ${data.added} added, ${data.skipped} already tracked`)
      router.refresh()
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function approve(file: ContextFile) {
    setProcessing(true)
    try {
      // Dedicated approve route: copies draft from tracker row to source page, then marks published
      const res = await fetch(`/api/files/${file.id}/approve`, { method: 'POST' })
      if (!res.ok) throw new Error()
      setPending((prev) => prev.filter((f) => f.id !== file.id))
      setSelected(null)
      toast.success(`${file.title} approved and published`)
      router.refresh()
    } catch {
      toast.error('Failed to approve')
    } finally {
      setProcessing(false)
    }
  }

  async function reject(file: ContextFile) {
    if (!rejectNote.trim()) { toast.error('Add a note explaining what needs to change'); return }
    setProcessing(true)
    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in_progress',
          review_note: rejectNote,
          reviewed_by: reviewerEmail,
          reviewed_at: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error()
      setPending((prev) => prev.filter((f) => f.id !== file.id))
      setSelected(null)
      setRejectNote('')
      setShowReject(false)
      toast.success('Sent back for revision')
      router.refresh()
    } catch {
      toast.error('Failed to reject')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Left: queue */}
      <div className="w-80 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-gray-900">Review queue</h1>
              <p className="text-xs text-gray-500 mt-0.5">{pending.length} pending</p>
            </div>
            <button
              onClick={syncNotion}
              disabled={syncing}
              title="Sync empty Notion pages into tracker"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 disabled:opacity-40"
            >
              <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
          </div>
        </div>

        {pending.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No drafts to review.</p>
        ) : (
          pending.map((f) => (
            <button
              key={f.id}
              onClick={() => { setSelected(f); setShowReject(false); setRejectNote('') }}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${selected?.id === f.id ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{f.title}</p>
                  <p className="text-xs text-gray-400 font-mono truncate mt-0.5">{f.path}</p>
                </div>
                <PriorityBadge priority={f.priority} />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                by {f.submitted_by?.split('@')[0]} · {f.submitted_at ? new Date(f.submitted_at).toLocaleDateString() : ''}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Right: review */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Select a draft to review
          </div>
        ) : (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-gray-400">{selected.path}</span>
                  <StatusBadge status={selected.status} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{selected.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Submitted by {selected.submitted_by?.split('@')[0]} on{' '}
                  {selected.submitted_at ? new Date(selected.submitted_at).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {selected.source_page_id && (
                  <a
                    href={`https://notion.so/${selected.source_page_id.replace(/-/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                  >
                    <ExternalLink size={12} /> Current published version
                  </a>
                )}
              </div>
            </div>

            {/* Draft content preview — reads from tracker row */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-6 max-h-96 overflow-y-auto">
              <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">Draft content</p>
              <NotionPageViewer notionPageId={selected.id} />
            </div>

            {/* Actions */}
            <div className="flex items-start gap-3">
              <button
                onClick={() => approve(selected)}
                disabled={processing}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-40"
              >
                <CheckCircle size={14} /> Approve & Publish
              </button>

              <div className="flex-1">
                {!showReject ? (
                  <button
                    onClick={() => setShowReject(true)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50"
                  >
                    <XCircle size={14} /> Request changes
                  </button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="What needs to change? Be specific."
                      rows={3}
                      className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-red-300 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => reject(selected)}
                        disabled={processing}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-40"
                      >
                        Send back
                      </button>
                      <button
                        onClick={() => { setShowReject(false); setRejectNote('') }}
                        className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
