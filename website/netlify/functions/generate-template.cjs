const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Clients initialized inside handler to catch env errors

// System Instruction for the "Designer"
const DESIGNER_PROMPT = `
You are an expert Frontend AI capable of generating high-converting, professional Single Page Applications (SPA) using Tailwind CSS via CDN.

**Goal**: Create a complete, responsive HTML template for a specific Business Category.

**Technical Constraints**:
1. **Single HTML File**: Return ONLY the <body> content. Do not include <html>, <head>, or <body> tags. I will inject these.
2. **Tailwind CSS**: Use utility classes for ALL styling. Do not write custom CSS.
3. **Responsive**: Mobile-first design.
4. **Sections**: Include these distinct sections with semantic IDs:
   - #hero (High impact, clear CTA)
   - #services (Grid layout)
   - #about (Trust indicators)
   - #testimonials (Social proof)
   - #footer (Contact info)
5. **Color Palette**: Choose a professional palette appropriate for the industry (e.g., Blue/White for Medical, Earth tones for Construction).

**Critical Image Rule**:
You must insert exactly 4 images. DO NOT use real URLs. You must use this PRECISE placeholder syntax so I can generate them later:
\`<img src="[DESC_PHOTO: <detailed description of the photo>]" class="..." alt="..." />\`

- Image 1: Hero Background or Main Image ([DESC_PHOTO: friendly professional <category> expert...])
- Image 2: Service Action Shot
- Image 3: Team/Equipment Shot
- Image 4: Completed Work/Result

**Output Format**:
Return ONLY the raw HTML code for the sections. No markdown, no backticks.
`;

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, body: 'ok', headers };

    try {
        console.log('[Template Gen] VERSION DEBUG 001');
        console.log('[Template Gen] Function Start');
        console.log(
            '[Template Gen] Env Check:',
            'SupabaseURL:', !!process.env.VITE_SUPABASE_URL,
            'SupabaseKey:', !!process.env.VITE_SUPABASE_ANON_KEY,
            'SupabaseKey:', !!process.env.VITE_SUPABASE_ANON_KEY,
            'GeminiKey (GEMINI_API_KEY):', !!process.env.GEMINI_API_KEY,
            'Standard Key (API_KEY):', !!process.env.API_KEY
        );

        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );

        // Prefer API_KEY as per user request (matches image gen), fallback to GEMINI_API_KEY
        const activeKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        const genAI = new GoogleGenerativeAI(activeKey);


        if (!event.body) return { statusCode: 400, body: JSON.stringify({ error: 'Missing body' }), headers };
        const { category, customPrompt } = JSON.parse(event.body);

        if (!category) return { statusCode: 400, body: JSON.stringify({ error: 'Category required' }), headers };

        console.log(`[Template Gen] Request for: ${category}`);

        // 1. Check Cache (Supabase)
        const { data: cached } = await supabase
            .from('category_templates')
            .select('html_content')
            .eq('category', category)
            .single();

        if (cached) {
            console.log(`[Template Gen] Cache Hit for ${category}`);
            return { statusCode: 200, body: JSON.stringify({ html: cached.html_content, source: 'cache' }), headers };
        }

        // 2. Generate with Gemini
        console.log(`[Template Gen] Cache Miss. Generating for ${category}...`);

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Fast & Capable

        // Use custom prompt if provided, otherwise default
        const promptToUse = customPrompt || DESIGNER_PROMPT;

        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        console.log(`[Template Gen] API Key: ${apiKey ? (apiKey.substring(0, 5) + '...') : 'MISSING'}`);

        if (!apiKey) throw new Error("API_KEY (and GEMINI_API_KEY) Missing");

        let textResult = '';

        try {
            const result = await model.generateContent({
                contents: [
                    { role: 'user', parts: [{ text: promptToUse }] },
                    { role: 'user', parts: [{ text: `Create a website template for the category: "${category}".` }] }
                ]
            });
            textResult = result.response.text();
        } catch (genErr) {
            console.error('[Template Gen] Gemini API specific error:', genErr);
            throw genErr;
        }

        // Clean up markdown if Gemini decides to add it despite instructions
        let html = textResult.replace(/```html/g, '').replace(/```/g, '').trim();

        // 3. Save to Supabase
        const { error: saveError } = await supabase
            .from('category_templates')
            .insert([{ category, html_content: html }]);

        if (saveError) {
            console.error('[Template Gen] Save failed:', saveError);
            // proceed anyway to return result
        }

        return { statusCode: 200, body: JSON.stringify({ html, source: 'generated' }), headers };

    } catch (e) {
        console.error('[Template Gen] Error:', e);
        return { statusCode: 500, body: JSON.stringify({ error: e.message }), headers };
    }
};
