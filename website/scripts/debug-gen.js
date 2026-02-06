import 'dotenv/config';
import fs from 'fs';

async function listModels() {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    console.log("Key available:", !!apiKey);

    if (!apiKey) {
        console.error("No API KEY");
        return;
    }

    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    console.log("Listing models...");

    try {
        const res = await fetch(apiEndpoint);

        if (!res.ok) {
            const txt = await res.text();
            console.error("API Failed:", res.status, txt);
        } else {
            const data = await res.json();
            fs.writeFileSync('models.json', JSON.stringify(data, null, 2));
            console.log("Wrote models to models.json");
        }
    } catch (e) {
        console.error("Fetch Exception:", e);
    }
}

listModels();
