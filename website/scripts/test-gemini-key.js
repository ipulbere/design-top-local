
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("❌ Error: GEMINI_API_KEY is missing in .env file");
    process.exit(1);
}

console.log(`Checking API Key: ${API_KEY.substring(0, 8)}...`);

const genAI = new GoogleGenerativeAI(API_KEY);
const modelName = "models/gemini-3-flash-preview"; // Verify the intended production model

async function testGemini() {
    try {
        console.log(`Connecting to model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = "Say 'Hello, Gemini is working!' if you can read this.";
        console.log(`Sending prompt: "${prompt}"`);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("\n✅ Success! Response from Gemini:");
        console.log("--------------------------------------------------");
        console.log(text);
        console.log("--------------------------------------------------");

    } catch (error) {
        console.error("\n❌ Gemini API Test Failed:");
        console.error(`Error Message: ${error.message}`);
        console.error(`Full Error: ${JSON.stringify(error, null, 2)}`); // Log full object if possible
    }
}

testGemini();
