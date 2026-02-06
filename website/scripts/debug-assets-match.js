
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugAssets() {
    const category = 'Painters'
    console.log(`\n--- Checking Assets for: ${category} ---\n`)

    // 1. Get Template
    const { data: templates } = await supabase
        .from('category_templates')
        .select('html')
        .eq('category', category)

    if (!templates?.length) return console.error('No template found')
    let html = templates[0].html

    // Clean logic (same as View)
    const docTypeIndex = html.indexOf('<!DOCTYPE html>')
    if (docTypeIndex !== -1) html = html.substring(docTypeIndex)

    console.log('Template HTML length:', html.length)

    // 2. Get Assets
    const { data: assets } = await supabase
        .from('category_assets')
        .select('identifier')
        .eq('category', category)

    if (!assets?.length) return console.error('No assets found')

    console.log(`Found ${assets.length} assets. Checking matches...`)

    let matchCount = 0
    assets.forEach(asset => {
        const index = html.indexOf(asset.identifier)
        if (index !== -1) {
            console.log(`[MATCH] Found '${asset.identifier}' at index ${index}`)
            matchCount++
        } else {
            console.log(`[MISS] '${asset.identifier}' NOT found in HTML`)
        }
    })

    console.log(`\nTotal Matches: ${matchCount} / ${assets.length}`)

    // If no matches, print a snippet of HTML to see what src attributes look like
    if (matchCount === 0) {
        console.log('\n--- HTML Snippet (src attributes) ---')
        // naive regex to find src="..."
        const srcMatches = html.match(/src="([^"]+)"/g) || []
        console.log(srcMatches.slice(0, 10))
    }
}

debugAssets()
