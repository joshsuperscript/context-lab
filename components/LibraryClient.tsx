'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import FileCard from './FileCard'
import { toast } from 'sonner'
import type { ContextFile } from '@/lib/notion'
import { Plus } from 'lucide-react'

const SECTIONS = ['all', 'pricing', 'technology', 'customers', 'products', 'healthcare', 'go-to-market', 'design', 'company']
const STATUSES = ['all', 'requested', 'in_progress', 'draft_submitted', 'published']

export default function LibraryClient({
  files: initialFiles,
  currentUserEmail,
  isAdmin,
}: {
  files: ContextFile[]
  currentUserEmail: string
  isAdmin: boolean
}) {
  const [files, setFiles] = useState(initialFiles)
  const [section, setSection] = useState('all')
  const [status, setStatus] = useState('all')
  const [mine, setMine] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const filtered = files.filter((f) => {
    if (section !== 'all' && f.section !== section) return false
    if (status !== 'all' && f.status !== status) return false
    if (mine && f.assigned_to !== currentUserEmail) return false
    return true
  })

  async function claim(id: string) {
    const res = await fetch(`/api/files/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: currentUserEmail }),
    })
    if (!res.ok) { toast.error('Failed to claim'); return }
    const updated = await res.json()
    setFiles((prev) => prev.map((f) => (f.id === id ? updated : f)))
    toast.success('File claimed — head to the editor to start writing')
    startTransition(() => router.refresh())
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Library</h1>
          <p className="text-sm text-gray-500 mt-0.5">{files.length} context files</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => router.push('/library/new')}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#00A3FF] text-white text-sm rounded-lg hover:bg-[#0091e6]"
          >
            <Plus size={14} /> Add file
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${section === s ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {s === 'all' ? 'All sections' : s}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${status === s ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {s === 'all' ? 'All statuses' : s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <button
          onClick={() => setMine(!mine)}
          className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${mine ? 'bg-[#00A3FF]/10 border-[#00A3FF]/30 text-[#00A3FF] font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
        >
          Mine only
        </button>
      </div>

      {/* File list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No files match your filters.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => (
            <FileCard
              key={f.id}
              file={f}
              currentUserEmail={currentUserEmail}
              onClaim={claim}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  )
}
