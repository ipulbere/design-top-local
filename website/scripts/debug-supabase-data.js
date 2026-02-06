
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
    const { data: templates, error: tErr } = await supabase
        .from('category_templates')
        .select('category, template_number, html')
        .eq('category', category)

    if (tErr) console.error('Template Error:', tErr)
    else console.log(`Templates found: ${templates?.length}`, templates?.map(t => t.template_number))

    if (templates?.[0]) {
        console.log('Sample HTML start:', templates[0].html.substring(0, 100))
    }

    // 2. Check Assets
    const { data: assets, error: aErr } = await supabase
        .from('category_assets')
        .select('category, identifier, type, image_data')
        .eq('category', category)

    if (aErr) console.error('Asset Error:', aErr)
    else console.log(`Assets found: ${assets?.length}`)

    if (assets?.[0]) {
        console.log('Sample Asset Identifier:', assets[0].identifier)
        console.log('Sample Asset Data (truncated):', assets[0].image_data?.substring(0, 50))
    }
}

debugData()
