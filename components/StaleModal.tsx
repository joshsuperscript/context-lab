'use client'

import { useState } from 'react'
import type { ContextFile } from '@/lib/notion'
import { pathToBreadcrumb } from '@/lib/notion'

export default function StaleModal({
  file,
  onConfirm,
  onCancel,
}: {
  file: ContextFile
  onConfirm: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  const breadcrumb = pathToBreadcrumb(file.path).join(' / ')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white border border-black w-full max-w-md p-6">
        <h2 className="text-sm font-semibold text-black mb-1">Mark as stale</h2>
        <p className="text-xs text-[#666] mb-4 font-mono">{breadcrumb}</p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this stale? (required)"
          rows={3}
          className="w-full text-sm border border-[#E1E1E1] focus:border-black p-3 resize-none focus:outline-none mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
            className="flex-1 py-2 bg-black text-white text-xs rounded-full hover:bg-[#FF8B4A] disabled:opacity-40 transition-colors"
          >
            Mark stale
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs text-[#666] border border-[#E1E1E1] rounded-full hover:border-black"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
