import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from "@google/genai"

// Initialize Clients
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
)

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Constants
const STORAGE_BUCKET = 'generated-images';

// Helper: Upload Buffer to Supabase
async function uploadToSupabase(buffer, folder, filename) {
    const filePath = `${folder}/${filename}`;

    const { data, error } = await supabase
        .storage
        .from(STORAGE_BUCKET)
        .upload(filePath, buffer, {
            contentType: 'image/png',
            upsert: true
        });

    if (error) throw error;

    // Get Public URL
    const { data: { publicUrl } } = supabase
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

    return publicUrl;
}

// Helper: Generate Image with Gemini 2.5 Flash (AI Studio SDK)
async function generateImage(prompt, aspectRatio = "1:1") {
    // Gemini 2.5 Flash Image Model
    const MODEL_ID = "gemini-2.5-flash-image";

    try {
        console.log(`[Asset Gen] Calling Gemini (AI Studio): ${MODEL_ID} [${aspectRatio}]`);

        // Initialize AI Client with API_KEY (AI Studio)
        // Note: Global genAI instance might be using GEMINI_API_KEY. 
        // We ensure we use the client configured with API_KEY if needed, 
        // but user said "Use process.env.API_KEY".
        // Let's create a local client or ensure global uses correct key.
        // The global `genAI` at top of file uses `process.env.GEMINI_API_KEY`.
        // Let's create a specific client for this function or update global if possible.
        // User requested: const getAiClient = () => { return new GoogleGenAI({ apiKey: process.env.API_KEY }); };

        const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // Call Gemini API
        const response = await aiClient.models.generateContent({
            model: MODEL_ID,
            contents: {
                parts: [
                    { text: `A professional website stock photo: ${prompt}` }
                ]
            },
            config: {
                // For Gemini 2.5 Flash Image via AI Studio SDK
                imageGenerationConfig: {
                    aspectRatio: aspectRatio,
                    sampleCount: 1
                }
            }
        });

        // Extract Base64 from candidates
        // SDK Response structure
        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return Buffer.from(part.inlineData.data, 'base64');
                }
            }
        }

        throw new Error("No image data found in Gemini response: " + JSON.stringify(response));

    } catch (e) {
        console.error("Gemini Generation Error:", e);
        const msg = e.response ? JSON.stringify(e.response) : e.message;
        throw new Error(msg);
    }
}

// Helper: Fallback to LoremFlickr - REMOVED
// function getFallbackImage(prompt, width = 1200, height = 800) { ... }

export default async (req, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (req.method === 'OPTIONS') return new Response('ok', { headers });

    try {
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
        }

        const { category, prompt, mode } = body;

        console.log(`[Asset Gen] Request: Mode=${mode}, Category=${category}`);

        // MODE 1: Single Image Generation (for Generator Tool)
        if (mode === 'single') {
            if (!prompt) return new Response(JSON.stringify({ error: 'Prompt required' }), { status: 400, headers });

            let buffer;
            try {
                // Generates Buffer (or throws)
                buffer = await generateImage(prompt);
            } catch (err) {
                // Generation failed - return strict error
                return new Response(JSON.stringify({
                    error: "Generation Failed: " + err.message
                }), { status: 500, headers });
            }

            try {
                const timestamp = Date.now();
                const filename = `gen-${timestamp}.png`;
                const publicUrl = await uploadToSupabase(buffer, 'manual', filename);
                return new Response(JSON.stringify({ url: publicUrl, prompt }), { headers });

            } catch (uploadErr) {
                console.warn("[Asset Gen] Upload failed, returning Base64 fallback:", uploadErr.message);

                // Fallback: Return Base64 directly
                const base64 = buffer.toString('base64');
                const dataUrl = `data:image/png;base64,${base64}`;

                return new Response(JSON.stringify({
                    url: dataUrl,
                    prompt: prompt,
                    note: "Storage failed, returning direct image"
                }), { headers });
            }
        }

        // MODE 2: Category Assets (for Website Builder)
        if (!category) return new Response(JSON.stringify({ error: 'Category required' }), { status: 400, headers });

        // Check Cache first
        const { data: cached } = await supabase
            .from('category_assets')
            .select('assets')
            .eq('category', category)
            .single();

        if (cached?.assets && !cached.assets.hero.includes('placehold.co')) {
            console.log(`[Asset Gen] Cache Hit: ${category}`);
            return new Response(JSON.stringify(cached.assets), { headers });
        }

        // Generate Assets (Parallel)
        // We define the needed assets
        // Generate Assets (Parallel)
        const assetsToGen = {
            hero: `A professional website stock photo: A friendly professional ${category} professional in a clean blue uniform smiling while holding ${category} tool, standing in a bright modern ${category} workplace, focusing on trust and reliability, 16:9 wide aspect ratio`,
            team: `${category} team group photo, professional, smiling, office environment, 16:9 wide aspect ratio`,

            // Generate diversity for service/gallery slots (assuming 3 for now)
            service_0: `${category} service action closeup, professional details, style A`,
            service_1: `${category} service action, different angle, style B`,
            service_2: `${category} service equipment or interaction, style C`,

            gallery_0: `${category} project result, high quality photo, finished work, example A`,
            gallery_1: `${category} project transformation, stunning result, example B`,
            gallery_2: `${category} project details, professional quality, example C`
        };

        const resultAssets = {};

        // Run generations
        // Warning: Parallel limit might be needed for rate limits. 
        // For now, sequencial or Promise.all.
        // Let's do Promise.all but handle failures.

        // Run generations (Batched 2 at a time to balance Speed vs Rate Limits)
        // 1 at a time = Too slow (Timeouts)
        // 4 at a time = Rate Limit (429)
        // 2 at a time = Sweet spot (~15s total)

        const allKeys = Object.entries(assetsToGen);
        const chunkSize = 2;
        const delay = ms => new Promise(res => setTimeout(res, ms));

        for (let i = 0; i < allKeys.length; i += chunkSize) {
            const chunk = allKeys.slice(i, i + chunkSize);

            await Promise.all(chunk.map(async ([key, promptText]) => {
                let buffer;
                try {
                    // Try Vertex
                    // USE 16:9 FOR HERO AND TEAM
                    const ratio = (key === 'hero' || key === 'team') ? '16:9' : '1:1';
                    buffer = await generateImage(promptText, ratio);
                } catch (err) {
                    console.warn(`[Asset Gen] Vertex failed for ${key}:`, err.message);
                    // Show error in placeholder
                    const cleanErr = err.message.replace(/[^a-zA-Z0-9 \(\)\:]/g, '').substring(0, 30);
                    resultAssets[key] = `https://placehold.co/800x600?text=Error:+${encodeURIComponent(cleanErr)}`;
                    return; // Skip upload
                }

                try {
                    const filename = `${category}-${key}-${Date.now()}.png`;
                    const url = await uploadToSupabase(buffer, category, filename);
                    resultAssets[key] = url;
                } catch (uploadErr) {
                    console.warn(`[Asset Gen] Upload failed for ${key}, using Base64:`, uploadErr.message);
                    const base64 = buffer.toString('base64');
                    resultAssets[key] = `data:image/png;base64,${base64}`;
                }
            }));

            // Small delay between chunks to be safe
            if (i + chunkSize < allKeys.length) await delay(500);
        }

        // Save to DB
        await supabase.from('category_assets').delete().eq('category', category); // Clean old
        await supabase.from('category_assets').upsert([{ category, assets: resultAssets }]);

        return new Response(JSON.stringify(resultAssets), { headers });

    } catch (err) {
        console.error("[Asset Gen] Critical:", err);
        return new Response(JSON.stringify({
            error: err.message
        }), { status: 500, headers });
    }
};
