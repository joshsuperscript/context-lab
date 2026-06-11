'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface InterviewChatProps {
  fileId: string
  section: string
  fileTitle: string
  onDraftReady: (history: Message[]) => void
  onSwitchToManual: () => void
}

const DRAFT_SIGNAL = '<DRAFT_READY>'

export default function InterviewChat({
  fileId,
  section,
  fileTitle,
  onDraftReady,
  onSwitchToManual,
}: InterviewChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const [exchangeCount, setExchangeCount] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // Kick off the interview automatically on mount
  useEffect(() => {
    send('Start the interview — ask your first question.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function send(text?: string) {
    const userMessage = (text ?? input).trim()
    if (!userMessage && messages.length > 0) return

    const isAutoStart = text && messages.length === 0
    const newMessages: Message[] = isAutoStart
      ? messages
      : [...messages, { role: 'user' as const, content: userMessage }]

    if (!isAutoStart) {
      setMessages(newMessages)
      setExchangeCount((n) => n + 1)
    }
    setInput('')
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          section,
          message: userMessage,
          history: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) throw new Error('Request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      setMessages([...newMessages, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantText += decoder.decode(value, { stream: true })
        setMessages([...newMessages, { role: 'assistant', content: assistantText }])
      }

      // Check if bot signalled completion
      if (assistantText.includes(DRAFT_SIGNAL)) {
        setDraftReady(true)
      }

      // Focus input after response
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') toast.error('Something went wrong')
    } finally {
      setStreaming(false)
    }
  }

  function getDisplayText(content: string) {
    return content.replace(DRAFT_SIGNAL, '').trim()
  }

  const fullHistory = messages.filter((m) => m.content.trim())

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{fileTitle}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Interview in progress{exchangeCount > 0 ? ` · ${exchangeCount} exchange${exchangeCount !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <button
          onClick={onSwitchToManual}
          className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
        >
          Switch to manual
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {messages.map((msg, i) => {
          const displayText = getDisplayText(msg.content)
          if (!displayText) return null
          const isUser = msg.role === 'user'
          return (
            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-2xl rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#00A3FF] text-white rounded-tr-sm'
                    : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                }`}
              >
                {displayText}
              </div>
            </div>
          )
        })}

        {streaming && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-5 py-3 flex items-center gap-2">
              <Loader2 size={13} className="animate-spin text-gray-400" />
              <span className="text-xs text-gray-400">Thinking…</span>
            </div>
          </div>
        )}
      </div>

      {/* Draft ready CTA */}
      {draftReady && (
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Ready to write the draft. You can keep answering or generate now.
            </p>
            <button
              onClick={() => onDraftReady(fullHistory)}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[#00A3FF] text-white text-sm font-medium rounded-xl hover:bg-[#0091e6] transition-colors"
            >
              Generate my draft →
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-8 py-5 border-t border-gray-100 shrink-0">
        <div className="max-w-2xl mx-auto flex gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Answer here…"
            disabled={streaming}
            className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/30 focus:border-[#00A3FF] disabled:opacity-50 bg-white"
          />
          <button
            onClick={() => send()}
            disabled={streaming || !input.trim()}
            className="px-4 py-3 bg-[#00A3FF] text-white rounded-xl hover:bg-[#0091e6] disabled:opacity-40 transition-colors"
          >
            <Send size={15} />
          </button>
        </div>
        {exchangeCount >= 4 && !draftReady && (
          <p className="text-center text-xs text-gray-400 mt-3">
            Type <span className="font-mono bg-gray-100 px-1 rounded">"write it"</span> when ready to generate the draft
          </p>
        )}
      </div>
    </div>
  )
}
