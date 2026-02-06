
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugData() {
    const category = 'Painters'
    console.log(`\n--- Debugging Data for Category: ${category} ---\n`)

    // 1. Check Templates
    // Get ALL templates for category to see if we are hitting the one with text
    const { data: templates, error: tErr } = await supabase
        .from('category_templates')
        .select('category, template_number, html')
        .eq('category', category)

    if (tErr) console.error('Template Error:', tErr)
    else {
        console.log(`Templates found: ${templates?.length}`)
        templates?.forEach((t, i) => {
            console.log(`\n[Template ${i}] ID: ${t.template_number}`)
            console.log('Starts with:', t.html.substring(0, 100))
            console.log('-----------------------------------')
        })
    }
}

debugData()
