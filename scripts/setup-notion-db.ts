/**
 * Creates the context-file tracker database (data source) inside the Notion "Drafts" page.
 * Run once: npx tsx scripts/setup-notion-db.ts
 *
 * On success, prints the database ID — copy it into NOTION_TRACKER_DB_ID in .env.local.
 */

import { Client } from '@notionhq/client'

const NOTION_TOKEN = process.env.NOTION_TOKEN
if (!NOTION_TOKEN) { console.error('Set NOTION_TOKEN env var'); process.exit(1) }
const DRAFTS_PAGE_ID = '37c76413-2439-8070-8104-c9e54b5bb2b1'

const notion = new Client({ auth: NOTION_TOKEN })

async function main() {
  console.log('Creating context tracker database inside Drafts page…')

  const db = await notion.dataSources.create({
    parent: { database_id: DRAFTS_PAGE_ID },
    title: [{ text: { content: 'Context File Tracker' } }],
    properties: {
      Name:            { title: {} },
      Path:            { rich_text: {} },
      Section:         {
        select: {
          options: [
            { name: 'pricing',      color: 'blue' },
            { name: 'technology',   color: 'purple' },
            { name: 'customers',    color: 'green' },
            { name: 'products',     color: 'yellow' },
            { name: 'healthcare',   color: 'red' },
            { name: 'go-to-market', color: 'orange' },
            { name: 'design',       color: 'pink' },
            { name: 'company',      color: 'gray' },
          ],
        },
      },
      Status: {
        select: {
          options: [
            { name: 'requested',       color: 'gray' },
            { name: 'in_progress',     color: 'blue' },
            { name: 'draft_submitted', color: 'yellow' },
            { name: 'approved',        color: 'green' },
            { name: 'published',       color: 'default' },
          ],
        },
      },
      Priority: {
        select: {
          options: [
            { name: 'high',   color: 'red' },
            { name: 'medium', color: 'orange' },
            { name: 'low',    color: 'gray' },
          ],
        },
      },
      'Assigned To':   { rich_text: {} },
      'Submitted By':  { rich_text: {} },
      'Submitted At':  { date: {} },
      'Reviewed By':   { rich_text: {} },
      'Reviewed At':   { date: {} },
      'Review Note':   { rich_text: {} },
      'Linear Ticket': { rich_text: {} },
      'Is Expansion':  { checkbox: {} },
      'Bus Factor':    { checkbox: {} },
      'Author Hints':  { rich_text: {} },
    },
  })

  console.log('\n✓ Database created!')
  console.log('\nAdd this to your .env.local:')
  console.log(`NOTION_TRACKER_DB_ID=${db.id}`)
  console.log(`\nDirect link: https://notion.so/${db.id.replace(/-/g, '')}`)
}

main().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
