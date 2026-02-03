import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

// Simple .env parser
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const apiKey = env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in .env");
    process.exit(1);
}

console.log(`Checking key: ${apiKey.substring(0, 5)}...`);

const genAI = new GoogleGenAI({ apiKey });

async function test() {
    console.log("----------------------------------------");
    // User mentioned "Imagen 4", but we'll check 3.0 variants which are the likely available ones.
    const candidateModels = [
        'imagen-3.0-generate-001',
        'imagen-3.0-generate-002',
        'imagen-3.0-fast-generate-001',
        'google/imagen-4.0-fast-generate-preview-06-06',
        'imagen-4.0-fast-generate-preview-06-06' // Just in case prefix isn't needed
    ];

    for (const modelName of candidateModels) {
        console.log(`\n🎨 Testing model: '${modelName}'...`);
        try {
            const response = await genAI.models.generateContent({
                model: modelName,
                contents: [
                    {
                        parts: [
                            { text: "A small red ball on a white table" }
                        ]
                    }
                ],
                generationConfig: {
                    responseMimeType: "image/jpeg"
                }
            });

            console.log(`✅ SUCCESS with '${modelName}'!`);
            const part = response.response.candidates?.[0]?.content?.parts?.[0];
            if (part && (part.inlineData || part.text)) {
                console.log("✅ Image Data Received");
                process.exit(0);
            }
        } catch (e) {
            console.error(`❌ Failed with '${modelName}':`, e.message);
        }
    }
    console.error("\n❌ All candidates failed.");
}

test();
