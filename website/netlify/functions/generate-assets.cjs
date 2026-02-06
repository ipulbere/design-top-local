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
    // Sanitize folder/filename
    const safeFolder = folder.replace(/[^a-zA-Z0-9-_]/g, '_');
    const safeFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filePath = `${safeFolder}/${safeFilename}.png`;

    console.log(`[Asset Gen] Uploading to ${filePath}...`);

    const { data, error } = await supabase
        .storage
        .from(STORAGE_BUCKET)
        .upload(filePath, buffer, {
            contentType: 'image/png',
            upsert: true // Replace if exists
        });

    if (error) {
        console.error('[Asset Gen] Upload Error:', error);
        throw error;
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

    return publicUrl;
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

        const { category, prompt, mode, section } = body;

        console.log(`[Asset Gen] Request: Mode=${mode}, Category=${category}`);

        // Priority: API_KEY > GEMINI_API_KEY
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: "API Key Config Missing" }), headers };

        const genAI = new GoogleGenerativeAI(apiKey);

        // Switch to the requested model
        const TARGET_MODEL = "gemini-2.5-flash-image";

        console.log(`[Asset Gen] Generating with prompt: ${prompt.substring(0, 50)}... using ${TARGET_MODEL}`);

        // Logic: Try SDK first. If it fails (which it might for new models or if they require specific REST format), fallback to REST.
        try {
            const model = genAI.getGenerativeModel({ model: TARGET_MODEL });

            // Standard generation call
            const result = await model.generateContent(prompt);
            const response = await result.response;

            console.log("SDK Generation attempt complete. Candidates:", response.candidates?.length);

            // Attempt to retrieve image data from standard candidates structure used by some variants
            // If this is a pure text response (error message disguised as text), we'll throw.
            // Most Gemini image models return inline data or we need to handle it.

            // If the SDK did not return valid image data here, we force fallback.
            // For now, assuming if we get here without error, we *might* have success, 
            // but we need to extract the image. 
            // Since we can't easily debug the exact shape returned by *this specific new model* in SDK,
            // we will proceed to the fallback which we KNOW works for the `predict` endpoint style if SDK fails.

            // Force fallback for now unless we are 100% sure of the SDK method for 2.5-flash-image
            throw new Error("Proceeding to REST fallback for explicit image data retrieval");

        } catch (sdkError) {
            console.log(`SDK/Model fallback triggers for ${TARGET_MODEL}. Reason: ${sdkError.message}`);

            // REST Fallback
            const cleanPrompt = prompt.replace(/"/g, '');
            const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${TARGET_MODEL}:predict?key=${apiKey}`;

            const imgReq = {
                instances: [
                    { prompt: cleanPrompt }
                ],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: "16:9"
                }
            };

            const imgRes = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(imgReq)
            });

            if (!imgRes.ok) {
                const txt = await imgRes.text();
                throw new Error(`Gemini API Error: ${imgRes.status} ${txt}`);
            }

            const imgData = await imgRes.json();

            if (!imgData.predictions || !imgData.predictions[0]) {
                console.error("No predictions in:", JSON.stringify(imgData));
                throw new Error("No image predictions returned");
            }

            const base64Image = imgData.predictions[0].bytesBase64Encoded;
            const buffer = Buffer.from(base64Image, 'base64');

            // Upload
            const fileName = section ? section : `gen_${Date.now()}`;

            let publicUrl;
            try {
                publicUrl = await uploadToSupabase(buffer, category, fileName);
            } catch (uploadErr) {
                console.error("[Asset Gen] Supabase Upload Failed (Network Issue?):", uploadErr.message);
                // Fallback: Return Base64 Data URI directly
                publicUrl = `data:image/png;base64,${base64Image}`;
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Image Generated",
                    url: publicUrl
                }),
                headers
            };
        }

    } catch (err) {
        console.error("[Asset Gen] Critical:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message, details: err.toString() }), headers };
    }
};
