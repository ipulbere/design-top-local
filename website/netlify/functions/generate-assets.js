import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from "@google/genai"

// Initialize Clients
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
)

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Image Generation Helper (Adapted from User's Logic)
// Helper to clean prompts for URL
function cleanPrompt(text) {
    return encodeURIComponent(text.replace(/[^a-zA-Z0-9, ]/g, '').substring(0, 300));
}

export default async (req, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (req.method === 'OPTIONS') return new Response('ok', { headers });

    try {
        let category;
        try {
            const body = await req.json();
            category = body.category;
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers });
        }

        if (!category) return new Response(JSON.stringify({ error: 'Category required' }), { status: 400, headers });

        // 1. Check Cache
        const { data: cached } = await supabase
            .from('category_assets')
            .select('assets')
            .eq('category', category)
            .single();

        if (cached?.assets) {
            console.log(`[Asset Gen] Cache Hit: ${category}`);
            return new Response(JSON.stringify(cached.assets), { headers });
        }

        console.log(`[Asset Gen] Generating for: ${category}`);

        // 2. Generate Prompts via Gemini (Text is reliable)
        // We keep this to get specific, creative visual descriptions
        // Fallback defaults in case Gemini fails
        let prompts = {
            hero: `${category} professional workspace modern photorealistic`,
            service: `${category} service action closeup professional`,
            gallery: `${category} project construction result high quality`
        };

        // Try to enhance with Gemini, but don't crash if it fails (e.g. missing key)
        if (process.env.GEMINI_API_KEY) {
            try {
                const promptReq = `
              Write 3 distinct, detailed visual descriptions for AI image generation for a "${category}" website.
              1. Hero: Wide shot, professional, welcoming, high quality.
              2. Service: Close up action shot, detailed, professional.
              3. Gallery: A before/after style or finished project result, clean.
              
              Return ONLY valid JSON:
              { "hero": "...", "service": "...", "gallery": "..." }
            `;

                const promptResult = await genAI.models.generateContent({
                    model: "gemini-1.5-flash",
                    contents: promptReq
                });

                const text = (promptResult.text || promptResult.response?.text() || "{}").replace(/```json/g, '').replace(/```/g, '').trim();
                const json = JSON.parse(text);
                if (json.hero) prompts = json;

            } catch (e) {
                console.warn("[Asset Gen] Prompt enhancement failed (using defaults):", e.message);
            }
        } else {
            console.log("[Asset Gen] No API Key found, using default generic prompts.");
        }

        // 3. Construct Pollinations.ai URLs
        // Pollinations generates images on the fly via URL. 
        // We append a random seed to ensure uniqueness per generation if we wanted, 
        // but here we want consistency for the category, so we don't random seed beyond the prompt.
        // We add 'nologo=true' and 'private=true' to attempt cleaner images.

        const generateUrl = (prompt, width, height) => {
            return `https://image.pollinations.ai/prompt/${cleanPrompt(prompt)}?width=${width}&height=${height}&nologo=true&model=flux`;
        };

        const finalAssets = {
            hero: generateUrl(prompts.hero + ", photorealistic, 4k, website header", 1200, 800),
            service: generateUrl(prompts.service + ", photorealistic, professional", 800, 600),
            gallery: generateUrl(prompts.gallery + ", photorealistic, high detail", 800, 600),
            meta: prompts
        };

        // 4. Save to Supabase (Cache the URLs)
        // Pollinations URLs are permanent-ish (generated on fly), so caching them is fine.
        await supabase.from('category_assets').insert([{ category, assets: finalAssets }]);

        return new Response(JSON.stringify(finalAssets), { headers });

    } catch (err) {
        console.error("[Asset Gen] Critical:", err);
        const cleanError = encodeURIComponent((err.message || 'Unknown').substring(0, 30));
        return new Response(JSON.stringify({
            error: err.message,
            // Fallback to static placeholders if even this fails
            hero: `https://placehold.co/1200x800?text=Err:${cleanError}`,
            service: `https://placehold.co/800x600?text=Err:${cleanError}`,
            gallery: `https://placehold.co/800x600?text=Err:${cleanError}`
        }), { status: 200, headers });
    }
};
