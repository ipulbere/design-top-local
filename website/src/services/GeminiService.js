
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEN_AI = new GoogleGenerativeAI(API_KEY);

// Use the preview model as requested
const MODEL_NAME = "models/gemini-3-flash-preview";
const VERIFY_MODEL_NAME = "models/gemini-3-flash-preview";

export const GeminiService = {

    /**
     * Generates a complete single-page website based on category data.
     * @param {Object} categoryData - The full category object from JSON.
     * @param {Object} formData - User input (Company Name, etc.)
     * @returns {Promise<string>} - The generated HTML string.
     */
    async generateWebsiteHtml(categoryData, formData) {
        if (!API_KEY) throw new Error("Missing Gemini API Key");

        const model = GEN_AI.getGenerativeModel({ model: MODEL_NAME });

        const {
            Category,
            "Website Style": style,
            "Background Colors": bgColors,
            "Accent Colors": accentColors,
            "List of Services": services,
            "Before and After Pictures": beforeAfterRaw,
            content
        } = categoryData;

        // Determine image requirements
        const hasBeforeAfter = beforeAfterRaw && beforeAfterRaw.includes("Yes");

        let imageInstructions = `
        You must strictly use the following placeholder format for images: <img src="[DESC_PHOTO: Type]" alt="Type">
        - For the Hero section: <img src="[DESC_PHOTO: Hero]" alt="Hero Image" ...>
        - For the Team/About section: <img src="[DESC_PHOTO: Team]" alt="Team Image" ...>
        `;

        if (hasBeforeAfter) {
            imageInstructions += `
            - For the 'Before and After' or 'Work' section: You MUST include exactly 2 images.
              1. <img src="[DESC_PHOTO: BeforeAndAfter]" alt="Before" ...>
              2. <img src="[DESC_PHOTO: BeforeAndAfter]" alt="After" ...>
            `;
        } else {
            imageInstructions += `
            - For the Testimonial or Happy Client section: <img src="[DESC_PHOTO: HappyCustomer]" alt="Happy Client" ...>
            `;
        } // User rule: ONE happy customer picture if not Before/After

        const currentYear = new Date().getFullYear();
        const city = formData.address ? formData.address.split(',')[1] || 'Your Area' : 'Your Area';

        const prompt = `
        You are an elite Web Designer and Lead Architect.
        Your task is to generate a **PREMIUM**, **MODERN**, and **Pixel-Perfect** single-page website.
        
        **CRITICAL REQUIREMENT 1: STYLING**
        - You MUST use **Tailwind CSS**.
        - You MUST include the Tailwind CDN link in the <head>: <script src="https://cdn.tailwindcss.com"></script>
        - Do NOT use internal <style> blocks or inline CSS. Use Tailwind classes for EVERYTHING.
        - Design should be "High-End", using correct spacing (p-*, m-*), shadows (shadow-lg), rounded corners (rounded-xl), and gradients.
        
        **CRITICAL REQUIREMENT 2: IMAGES**
        - You must strictly use the following placeholder format for images.
        - Do NOT invent your own placeholders like "Windows Equipment".
        - Do NOT use random Unsplash URLs.
        - ONLY use these exact tags where appropriate:
        ${imageInstructions}

        **CRITICAL REQUIREMENT 3: FUNCTIONALITY & ACCURACY**
        - **Copyright**: You MUST use the current year: "© ${currentYear} ${formData.companyName}".
        - **Contact Form**: You MUST include a functional contact form using FormSubmit.
          - Action: "https://formsubmit.co/${formData.email || 'yourname@email.com'}"
          - Method: "POST"
          - Inputs: Name, Email, Phone, Message.
          - Button: "Send Message" type="submit".
        - **Location**: You MUST mention "${city}" and surrounding areas in the Hero, Services, and Footer text to improve local SEO perception.
        - **Links**: Ensure Navigation links (Services, About, Contact) work by adding id="services", id="about", id="contact" to the respective sections.

        **Business Details:**
        - Name: "${formData.companyName || 'Business Name'}"
        - Category: "${Category}"
        - Style: "${style}"
        - Primary Colors: "${bgColors}"
        - Accent Colors: "${accentColors}"
        - Services: "${services}"
        - Description: "${formData.description || 'We provide professional services.'}"
        
        **Structure:**
        1. **Header**: Sticky nav with Logo and Book/Call CTA. Internal links to #services, #about, #contact.
        2. **Hero Section**: Full width, impactful headline (mentioning ${city}), subheadline, CTA, and the **[DESC_PHOTO: Hero]** image.
        3. **Features/Services** (id="services"): Grid layout with icons (SVG) + titles + descriptions.
        4. **About/Team** (id="about"): Text about serving ${city}, **[DESC_PHOTO: Team]** image.
        5. **Start/Result Section**: 
           ${hasBeforeAfter ? 'Showcase "Our Work" with **[DESC_PHOTO: BeforeAndAfter]** images.' : 'Showcase "Happy Clients" with **[DESC_PHOTO: HappyCustomer]** image.'}
        6. **Contact Section** (id="contact"): The FormSubmit form and business info.
        7. **Footer**: Logo, internal links, "© ${currentYear} ${formData.companyName} - Serving ${city}".
        
        **Output Format:**
        - Return ONLY the raw valid HTML5 code.
        - Start with <!DOCTYPE html>.
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let html = response.text();

            // Extract HTML if wrapped in markdown
            const match = html.match(/```html([\s\S]*?)```/);
            if (match) {
                html = match[1];
            }

            // Inject Favicon
            const faviconLink = this.generateFaviconLink(formData.companyName, accentColors);
            if (html.includes('</head>')) {
                html = html.replace('</head>', `    ${faviconLink}\n</head>`);
            } else if (html.includes('<body>')) { // Fallback if no head, inject before body
                html = html.replace('<body>', `<head>${faviconLink}</head><body>`);
            } else { // Last resort, prepend
                html = `${faviconLink}\n${html}`;
            }

            console.log("GeminiService: Final HTML length:", html.length);
            return html;

        } catch (error) {
            console.error("Gemini Generation Error:", error);
            throw new Error("Failed to generate website content.");
        }
    },

    /**
     * Generates a dynamic SVG favicon link.
     * @param {string} name - Company name.
     * @param {string} color - Accent color string (e.g. "Blue or Green").
     * @returns {string} - HTML with favicon injected.
     */
    generateFaviconLink(name, colorDesc) {
        if (!name) return "";
        const letter = name.charAt(0).toUpperCase();

        let hexColor = '#2563eb'; // Default Blue-600
        const lowerColor = (colorDesc || '').toLowerCase();
        if (lowerColor.includes('red')) hexColor = '#dc2626';
        else if (lowerColor.includes('green')) hexColor = '#16a34a';
        else if (lowerColor.includes('orange')) hexColor = '#ea580c';
        else if (lowerColor.includes('purple')) hexColor = '#9333ea';
        else if (lowerColor.includes('black')) hexColor = '#000000';
        else if (lowerColor.includes('gray')) hexColor = '#4b5563';

        const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="50" fill="${hexColor}"/>
          <text x="50" y="55" font-family="Arial, sans-serif" font-size="60" fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">${letter}</text>
        </svg>
        `.trim();

        const base64Svg = btoa(svg);
        const faviconLink = `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${base64Svg}">`;

        return faviconLink;
    },

    /**
     * Verifies and fixes the generated HTML code.
     * @param {string} html - The raw HTML code.
     * @returns {Promise<string>} - The fixed HTML code.
     */
    async verifyAndFixWebsite(html) {
        if (!html) return "";

        // 1. Basic Cleanup
        let cleanHtml = html.replace(/```html/g, '').replace(/```/g, '');

        // 2. Ensure Tailwind (Failsafe)
        if (!cleanHtml.includes('cdn.tailwindcss.com')) {
            const headTag = '<head>';
            if (cleanHtml.includes(headTag)) {
                cleanHtml = cleanHtml.replace(headTag, `<head>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">`);
            } else {
                cleanHtml = `<script src="https://cdn.tailwindcss.com"></script>${cleanHtml}`;
            }
        }

        // 3. Fix Naked Placeholders
        // Find [DESC_PHOTO: ...] that is NOT inside src="..." or background-image: url(...)
        // We look for [DESC_PHOTO: ...] not preceded by quotes or parentheses

        const photoRegex = /\[DESC_PHOTO:\s*([a-zA-Z0-9_]+)\]/g;

        // A. Fix "Naked" Placeholders (not in any attribute)
        cleanHtml = cleanHtml.replace(photoRegex, (match, type, offset, string) => {
            const prevChar = offset > 0 ? string[offset - 1] : '';
            if (prevChar === '"' || prevChar === "'" || prevChar === '(') return match;
            const prefix = string.substring(Math.max(0, offset - 10), offset);
            if (prefix.includes('src=') || prefix.includes('url(')) return match;

            console.log(`[GeminiService] Componentizing naked placeholder: ${type}`);
            return `<img src="[DESC_PHOTO: ${type}]" alt="${type} Image" class="w-full h-64 object-cover rounded-xl shadow-lg my-8">`;
        });

        // B. Fix "Alt-Only" Placeholders (AI put it in alt="" but not src="")
        // Look for <img ... alt="[DESC_PHOTO: X]" ...> where src is missing or doesn't have the placeholder.
        // We will do a blunt replace: alt="[DESC_PHOTO: X]" -> src="[DESC_PHOTO: X]" alt="X"
        // This covers the specific user issue.

        const altRegex = /alt="\[DESC_PHOTO:\s*([^\]]+)\]"/g;
        cleanHtml = cleanHtml.replace(altRegex, (match, type) => {
            console.log(`[GeminiService] Fixing Alt-Only placeholder: ${type}`);
            return `src="[DESC_PHOTO: ${type}]" alt="${type} Image"`;
        });

        // 4. Preserve Metadata (Netlify)
        if (!cleanHtml.includes('data-netlify="true"')) {
            cleanHtml = cleanHtml.replace('<form', '<form data-netlify="true"');
        }

        return cleanHtml;
    }
}
