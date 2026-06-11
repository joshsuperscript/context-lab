'use client'

import FileCard from './FileCard'
import type { ContextFile } from '@/lib/notion'

export default function DashboardClient({ file, email }: { file: ContextFile; email: string }) {
  return <FileCard file={file} currentUserEmail={email} />
}
