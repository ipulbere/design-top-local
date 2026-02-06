const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, body: 'ok', headers };

    try {
        if (!event.body) return { statusCode: 400, body: JSON.stringify({ error: 'Missing body' }), headers };
        const { category } = JSON.parse(event.body);

        if (!category) return { statusCode: 400, body: JSON.stringify({ error: 'Category required' }), headers };

        console.log(`[Template Gen] Strict DB Fetch for: ${category}`);

        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );

        // Fetch ALL templates for this category (to pick one randomly)
        const { data, error } = await supabase
            .from('category_templates')
            .select('html')
            .eq('category', category);

        if (error) {
            console.error('[Template Gen] DB Error:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            console.warn(`[Template Gen] No templates found for ${category}`);
            return {
                statusCode: 404,
                body: JSON.stringify({ error: `No existing templates found for category: ${category}` }),
                headers
            };
        }

        // Pick Random
        const randomIndex = Math.floor(Math.random() * data.length);
        const selectedTemplate = data[randomIndex];

        console.log(`[Template Gen] Found ${data.length} templates. Selected index ${randomIndex}.`);

        return {
            statusCode: 200,
            body: JSON.stringify({ html: selectedTemplate.html, source: 'database' }),
            headers
        };

    } catch (e) {
        console.error('[Template Gen] Critical Error:', e);
        return { statusCode: 500, body: JSON.stringify({ error: e.message }), headers };
    }
};
