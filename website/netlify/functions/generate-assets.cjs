const { createClient } = require('@supabase/supabase-js');

// Initialize Clients
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, body: 'ok', headers };

    try {
        if (!event.body) return { statusCode: 400, body: JSON.stringify({ error: 'Missing body' }), headers };

        let body;
        try {
            body = JSON.parse(event.body);
        } catch (e) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }), headers };
        }

        const { category } = body;

        console.log(`[Asset Fetch] Request for Category=${category}`);

        if (!category) return { statusCode: 400, body: JSON.stringify({ error: 'Category required' }), headers };

        // Query Supabase for assets
        const { data, error } = await supabase
            .from('category_assets')
            .select('identifier, type, image_data')
            .eq('category', category);

        if (error) {
            console.error('[Asset Fetch] DB Error:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            console.warn(`[Asset Fetch] No assets found for ${category}`);
            // Return empty object or specific error? 
            // Let's return empty, frontend handles fallbacks.
            return {
                statusCode: 200,
                body: JSON.stringify({}),
                headers
            };
        }

        console.log(`[Asset Fetch] Found ${data.length} assets for ${category}`);

        // Map Assets to Frontend Keys
        const assets = {};

        // Asset counters for multiple items of same type
        let serviceCount = 0;
        let galleryCount = 0;

        data.forEach(item => {
            const type = item.type?.toLowerCase() || '';
            const imageData = item.image_data; // Should be base64 data URI

            if (type.includes('hero')) {
                assets.hero = imageData;
            } else if (type.includes('team')) {
                assets.team = imageData;
            } else if (type.includes('finished product')) {
                assets[`service_${serviceCount}`] = imageData;
                serviceCount++;
            } else if (type.includes('before') || type.includes('after')) {
                // For now, map both before/after types to gallery slots
                assets[`gallery_${galleryCount}`] = imageData;
                galleryCount++;
            }
        });

        // Ensure at least one service/gallery if available to avoid undefined on frontend if logic expects specific indices
        // ( Frontend should handle undefined checks )

        return {
            statusCode: 200,
            body: JSON.stringify(assets),
            headers
        };

    } catch (err) {
        console.error("[Asset Fetch] Critical:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }), headers };
    }
};
