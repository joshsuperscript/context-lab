'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { StatusBadge, PriorityBadge } from './StatusBadge'
import InterviewChat from './InterviewChat'
import AiAssistant from './AiAssistant'
import type { ContextFile } from '@/lib/notion'
import { Save, Send, ArrowLeft, MessageCircle, PenLine, Loader2 } from 'lucide-react'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

type Phase = 'choosing' | 'interviewing' | 'generating' | 'editing'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function WriteClient({
  file,
  initialContent,
  currentUserEmail,
}: {
  file: ContextFile
  initialContent: string
  currentUserEmail: string
}) {
  const [phase, setPhase] = useState<Phase>('choosing')
  const [content, setContent] = useState(initialContent)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const insertText = useCallback((text: string) => {
    setContent((prev) => prev + '\n\n' + text)
  }, [])

  async function save(textToSave?: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/files/${file.id}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textToSave ?? content }),
      })
      if (!res.ok) throw new Error()
      toast.success('Saved to Notion')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function publish() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/files/${file.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error()
      toast.success('Published!')
      router.push(`/view/${file.id}`)
    } catch {
      toast.error('Failed to publish')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleInterviewComplete(history: Message[]) {
    setPhase('generating')
    try {
      const res = await fetch('/api/interview/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id, history }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data = await res.json()
      setContent(data.content)
      setPhase('editing')
    } catch {
      toast.error('Draft generation failed — switching to manual edit')
      setPhase('editing')
    }
  }

  // ── Phase: choosing ───────────────────────────────────────────────────────
  if (phase === 'choosing') {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-mono">{file.path}</span>
              <StatusBadge status={file.status} />
              <PriorityBadge priority={file.priority} />
            </div>
            <h1 className="text-sm font-semibold text-gray-900">{file.title}</h1>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-[#F9F9F9]">
          <div className="max-w-lg w-full px-6">
            <h2 className="text-xl font-semibold text-black text-center mb-2 tracking-tight">How do you want to write this?</h2>
            <p className="text-xs text-[#999] text-center mb-10 font-mono">
              Talk through what you know and we'll draft it — or write directly in markdown.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPhase('interviewing')}
                className="flex flex-col items-center gap-4 p-8 bg-white border-2 border-[#00A3FF] hover:bg-[#00A3FF] hover:text-white transition-colors group"
              >
                <MessageCircle size={22} className="text-[#00A3FF] group-hover:text-white" />
                <div className="text-center">
                  <p className="text-sm font-semibold">Interview me</p>
                  <p className="text-xs text-[#666] mt-1 group-hover:text-white/80">Talk through it — we'll write the draft</p>
                </div>
              </button>

              <button
                onClick={() => setPhase('editing')}
                className="flex flex-col items-center gap-4 p-8 bg-white border-2 border-[#E1E1E1] hover:border-black transition-colors group"
              >
                <PenLine size={22} className="text-[#666] group-hover:text-black" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-black">Write manually</p>
                  <p className="text-xs text-[#666] mt-1">Open editor with template</p>
                </div>
              </button>
            </div>

            {file.author_hints?.length > 0 && (
              <p className="text-center text-xs text-[#999] mt-8 font-mono">
                Suggested authors: {file.author_hints.join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Phase: interviewing ───────────────────────────────────────────────────
  if (phase === 'interviewing') {
    return (
      <div className="flex flex-col h-screen">
        <InterviewChat
          fileId={file.id}
          section={file.section}
          fileTitle={file.title}
          onDraftReady={handleInterviewComplete}
          onSwitchToManual={() => setPhase('editing')}
        />
      </div>
    )
  }

  // ── Phase: generating ─────────────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-white gap-4">
        <Loader2 size={28} className="animate-spin text-[#00A3FF]" />
        <p className="text-sm font-medium text-gray-700">Writing your draft…</p>
        <p className="text-xs text-gray-400">This takes about 10–15 seconds</p>
      </div>
    )
  }

  // ── Phase: editing ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setPhase('choosing')} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-mono">{file.path}</span>
              <StatusBadge status={file.status} />
              <PriorityBadge priority={file.priority} />
            </div>
            <h1 className="text-sm font-semibold text-gray-900">{file.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => save()}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs border border-[#E1E1E1] hover:border-black text-[#666] hover:text-black rounded-full disabled:opacity-40 transition-colors"
          >
            <Save size={12} /> {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button
            onClick={publish}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-black text-white rounded-full hover:bg-[#00A3FF] disabled:opacity-40 transition-colors"
          >
            <Send size={12} /> {submitting ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Editor + floating AI assistant */}
      <div className="flex-1 overflow-hidden" data-color-mode="light">
        <MDEditor
          value={content}
          onChange={(v) => setContent(v ?? '')}
          height="100%"
          preview="live"
        />
      </div>

      {/* Floating AI assistant (edit helper, not interviewer) */}
      <AiAssistant
        fileId={file.id}
        section={file.section}
        onInsert={insertText}
        embedded={false}
      />
    </div>
  )
}
