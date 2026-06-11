'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { StatusBadge, PriorityBadge } from './StatusBadge'
import AiAssistant from './AiAssistant'
import type { ContextFile } from '@/lib/notion'
import { Save, Send, ArrowLeft, MessageCircle, PenLine } from 'lucide-react'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

type WriteMode = 'interview' | 'direct'

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
  const [mode, setMode] = useState<WriteMode>('interview')
  const router = useRouter()

  const insertText = useCallback((text: string) => {
    setContent((prev) => prev + '\n\n' + text)
  }, [])

  async function save() {
    setSaving(true)
    try {
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
      await save()
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

        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setMode('interview')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors ${
                mode === 'interview' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageCircle size={11} /> Interview me
            </button>
            <button
              onClick={() => setMode('direct')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors ${
                mode === 'direct' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <PenLine size={11} /> Write directly
            </button>
          </div>

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

      {/* Main content area */}
      {mode === 'interview' ? (
        // Interview mode: AI assistant dominates, editor below
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 border-r border-gray-200 overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-xs text-gray-500">AI Assistant — answers are inserted into your doc</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <AiAssistant
                fileId={file.id}
                section={file.section}
                onInsert={insertText}
                embedded
              />
            </div>
          </div>
          <div className="flex-1 overflow-hidden" data-color-mode="light">
            <MDEditor
              value={content}
              onChange={(v) => setContent(v ?? '')}
              height="100%"
              preview="live"
            />
          </div>
        </div>
      ) : (
        // Direct mode: full-width editor, AI assistant as floating button
        <div className="flex-1 overflow-hidden" data-color-mode="light">
          <MDEditor
            value={content}
            onChange={(v) => setContent(v ?? '')}
            height="100%"
            preview="live"
          />
          <AiAssistant
            fileId={file.id}
            section={file.section}
            onInsert={insertText}
            embedded={false}
          />
        </div>
      )}
    </div>
  )
}
