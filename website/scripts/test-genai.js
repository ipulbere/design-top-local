import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config'; // Load .env file

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ GEMINI_API_KEY is missing from .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const DESIGNER_PROMPT = `
You are an expert Frontend AI capable of generating high-converting, professional Single Page Applications (SPA) using Tailwind CSS via CDN.
Return ONLY the <body> content. No markdown.
`;

async function run() {
    console.log("🚀 Starting Direct Gemini Test...");
    console.log(`🔑 API Key Found: ${apiKey.substring(0, 5)}...`);

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    try {
        const result = await model.generateContent({
            contents: [
                { role: 'user', parts: [{ text: DESIGNER_PROMPT }] },
                { role: 'user', parts: [{ text: `Create a website template for the category: "Roofer".` }] }
            ]
        });

        const text = result.response.text();
        console.log("\n✅ Generation Success!");
        console.log("--- Snippet ---");
        console.log(text.substring(0, 200) + "...");
        console.log("---------------\n");

    } catch (e) {
        console.error("\n❌ Generation Failed:", e);
    }
}

run();
