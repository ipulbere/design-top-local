const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Clients
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

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
    // Current workaround: Image Generation via standard SDK isn't fully supported for 'gemini-2.0-flash'.
    // We are temporarily disabling this function to prevent build/runtime errors.

    try {
        console.log(`[Asset Gen] Calling Gemini: gemini-2.0-flash (simulated) [${aspectRatio}]`);

        // Priority: API_KEY > GEMINI_API_KEY
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API_KEY Missing");

        // Simulating failure for migration
        throw new Error("Image Generation temporarily disabled during migration to @google/generative-ai. Please use Template Generation.");

    } catch (e) {
        console.error("Gemini Generation Error:", e);
        throw e;
    }
}

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

        const { category, prompt, mode } = body;

        console.log(`[Asset Gen] Request: Mode=${mode}, Category=${category}`);

        // Placeholder response while we fix Image Gen SDK
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Image Generation is being migrated. Please verify Template Generation first.",
                hero: "https://placehold.co/800x600?text=Migration+In+Progress",
                team: "https://placehold.co/800x600?text=Migration+In+Progress"
            }),
            headers
        };

    } catch (err) {
        console.error("[Asset Gen] Critical:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }), headers };
    }
};
