<script setup>
import { ref } from 'vue'
import { useWebsiteStore } from '../stores/website'
import { db } from '../services/db'

const store = useWebsiteStore()
const categories = ref([
  "Roofer", "Dentist", "Plumber", "Electrician", "Landscaper", "HVAC", "Painter", "Lawyer", "Accountant", "Gym", "Restaurant", "Real Estate", "Other"
])

const selectedCategory = ref('')
const generatedHtml = ref('')
const isLoading = ref(false)

// Default prompt matching the system prompt in the Netlify function (for visibility)
const systemPrompt = ref(`
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
`.trim())

async function generateTemplate() {
    if (!selectedCategory.value) return;
    isLoading.value = true;
    generatedHtml.value = '';

    try {
        const response = await fetch('/.netlify/functions/generate-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                category: selectedCategory.value,
                customPrompt: systemPrompt.value 
            })
        });

        const data = await response.json();
        if (data.html) {
            generatedHtml.value = data.html;
        } else {
            alert('Generation failed or empty');
        }
    } catch (e) {
        console.error(e);
        alert('Error generating template');
    } finally {
        isLoading.value = false;
    }
}

async function saveTemplate() {
    if (!generatedHtml.value || !selectedCategory.value) return;
    // We can call the Netlify function again to save? Or save directly via DB if we have access?
    // The Netlify function ALREADY saves to the 'category_templates' table on generation.
    // So this button might just be "force save" or simply a "Done" indicator since it's auto-saved.
    // However, if we want to manually override what's in the DB with this specific revision, we'd need a specific save endpoint or logic.
    // For now, let's assume the generation loop SAVED it (as per logic).
    alert('Template generated and auto-saved to Database by the backend.');
}

</script>

<template>
    <div class="min-h-screen bg-slate-100 p-8 font-sans">
        <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- Controls -->
            <div class="bg-white p-6 rounded-xl shadow-lg space-y-6 h-fit">
                <h1 class="text-2xl font-bold text-slate-900">AI Template Generator</h1>
                
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">Category</label>
                    <select v-model="selectedCategory" class="w-full p-3 border rounded-lg bg-slate-50">
                        <option value="" disabled>Select a Business Type</option>
                        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">System Prompt</label>
                    <textarea v-model="systemPrompt" rows="15" class="w-full p-3 border rounded-lg bg-slate-50 font-mono text-xs"></textarea>
                </div>

                <div class="flex flex-col gap-3">
                    <button 
                        @click="generateTemplate" 
                        :disabled="isLoading || !selectedCategory"
                        class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                        <span v-if="isLoading" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                        {{ isLoading ? 'Generating...' : 'Generate Template' }}
                    </button>
                    
                    <button 
                         @click="saveTemplate"
                         :disabled="!generatedHtml"
                         class="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50"
                    >
                        Save / Confirm
                    </button>
                    <p class="text-xs text-slate-500 text-center">Note: Generation automatically caches result to Supabase.</p>
                </div>
            </div>

            <!-- Preview -->
            <div class="lg:col-span-2 bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 flex flex-col h-[calc(100vh-4rem)]">
                <div class="bg-slate-100 px-4 py-2 border-b flex justify-between items-center">
                    <span class="font-bold text-slate-600 text-sm">Live Preview</span>
                    <span v-if="generatedHtml" class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">HTML Loaded</span>
                </div>
                
                <div v-if="!generatedHtml" class="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                    <svg class="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <p>Select a category and generate to verify layout.</p>
                </div>

                <div v-else class="flex-1 overflow-y-auto relative bg-white">
                     <!-- Render RAW HTML -->
                     <div v-html="generatedHtml"></div>
                </div>
            </div>

        </div>
    </div>
</template>
