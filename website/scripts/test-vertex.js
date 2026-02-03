import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

// Parse .env
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const API_KEY = env.GEMINI_API_KEY;
const PROJECT_ID = "gen-lang-client-0423877717"; // From your URL
const LOCATION = "us-central1";
const MODEL_ID = "imagen-4.0-fast-generate-preview-06-06";

const URL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predict?key=${API_KEY}`;

async function test() {
    console.log(`Target: ${URL.split('?')[0]}`);
    console.log("Sending request...");

    const body = {
        instances: [
            {
                prompt: "A futuristic city skyline with flying cars, photorealistic, 8k"
            }
        ],
        parameters: {
            sampleCount: 1,
            // aspectRatio: "1:1", // Optional
            // storageUri: "gs://..." // We want response in base64 usually
        }
    };

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        const data = await response.json();
        console.log("✅ Response received!");

        // Check for predictions
        // Vertex Imagen usually returns: { predictions: [ { bytesBase64Encoded: "..." } ] }
        if (data.predictions && data.predictions[0]) {
            const pred = data.predictions[0];
            if (pred.bytesBase64Encoded || pred.mimeType) {
                console.log(`✅ Image data present (Length: ${pred.bytesBase64Encoded?.length} chars)`);
            } else {
                console.log("⚠️ Prediction received but format unknown:", JSON.stringify(pred).substring(0, 200));
            }
        } else {
            console.log("⚠️ No predictions found:", JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.error("❌ FAILED:", e.message);
    }
}

test();
