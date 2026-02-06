
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
    console.error('Missing Supabase credentials in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchTemplate() {
    console.log("Executing SQL Query equivalent to:")
    console.log("SELECT html FROM category_templates WHERE category = 'Painters';")
    console.log("---------------------------------------------------")

    const { data, error } = await supabase
        .from('category_templates')
        .select('html')
        .eq('category', 'Painters')

    if (error) {
        console.error('Error:', error)
    } else {
        if (data.length > 0) {
            console.log("Result (First 500 chars):")
            console.log(data[0].html.substring(0, 500) + "...")
            console.log("\nTotal Length:", data[0].html.length)
        } else {
            console.log("No results found for category 'Painters'")
        }
    }
}

fetchTemplate()
