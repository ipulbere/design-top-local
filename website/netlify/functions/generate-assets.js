import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from "@google/genai"

// Initialize Clients
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
)

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Image Generation Helper (Adapted from User's Logic)
// Image Generation Helper
async function generateImage(prompt) {
    try {
        // Try Gemini 2.0 Flash (Experimental) which supports image generation
        try {
            const response = await genAI.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: { parts: [{ text: `Generate a photorealistic image: ${prompt}` }] },
                config: { responseModalities: ["image"] } // Enforce image output if supported
            });

            // Check for inline data (standard for Gemini Image gen)
            if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.inlineData) {
                return response.candidates[0].content.parts[0].inlineData.data;
            }
        } catch (err2) {
            console.log(`[Asset Gen] Gemini 2.0 Flash failed (${err2.message}), trying User Model...`);

            // Try User's suggested model name 
            const response = await genAI.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: prompt }] },
                config: { imageConfig: { aspectRatio: "4:3" } }
            });

            if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.inlineData) {
                return response.candidates[0].content.parts[0].inlineData.data;
            }
        }
        return null;

    } catch (e) {
        console.warn("[Asset Gen] Image gen failed:", e.message);
        throw e; // Throw to be caught by the outer loop for error display
    }
}

export default async (req, context) => {
    // CORS Headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers });
    }

    try {
        // Parse body safely
        let category;
        try {
            const body = await req.json();
            category = body.category;
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers });
        }

        if (!category) {
            return new Response(JSON.stringify({ error: 'Category required' }), { status: 400, headers });
        }

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Missing GEMINI_API_KEY in Env");
        }

        console.log(`[Asset Gen] Request for category: ${category}`);

        // 1. Check Cache (Supabase)
        const { data: cached, error: fetchError } = await supabase
            .from('category_assets')
            .select('assets')
            .eq('category', category)
            .single();

        if (cached && cached.assets) {
            console.log(`[Asset Gen] Cache Hit for ${category}`);
            return new Response(JSON.stringify(cached.assets), { headers });
        }

        console.log(`[Asset Gen] Cache Miss for ${category}. Generating...`);

        // 2. Generate Prompts using Gemini (Text)
        // Use 'gemini-1.5-flash' which is generally available and fast
        // NOTE: Using @google/genai SDK syntax (genAI.models.generateContent) instead of @google/generative-ai (getGenerativeModel)

        const promptReq = `
      For a professional website for a "${category}", write 3 distinct, detailed image generation prompts.
      1. Hero: A high-impact, wide shot suitable for a website header.
      2. Service: A close-up action shot representing the service.
      3. Gallery: A "Before & After" style or finished project shot.
      
      Return ONLY valid JSON format like:
      {
        "hero_prompt": "...",
        "service_prompt": "...",
        "gallery_prompt": "..."
      }
    `;

        const promptResult = await genAI.models.generateContent({
            model: "gemini-1.5-flash",
            contents: promptReq
        });

        const promptText = (promptResult.text || promptResult.response?.text() || "").replace(/```json/g, '').replace(/```/g, '').trim();
        let prompts;
        try {
            prompts = JSON.parse(promptText);
        } catch (e) {
            console.error("JSON Parse Error on Prompts:", promptText);
            // Fallback prompts
            prompts = {
                hero_prompt: `${category} professional service header`,
                service_prompt: `${category} working action shot`,
                gallery_prompt: `${category} finished project result`
            };
        }

        console.log("[Asset Gen] Prompts generated:", prompts);

        // 3. Generate Images
        const assets = {};

        // Helper to run generation
        const runGen = async (key, prompt) => {
            const b64 = await generateImage(prompt);
            // Prefix for HTML usage
            if (b64) {
                assets[key] = `data:image/jpeg;base64,${b64}`;
            }
        };

        // Sequential generation
        await runGen('hero', prompts.hero_prompt);
        await runGen('service', prompts.service_prompt);
        await runGen('gallery', prompts.gallery_prompt);

        // Fallback URL Logic
        const finalAssets = {
            hero: assets.hero || `https://placehold.co/1200x800/2563eb/ffffff?text=${encodeURIComponent(category + ' Hero')}`,
            service: assets.service || `https://placehold.co/800x600/2563eb/ffffff?text=${encodeURIComponent(category + ' Service')}`,
            gallery: assets.gallery || `https://placehold.co/800x600/2563eb/ffffff?text=${encodeURIComponent(category + ' Gallery')}`,
            meta: prompts
        };

        // Only cache if we actually got at least one AI image (base64)
        // If we only got placeholders, maybe the API key is bad or quota exceeded. 
        // We can still cache it to prevent hammering the API, or choose not to.
        // Let's cache it so the site is fast next time, even if it's placeholders (User can clear DB later).

        const { error: saveError } = await supabase
            .from('category_assets')
            .insert([{ category, assets: finalAssets }]);

        if (saveError) {
            console.error("[Asset Gen] Save Error:", saveError);
        } else {
            console.log("[Asset Gen] Saved to database.");
        }

        return new Response(JSON.stringify(finalAssets), { headers });

    } catch (err) {
        console.error("[Asset Gen] Critical Error:", err);
        // DEBUG: Expose error in the image text
        const cleanError = encodeURIComponent((err.message || 'Unknown').substring(0, 30));

        return new Response(JSON.stringify({
            error: err.message || 'Unknown Error',
            hero: `https://placehold.co/1200x800/e0e0e0/333333?text=Err:${cleanError}`,
            service: `https://placehold.co/800x600/e0e0e0/333333?text=Err:${cleanError}`,
            gallery: `https://placehold.co/800x600/e0e0e0/333333?text=Err:${cleanError}`
        }), { status: 200, headers });
    }
};
