/**
 * Seeds the Notion tracker database from context-repo-plan.md sections 3 and 4.
 * Prerequisites:
 *   1. Run setup-notion-db.ts first to create the database
 *   2. Set NOTION_TOKEN and NOTION_TRACKER_DB_ID in .env.local
 * Usage: npx tsx scripts/seed-plan.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { Client } from '@notionhq/client'

const NOTION_TOKEN = process.env.NOTION_TOKEN!
const DB_ID = process.env.NOTION_TRACKER_DB_ID!
const PLAN_PATH = path.join(__dirname, '../../../context-builder/output/context-repo-plan.md')

if (!NOTION_TOKEN || !DB_ID) {
  console.error('Set NOTION_TOKEN and NOTION_TRACKER_DB_ID in your environment')
  process.exit(1)
}

const notion = new Client({ auth: NOTION_TOKEN })

function parsePriority(s: string): string {
  const l = s.toLowerCase()
  if (l.includes('high')) return 'high'
  if (l.includes('low')) return 'low'
  return 'medium'
}

function extractTableRows(md: string, sectionTitle: string): string[][] {
  const sectionRe = new RegExp(`## ${sectionTitle}[\\s\\S]*?(?=## |$)`)
  const sectionMatch = md.match(sectionRe)
  if (!sectionMatch) return []

  const rows: string[][] = []
  const lines = sectionMatch[0].split('\n')
  let inTable = false
  for (const line of lines) {
    if (line.startsWith('|') && !line.match(/^[\| :-]+$/)) {
      if (!inTable && line.includes('Path')) { inTable = true; continue } // skip header
      if (inTable) {
        rows.push(line.split('|').slice(1, -1).map((c) => c.trim()))
      }
    } else if (!line.startsWith('|')) {
      inTable = false
    }
  }
  return rows
}

function rt(text: string) {
  return [{ text: { content: text } }]
}

async function createRow(path: string, title: string, section: string, priority: string, authorHints: string[], busFactor: boolean, isExpansion: boolean) {
  await notion.pages.create({
    parent: { database_id: DB_ID },
    properties: {
      Name:            { title: rt(title) },
      Path:            { rich_text: rt(path) },
      Section:         { select: { name: section } },
      Status:          { select: { name: 'requested' } },
      Priority:        { select: { name: priority } },
      'Author Hints':  { rich_text: rt(authorHints.join(', ')) },
      'Bus Factor':    { checkbox: busFactor },
      'Is Expansion':  { checkbox: isExpansion },
    } as Parameters<typeof notion.pages.create>[0]['properties'],
  })
}

async function main() {
  const md = fs.readFileSync(PLAN_PATH, 'utf8')

  // Section 3: New Documents
  const newRows = extractTableRows(md, '3. New Documents')
  console.log(`Found ${newRows.length} new documents`)

  for (const row of newRows) {
    const [filePath, , authors, , priority, busFactor] = row
    if (!filePath || filePath.startsWith('-') || !filePath.includes('/')) continue
    const clean = filePath.replace(/`/g, '').trim()
    const parts = clean.split('/')
    const section = parts[1] ?? 'company'
    const rawTitle = parts[parts.length - 1].replace('.md', '').replace(/-/g, ' ')
    const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1)
    const authorHints = (authors ?? '').split(',').map((a) => a.trim()).filter(Boolean)

    try {
      await createRow(clean, title, section, parsePriority(priority ?? 'medium'), authorHints, (busFactor ?? '').toLowerCase().includes('y'), false)
      console.log(`✓ ${clean}`)
    } catch (e: unknown) {
      console.error(`✗ ${clean}:`, (e as Error).message)
    }
  }

  // Section 4: Expansion Recommendations
  const expansionRows = extractTableRows(md, '4. Expansion Recommendations')
  console.log(`\nFound ${expansionRows.length} expansion rows`)

  for (const row of expansionRows) {
    const [filePath, , authors] = row
    if (!filePath || filePath.startsWith('-') || !filePath.includes('/')) continue
    const clean = filePath.replace(/`/g, '').trim()
    const parts = clean.split('/')
    const section = parts[1] ?? 'company'
    const rawTitle = parts[parts.length - 1].replace('.md', '').replace(/-/g, ' ')
    const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1)
    const authorHints = (authors ?? '').split(',').map((a) => a.trim()).filter(Boolean)

    try {
      await createRow(clean, title, section, 'medium', authorHints, false, true)
      console.log(`✓ (expansion) ${clean}`)
    } catch (e: unknown) {
      console.error(`✗ ${clean}:`, (e as Error).message)
    }
  }

  console.log('\nSeed complete.')
}

main().catch(console.error)
