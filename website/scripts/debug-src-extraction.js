
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugSrc() {
    const category = 'Painters'
    console.log(`\n--- HTML Src Extraction for: ${category} ---\n`)

    const { data: templates } = await supabase
        .from('category_templates')
        .select('html')
        .eq('category', category)

    if (!templates?.length) return console.error('No template found')
    let html = templates[0].html

    // Clean
    const docTypeIndex = html.indexOf('<!DOCTYPE html>')
    if (docTypeIndex !== -1) html = html.substring(docTypeIndex)

    // Regex to find src attributes
    // Matches src="value" or src='value'
    const srcRegex = /src=["']([^"']+)["']/g
    let match
    const foundSrcs = []

    while ((match = srcRegex.exec(html)) !== null) {
        foundSrcs.push(match[1])
    }

    console.log('Found src attributes:', foundSrcs)
}

debugSrc()
