'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { StatusBadge, PriorityBadge } from './StatusBadge'
import InterviewBot from './InterviewBot'
import type { ContextFile } from '@/lib/notion'
import { Save, Send, ArrowLeft } from 'lucide-react'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

export default function WriteClient({
  file,
  initialContent,
  currentUserEmail,
}: {
  file: ContextFile
  initialContent: string
  currentUserEmail: string
}) {
  const [content, setContent] = useState(initialContent)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const insertText = useCallback((text: string) => {
    setContent((prev) => prev + '\n\n' + text)
  }, [])

  async function save() {
    setSaving(true)
    try {
      // Save content back to Notion (create page if needed)
      const res = await fetch(`/api/files/${file.id}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error()
      toast.success('Saved to Notion')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function submitForReview() {
    setSubmitting(true)
    try {
      // Save first
      await save()
      // Then mark as submitted
      const res = await fetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'draft_submitted',
          submitted_by: currentUserEmail,
          submitted_at: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Submitted for review!')
      router.push('/library')
    } catch {
      toast.error('Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = file.status === 'in_progress' || file.status === 'requested'

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-mono">{file.path}</span>
              <StatusBadge status={file.status} />
              <PriorityBadge priority={file.priority} />
            </div>
            <h1 className="text-sm font-semibold text-gray-900 mt-0.5">{file.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <Save size={12} /> {saving ? 'Saving…' : 'Save'}
          </button>
          {canSubmit && (
            <button
              onClick={submitForReview}
              disabled={submitting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#00A3FF] text-white rounded-lg hover:bg-[#0091e6] disabled:opacity-40"
            >
              <Send size={12} /> {submitting ? 'Submitting…' : 'Submit for review'}
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden" data-color-mode="light">
        <MDEditor
          value={content}
          onChange={(v) => setContent(v ?? '')}
          height="100%"
          preview="live"
        />
      </div>

      {/* Floating interview bot */}
      <InterviewBot fileId={file.id} onInsert={insertText} />
    </div>
  )
}
