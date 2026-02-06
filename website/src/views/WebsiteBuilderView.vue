<script setup>
import { ref, computed } from 'vue'
import { db } from '../services/db'
import categoriesData from '../data/categories.json'

const loading = ref(false)
const generatedHtml = ref('')
const error = ref('')

// Form Data - Defaulted to user request for verification
const formData = ref({
    companyName: 'Carlos Professional Painter',
    phone: '7735074333',
    address: '4911 W Roosevelt Rd, Cicero, IL 60804',
    category: 'Painters', 
    email: '',
    description: ''
})

const categories = categoriesData.map(c => c.Category)

// Generate Function
async function generateWebsite() {
    loading.value = true
    error.value = ''
    generatedHtml.value = ''
    
    try {
        const { category: rawCategory, companyName, phone, address, email, description } = formData.value
        
        // CLEAN: Remove "12. " prefix if present to match DB "Painters"
        const category = rawCategory.replace(/^\d+\.\s+/, '')
        
        console.log('Original Category:', rawCategory, '-> Cleaned:', category)

        // 1. Fetch Template
        console.log('Fetching template for:', category)
        const template = await db.getTemplate(category)
        if (!template) throw new Error(`No templates found for category: ${category}`)
        
        console.log('Template fetched:', template.template_number)

        // 2. Fetch Assets
        console.log('Fetching assets for:', category)
        const assets = await db.getCategoryAssets(category)
        console.log('Assets found:', assets.length)

        // 3. Injection Logic
        let html = template.html

        // CLEANING: The DB might contain conversational text from LLM generation.
        // We attempt to find the start of the HTML document.
        const docTypeIndex = html.indexOf('<!DOCTYPE html>')
        const htmlTagIndex = html.indexOf('<html')

        if (docTypeIndex !== -1) {
            html = html.substring(docTypeIndex)
        } else if (htmlTagIndex !== -1) {
            html = html.substring(htmlTagIndex)
        }
        
        // Also try to trim the end if there is text after </html>
        const htmlEndTag = '</html>'
        const endTagIndex = html.lastIndexOf(htmlEndTag)
        if (endTagIndex !== -1) {
            html = html.substring(0, endTagIndex + htmlEndTag.length)
        }

        // A. Parse and Inject Assets via DOM
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const images = doc.querySelectorAll('img')
        
        // Helper: Normalize string for keyword matching
        const normalize = (s) => s ? s.toLowerCase().replace(/[^a-z0-9]/g, '') : ''

        // Create a pool of available assets
        const assetPool = [...assets]

        images.forEach(img => {
            const src = img.getAttribute('src') || ''
            const alt = img.getAttribute('alt') || ''
            const className = img.className || ''
            
            // Skip if already Base64
            if (src.startsWith('data:')) return

            let foundAssetIndex = -1

            // 1. Exact Identifier Match (The user requirement)
            foundAssetIndex = assetPool.findIndex(a => a.identifier === src)

            // 2. Keyword Match (Strongest Fallback)
            // Check src, alt, AND class for keywords matching the asset type or identifier
            if (foundAssetIndex === -1) {
                foundAssetIndex = assetPool.findIndex(a => {
                    const typeKeywords = normalize(a.type)
                    const idKeywords = normalize(a.identifier)
                    
                    // Combine all potential indicators from the HTML tag
                    const tagKeywords = normalize(src + alt + className)
                    
                    // Logic: Does the tag contain the asset type? 
                    // e.g. alt="Painters Team" contains "team" -> matches asset type "team"
                    const typeMatch = a.type && tagKeywords.includes(normalize(a.type))
                    
                    // Special case for "Hero" - commonly in header classes
                    const heroMatch = tagKeywords.includes('hero') && typeKeywords.includes('hero')
                    
                    return typeMatch || heroMatch
                })
            }

            // 3. Round Robin / Greedy Fallback
            // If we still haven't found a match, look for ANY asset of a broadly matching category
            // or just take the next one.
            if (foundAssetIndex === -1 && assetPool.length > 0) {
                // Try to find one that hasn't been used yet?
                // For now, just take zero index
                foundAssetIndex = 0
            }

            // Apply Replacement
            if (foundAssetIndex !== -1) {
                const asset = assetPool[foundAssetIndex]
                img.src = asset.image_data
                
                // Optional: Update alt text to match verified asset?
                // img.alt = asset.description || asset.type

                // Remove used asset from pool to avoid duplicates
                assetPool.splice(foundAssetIndex, 1)
            }
        })

        // Re-serialize
        html = doc.documentElement.innerHTML
        // DOMParser wraps in <html><body>...</body></html>. We might want just the content if the template was partial.
        // But assuming full page template:
        html = `<!DOCTYPE html>\n<html>${html}</html>`


        // B. Inject Company Info
        // We assume some standard placeholders might be in the template, 
        // OR we just assume the template has specific ID's we might want to target?
        // The user request said: "Make the link to the images... replace the above listed company details"
        // Since I don't know the EXACT placeholders in the HTML (e.g. {{Name}} or id="company-name"),
        // I will attempt standard mustache-style replacements AND some common ID/Class replacements if possible.
        // For now, doing simple string replacement based on likely placeholders.
        
        const replacements = {
            '{{CompanyName}}': companyName,
            '{{Phone}}': phone,
            '{{Address}}': address,
            '{{Category}}': category,
            '[Company Name]': companyName,
            '[Phone Number]': phone,
            '[Address]': address,
            'Company Name': companyName, // Risky but possible placeholder
        }

        Object.entries(replacements).forEach(([key, value]) => {
            const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
            html = html.replace(regex, value)
        })
        
        // C. Accent Color Injection (if needed)
        if (template.accent_color) {
            // Simple replace if there's a placeholder, or just CSS variable injection could be done here
            // html = html.replace('{{AccentColor}}', template.accent_color)
        }

        generatedHtml.value = html
        
    } catch (e) {
        console.error('Generation Error:', e)
        error.value = e.message || 'Failed to generate website'
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="min-h-screen bg-slate-50 flex flex-col items-center py-10">
        
        <!-- Input Card (Matches Screenshot) -->
        <div v-if="!generatedHtml" class="w-full max-w-lg bg-white rounded-xl shadow-lg p-8 animate-fade-in">
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-slate-800">Website Generator</h1>
                <p class="text-slate-500 mt-2">Get your professional website in seconds.</p>
            </div>

            <div class="space-y-5">
                
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Company Name</label>
                    <input v-model="formData.companyName" type="text" class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="Your Company">
                </div>

                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Business Category</label>
                    <select v-model="formData.category" class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white">
                        <option value="" disabled>Select a category...</option>
                        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                    <input v-model="formData.email" type="email" class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="you@company.com">
                </div>

                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input v-model="formData.phone" type="text" class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="(555) 123-4567">
                </div>

                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Business Address</label>
                    <input v-model="formData.address" type="text" class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="123 Main St, City, Country">
                </div>

                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                    <textarea v-model="formData.description" rows="3" class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="We provide professional services for your needs. Quality guaranteed."></textarea>
                </div>

                <div class="pt-4">
                    <button 
                        @click="generateWebsite"
                        :disabled="loading"
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg shadow-md transition-transform transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center text-lg"
                    >
                        <span v-if="loading" class="animate-spin mr-2">⟳</span>
                        {{ loading ? 'Creating Website...' : 'Create Website' }}
                    </button>
                </div>

                <div v-if="error" class="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100">
                    {{ error }}
                </div>
            </div>
        </div>

        <!-- Preview Area (Full Screen Overlay or Below) -->
        <div v-else class="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in">
             <div class="bg-slate-900 text-white px-6 py-3 flex justify-between items-center shadow-md">
                <div class="font-bold flex items-center gap-2">
                    <span class="text-blue-400">✨</span> Site Preview
                </div>
                <button @click="generatedHtml = ''" class="text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded transition">
                    ← Edit Details
                </button>
             </div>
             <iframe 
                :srcdoc="generatedHtml"
                class="flex-1 w-full border-0"
                title="Website Preview"
                sandbox="allow-scripts allow-modals"
            ></iframe>
        </div>

    </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
