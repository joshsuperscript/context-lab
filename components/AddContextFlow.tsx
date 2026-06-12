'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Check, Edit3 } from 'lucide-react'

type Step = 'intent' | 'confirming' | 'creating' | 'done'

interface Suggestion {
  title: string
  section: string
  path: string
  clarifyingQuestion: string | null
}

export default function AddContextFlow({ currentUserEmail }: { currentUserEmail: string }) {
  const [step, setStep] = useState<Step>('intent')
  const [input, setInput] = useState('')
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingPath, setEditingPath] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const router = useRouter()

  async function getsuggestion() {
    if (!input.trim()) return
    setStep('confirming')
    try {
      const res = await fetch('/api/files/suggest-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: input }),
      })
      const data = await res.json()
      setSuggestion(data)
      setEditingTitle(data.title)
      setEditingPath(data.path)
    } catch {
      toast.error('Failed to get suggestion')
      setStep('intent')
    }
  }

  async function createAndStart() {
    if (!suggestion) return
    setStep('creating')
    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: editingPath,
          title: editingTitle,
          section: suggestion.section,
          priority: 'medium',
          is_expansion: false,
          author_hints: [currentUserEmail],
          bus_factor: false,
          assigned_to: currentUserEmail,
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      const file = await res.json()
      // Assign to self
      await fetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: currentUserEmail, status: 'in_progress' }),
      })
      // Navigate directly to interview mode
      router.push(`/write/${file.id}?mode=interview`)
    } catch {
      toast.error('Failed to create context file')
      setStep('confirming')
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#F9F9F9] items-center justify-center px-6">
      <div className="w-full max-w-lg">
        {step === 'intent' && (
          <>
            <div className="mb-6">
              <div className="w-8 h-8 bg-[#00A3FF] mb-4" />
              <h1 className="text-xl font-semibold text-black tracking-tight">Add context</h1>
              <p className="text-sm text-[#666] mt-1">Describe what you want to document. We'll figure out where it goes.</p>
            </div>
            <div className="bg-white border border-black p-4 mb-4">
              <textarea
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) getsuggestion() }}
                placeholder="What are you planning to create today? (e.g. 'How the ALE overnight job works' or 'Rappore deployment quirks')"
                rows={4}
                className="w-full text-sm text-black placeholder:text-[#999] focus:outline-none resize-none"
              />
            </div>
            <button
              onClick={getsuggestion}
              disabled={!input.trim()}
              className="w-full py-3 bg-black text-white text-sm rounded-full hover:bg-[#00A3FF] disabled:opacity-40 transition-colors"
            >
              Continue
            </button>
          </>
        )}

        {step === 'confirming' && !suggestion && (
          <div className="flex items-center gap-3 text-sm text-[#666]">
            <Loader2 size={16} className="animate-spin" />
            Figuring out where this belongs…
          </div>
        )}

        {step === 'confirming' && suggestion && (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-black tracking-tight mb-1">Does this look right?</h1>
              <p className="text-sm text-[#666]">We'll create this page and start the interview.</p>
            </div>

            {suggestion.clarifyingQuestion && (
              <div className="bg-[#00A3FF]/10 border border-[#00A3FF]/30 p-4 mb-4 text-sm text-black">
                <p className="font-medium text-[#00A3FF] text-xs mb-1 font-mono uppercase">Before we continue</p>
                {suggestion.clarifyingQuestion}
              </div>
            )}

            <div className="bg-white border border-black p-5 mb-4 space-y-4">
              <div>
                <p className="text-xs text-[#999] font-mono uppercase tracking-widest mb-1">Title</p>
                {isEditing ? (
                  <input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="w-full text-sm font-medium text-black border-b border-[#E1E1E1] focus:border-black focus:outline-none pb-1"
                  />
                ) : (
                  <p className="text-sm font-medium text-black">{editingTitle}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-[#999] font-mono uppercase tracking-widest mb-1">Path</p>
                {isEditing ? (
                  <input
                    value={editingPath}
                    onChange={(e) => setEditingPath(e.target.value)}
                    className="w-full text-xs font-mono text-[#666] border-b border-[#E1E1E1] focus:border-black focus:outline-none pb-1"
                  />
                ) : (
                  <p className="text-xs font-mono text-[#666]">{editingPath}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-[#999] font-mono uppercase tracking-widest mb-1">Section</p>
                <p className="text-xs text-[#666]">{suggestion.section}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={createAndStart}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-black text-white text-sm rounded-full hover:bg-[#00A3FF] transition-colors"
              >
                <Check size={14} /> Looks good — start interview
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-3 border border-[#E1E1E1] hover:border-black text-[#666] hover:text-black rounded-full transition-colors"
                title="Edit title or path"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => { setStep('intent'); setSuggestion(null) }}
                className="px-4 py-3 border border-[#E1E1E1] hover:border-black text-[#666] hover:text-black rounded-full transition-colors text-sm"
              >
                Change
              </button>
            </div>
          </>
        )}

        {step === 'creating' && (
          <div className="flex items-center gap-3 text-sm text-[#666]">
            <Loader2 size={16} className="animate-spin text-[#00A3FF]" />
            Creating your context file…
          </div>
        )}
      </div>
    </div>
  )
}
