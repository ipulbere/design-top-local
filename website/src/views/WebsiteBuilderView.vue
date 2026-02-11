<script setup>
import { ref, computed } from 'vue'
import { db } from '../services/db'
import categoriesData from '../data/categories.json'
import { GeminiService } from '../services/GeminiService'
import { ImageService } from '../services/ImageService'

const loading = ref(false)
const generatedHtml = ref('')
const error = ref('')

// Use Store for Data
import { useWebsiteStore } from '../stores/website'
import { useRoute } from 'vue-router'
import { onMounted } from 'vue'

const store = useWebsiteStore()
const route = useRoute()

// Form Data - Sync with Store
const formData = computed(() => {
    return {
        companyName: store.companyInfo.name || '',
        phone: store.companyInfo.phone || '',
        address: store.companyInfo.address || '',
        category: store.companyInfo.category || '',
        email: store.companyInfo.email || '',
        description: store.companyInfo.description || ''
    }
})

const categories = categoriesData.map(c => c.Category)

// Generate Function
// Generate Function
async function generateWebsite() {
    loading.value = true
    error.value = ''
    generatedHtml.value = ''
    
    try {
        const { category: selectedCategoryName, companyName, phone, address, email, description } = formData.value
        
        console.log('Selected Category:', selectedCategoryName)

        // 1. Find Category Data
        const categoryData = categoriesData.find(c => c.Category === selectedCategoryName)
        if (!categoryData) throw new Error(`Category data not found for: ${selectedCategoryName}`)

        // 2. Fetch Images (Parallel with HTML generation if possible, but sequential is safer for now)
        // Clean category name for image service (e.g. "44. Windows" -> "windows")
        const cleanCategoryName = selectedCategoryName.replace(/^\d+\.\s+/, '').toLowerCase()
        console.log('Fetching images for:', cleanCategoryName)
        
        // We'll run them in parallel for speed
        const [images, rawHtml] = await Promise.all([
            ImageService.getCategoryImages(cleanCategoryName),
            GeminiService.generateWebsiteHtml(categoryData, formData.value)
        ])

        console.log('Images fetched:', images)
        console.log('Raw HTML generated type:', typeof rawHtml)
        console.log('Raw HTML generated length:', rawHtml ? rawHtml.length : 0)
        console.log('Raw HTML snippet:', rawHtml ? rawHtml.substring(0, 100) : 'EMPTY')

        if (!rawHtml) {
            throw new Error('Gemini returned empty HTML')
        }

        // 3. Verify and Fix HTML
        console.log('Verifying HTML...')
        let html = await GeminiService.verifyAndFixWebsite(rawHtml)

        // 4. Inject Images
        // Parse HTML to find placeholders
        // Placeholders: [DESC_PHOTO: Type]
        // Types: Hero, Team, BeforeAndAfter, HappyCustomer
        
        Object.keys(images).forEach(sectionKey => {
            const sectionImages = images[sectionKey]
            const isArray = Array.isArray(sectionImages)
            
            // Normalize key for matching (e.g., "hero" -> "Hero")
            // The placeholder uses PascalCase or specific keys.
            // Let's map our service keys to placeholder keys.
            // Service keys come from filenames: windows_Hero_1 -> "hero"
            // Placeholder: [DESC_PHOTO: Hero]
            
            let placeholderKey = ''
            if (sectionKey === 'hero') placeholderKey = 'Hero'
            else if (sectionKey === 'team') placeholderKey = 'Team'
            else if (sectionKey === 'before_and_after') placeholderKey = 'BeforeAndAfter'
            else if (sectionKey === 'happy_customer') placeholderKey = 'HappyCustomer'
            else placeholderKey = sectionKey // Fallback

            if (!placeholderKey) return

            // Construct regex for this placeholder
            // <img ... alt="[DESC_PHOTO: Hero]" ...>
            // exact string match for alt is safer if we parse DOM, but regex replace is faster/easier for simple text
            // prompting ensured <img alt="[DESC_PHOTO: Type]">
            
            // We need to handle the "2 images" case for BeforeAndAfter
            if (isArray && sectionImages.length > 0) {
                // Replace sequentially
                sectionImages.forEach(imgUrl => {
                     // Replace the first occurrence found
                     html = html.replace(`[DESC_PHOTO: ${placeholderKey}]`, imgUrl)
                })
            } else if (!isArray && sectionImages) {
                // Replace all occurrences (should be 1)
                html = html.split(`[DESC_PHOTO: ${placeholderKey}]`).join(sectionImages)
            }
        })

        // Cleanup: If any placeholders remain (e.g. we didn't have images), replace with a fallback or empty?
        // For now, let's leave them or replace with a generic placeholder if possible.
        // Or assume the user provided valid data.
        
        // If "before_and_after" was requested but we only have "happy_customer" (based on logic in Service)
        // accepted prompt logic: "If 'Before and After Pictures': has anything else than Yes - Supabese will have a happy customer picture"
        // In that case, the Prompt would have generated [DESC_PHOTO: HappyCustomer].
        // And ImageService would have returned 'happy_customer' key.
        // So the loop above handles it naturally if keys match.

        // 5. Final Polish: Force-inject Dependencies (Failsafe)
        if (!html.includes('cdn.tailwindcss.com')) {
            const headEnd = html.indexOf('</head>')
            const tailwindScript = '<script src="https://cdn.tailwindcss.com"><' + '/script>' +
            '<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">' +
            '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">';
            if (headEnd !== -1) {
                html = html.substring(0, headEnd) + tailwindScript + html.substring(headEnd)
            } else {
                // If no head, prepend to body or generic
                html = tailwindScript + html
            }
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
