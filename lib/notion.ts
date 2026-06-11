import { Client } from '@notionhq/client'
import type {
  PageObjectResponse,
  QueryDataSourceParameters,
} from '@notionhq/client/build/src/api-endpoints'

const notion = new Client({ auth: process.env.NOTION_TOKEN })

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContextFileStatus =
  | 'requested'
  | 'in_progress'
  | 'draft_submitted'
  | 'approved'
  | 'published'

export type ContextFilePriority = 'high' | 'medium' | 'low'

export interface ContextFile {
  id: string              // Notion page ID — also the document's own page
  path: string
  title: string
  section: string
  status: ContextFileStatus
  priority: ContextFilePriority
  assigned_to: string | null
  submitted_by: string | null
  submitted_at: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  linear_ticket_id: string | null
  is_expansion: boolean
  author_hints: string[]
  bus_factor: boolean
  created_at: string
  updated_at: string
}

// ─── Property helpers ─────────────────────────────────────────────────────────

function prop(page: PageObjectResponse, name: string) {
  return page.properties[name]
}

function getText(page: PageObjectResponse, name: string): string {
  const p = prop(page, name)
  if (!p) return ''
  if (p.type === 'rich_text') return p.rich_text.map((r) => r.plain_text).join('')
  if (p.type === 'title') return p.title.map((r) => r.plain_text).join('')
  if (p.type === 'email') return p.email ?? ''
  if (p.type === 'url') return p.url ?? ''
  return ''
}

function getSelect(page: PageObjectResponse, name: string): string {
  const p = prop(page, name)
  return p?.type === 'select' ? (p.select?.name ?? '') : ''
}

function getCheckbox(page: PageObjectResponse, name: string): boolean {
  const p = prop(page, name)
  return p?.type === 'checkbox' ? p.checkbox : false
}

function getDate(page: PageObjectResponse, name: string): string | null {
  const p = prop(page, name)
  return p?.type === 'date' ? (p.date?.start ?? null) : null
}

function pageToContextFile(page: PageObjectResponse): ContextFile {
  const hintsRaw = getText(page, 'Author Hints')
  return {
    id: page.id,
    path: getText(page, 'Path'),
    title: getText(page, 'Name'),
    section: getSelect(page, 'Section'),
    status: (getSelect(page, 'Status') || 'requested') as ContextFileStatus,
    priority: (getSelect(page, 'Priority') || 'medium') as ContextFilePriority,
    assigned_to: getText(page, 'Assigned To') || null,
    submitted_by: getText(page, 'Submitted By') || null,
    submitted_at: getDate(page, 'Submitted At'),
    reviewed_by: getText(page, 'Reviewed By') || null,
    reviewed_at: getDate(page, 'Reviewed At'),
    review_note: getText(page, 'Review Note') || null,
    linear_ticket_id: getText(page, 'Linear Ticket') || null,
    is_expansion: getCheckbox(page, 'Is Expansion'),
    bus_factor: getCheckbox(page, 'Bus Factor'),
    author_hints: hintsRaw ? hintsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
    created_at: page.created_time,
    updated_at: page.last_edited_time,
  }
}

type RichTextInput = { text: { content: string } }[]
function rt(text: string): RichTextInput {
  return [{ text: { content: text } }]
}

function toProperties(data: Partial<ContextFile>): Record<string, unknown> {
  const props: Record<string, unknown> = {}
  if (data.title !== undefined) props['Name'] = { title: rt(data.title) }
  if (data.path !== undefined) props['Path'] = { rich_text: rt(data.path) }
  if (data.section !== undefined) props['Section'] = { select: { name: data.section } }
  if (data.status !== undefined) props['Status'] = { select: { name: data.status } }
  if (data.priority !== undefined) props['Priority'] = { select: { name: data.priority } }
  if ('assigned_to' in data) props['Assigned To'] = { rich_text: rt(data.assigned_to ?? '') }
  if ('submitted_by' in data) props['Submitted By'] = { rich_text: rt(data.submitted_by ?? '') }
  if ('submitted_at' in data) props['Submitted At'] = data.submitted_at ? { date: { start: data.submitted_at } } : { date: null }
  if ('reviewed_by' in data) props['Reviewed By'] = { rich_text: rt(data.reviewed_by ?? '') }
  if ('reviewed_at' in data) props['Reviewed At'] = data.reviewed_at ? { date: { start: data.reviewed_at } } : { date: null }
  if ('review_note' in data) props['Review Note'] = { rich_text: rt(data.review_note ?? '') }
  if ('linear_ticket_id' in data) props['Linear Ticket'] = { rich_text: rt(data.linear_ticket_id ?? '') }
  if (data.is_expansion !== undefined) props['Is Expansion'] = { checkbox: data.is_expansion }
  if (data.bus_factor !== undefined) props['Bus Factor'] = { checkbox: data.bus_factor }
  if (data.author_hints !== undefined) props['Author Hints'] = { rich_text: rt(data.author_hints.join(', ')) }
  return props
}

// ─── Tracker database ─────────────────────────────────────────────────────────

function dbId() {
  const id = process.env.NOTION_TRACKER_DB_ID
  if (!id) throw new Error('NOTION_TRACKER_DB_ID env var not set')
  return id
}

export async function queryContextFiles(filters?: {
  section?: string
  status?: string
  assigned_to?: string
}): Promise<ContextFile[]> {
  const andFilters: NonNullable<QueryDataSourceParameters['filter']>[] = []

  if (filters?.section) {
    andFilters.push({ property: 'Section', select: { equals: filters.section } })
  }
  if (filters?.status) {
    andFilters.push({ property: 'Status', select: { equals: filters.status } })
  }
  if (filters?.assigned_to) {
    andFilters.push({ property: 'Assigned To', rich_text: { equals: filters.assigned_to } })
  }

  const filter =
    andFilters.length === 0
      ? undefined
      : andFilters.length === 1
      ? andFilters[0]
      : { and: andFilters }

  const results: PageObjectResponse[] = []
  let cursor: string | undefined

  do {
    const resp = await notion.dataSources.query({
      data_source_id: dbId(),
      filter: filter as QueryDataSourceParameters['filter'],
      sorts: [
        { property: 'Priority', direction: 'ascending' },
        { property: 'Name', direction: 'ascending' },
      ],
      start_cursor: cursor,
      page_size: 100,
    })
    for (const r of resp.results) {
      if ('properties' in r) results.push(r as PageObjectResponse)
    }
    cursor = resp.has_more ? (resp.next_cursor ?? undefined) : undefined
  } while (cursor)

  return results.map(pageToContextFile)
}

export async function getContextFile(pageId: string): Promise<ContextFile | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: pageId })
    return pageToContextFile(page as PageObjectResponse)
  } catch {
    return null
  }
}

export async function createContextFile(
  data: Omit<ContextFile, 'id' | 'created_at' | 'updated_at'>
): Promise<ContextFile> {
  const page = await notion.pages.create({
    parent: { type: 'data_source_id', data_source_id: dbId() },
    properties: toProperties(data) as Parameters<typeof notion.pages.create>[0]['properties'],
  })
  return pageToContextFile(page as PageObjectResponse)
}

export async function updateContextFile(
  pageId: string,
  updates: Partial<ContextFile>
): Promise<ContextFile> {
  const page = await notion.pages.update({
    page_id: pageId,
    properties: toProperties(updates) as Parameters<typeof notion.pages.update>[0]['properties'],
  })
  return pageToContextFile(page as PageObjectResponse)
}

// ─── Approvers ────────────────────────────────────────────────────────────────

// APPROVER_EMAILS env var: comma-separated, optional :section suffix
// e.g. "josh@superscript.nyc,minyoung@superscript.nyc:design"
export function isApprover(email: string, section?: string): boolean {
  const raw = process.env.APPROVER_EMAILS ?? 'josh@superscript.nyc'
  return raw.split(',').some((entry) => {
    const [approverEmail, approverSection] = entry.trim().split(':')
    if (approverEmail !== email) return false
    return !approverSection || !section || approverSection === section
  })
}

// ─── Page content (v5: retrieveMarkdown / updateMarkdown) ─────────────────────

export async function getPageMarkdown(pageId: string): Promise<string> {
  const resp = await notion.pages.retrieveMarkdown({ page_id: pageId })
  return resp.markdown
}

export async function updatePageContent(pageId: string, markdown: string): Promise<void> {
  await notion.pages.updateMarkdown({
    page_id: pageId,
    type: 'replace_content',
    replace_content: { new_str: markdown, allow_deleting_content: true },
  })
}

// ─── Personal.md (staff file in People/) ─────────────────────────────────────

export async function findStaffPage(email: string): Promise<string | null> {
  const firstName = email.split('@')[0].split('.')[0].toLowerCase()
  const resp = await notion.search({
    query: firstName,
    filter: { property: 'object', value: 'page' },
    page_size: 20,
  })
  for (const result of resp.results) {
    if (result.object !== 'page') continue
    const page = result as PageObjectResponse
    const titleProp = Object.values(page.properties).find((p) => p.type === 'title')
    const title =
      titleProp?.type === 'title'
        ? titleProp.title.map((t) => t.plain_text).join('').toLowerCase()
        : ''
    if (title.startsWith(firstName)) return page.id
  }
  return null
}

export async function getPersonalMd(
  email: string
): Promise<{ pageId: string; content: string } | null> {
  const pageId = await findStaffPage(email)
  if (!pageId) return null
  const content = await getPageMarkdown(pageId)
  return { pageId, content }
}

export async function updatePersonalMd(pageId: string, markdown: string): Promise<void> {
  await updatePageContent(pageId, markdown)
}
