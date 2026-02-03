
import { GoogleGenAI } from "@google/genai";

const API_KEY = "AIzaSyDygR7gU4fMpeUzzmm7OjE-OTg79_j00pU";

async function testKey() {
    console.log("Testing with key:", API_KEY.substring(0, 10) + "...");
    const genAI = new GoogleGenAI({ apiKey: API_KEY });
    try {
        console.log("Client initialized.");
        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
                parts: [{ text: "Test prompt 1:1" }]
            },
            config: {
                imageGenerationConfig: {
                    aspectRatio: "1:1",
                    sampleCount: 1
                }
            }
        });

        console.log("Response received.");
        if (response.candidates && response.candidates.length > 0) {
            console.log("Success! Image data present.");
        } else {
            console.log("Response:", JSON.stringify(response, null, 2));
        }

    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) console.error("Response:", JSON.stringify(e.response, null, 2));
        if (e.body) console.error("Body:", e.body);
    }
}

testKey();
