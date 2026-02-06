
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.log('MISSING CREDENTIALS')
    process.exit(1)
}

console.log(`Connecting to ${supabaseUrl}...`)
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    const start = Date.now()
    const { data, error } = await supabase
        .from('category_templates')
        .select('count', { count: 'exact', head: true })

    const dur = Date.now() - start
    if (error) {
        console.error(' CONNECTION FAILED:', error.message)
        if (error.cause) console.error(' Cause:', error.cause)
    } else {
        console.log(` SUCCESS! Connected in ${dur}ms.`)
    }
}

check()
