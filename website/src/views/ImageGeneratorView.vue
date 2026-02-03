<script setup>
import { ref, computed, watch } from 'vue'
import categoriesData from '../data/categories.json'
import ImageGeneratorSection from '../components/ImageGeneratorSection.vue'
import { db } from '../services/db'

const selectedCategory = ref('')
const currentCategoryData = computed(() => {
  return categoriesData.find(c => c.Category === selectedCategory.value)
})

// Clean category name helper
const categoryName = computed(() => {
    if (!currentCategoryData.value) return ''
    return currentCategoryData.value.Category.replace(/^\d+\.\s+/, '')
})

// Dynamic prompts based on category
const prompts = computed(() => {
    const cat = categoryName.value.toLowerCase()
    if (!cat) return {}
    
    // Default style from data or generic fallback
    const style = currentCategoryData.value['Website Style'] || 'modern professional'
    const colors = currentCategoryData.value['Background Colors'] || 'neutral'

    return {
        // Simple keywords for LoremFlickr
        hero: `${cat},professional,business`,
        services: `${cat},service,work,tools`,
        team: `${cat},worker,team,professional`,
        gallery: `${cat},project,construction,renovation`
    }
})

// Store generated assets map
const assetsMap = ref({})

function handleSave(data) {
    // data = { section: 'hero', images: [], prompt: '...' }
    assetsMap.value[data.section] = data.images
    
    // If we want to save immediately per section:
    // saveToDb()
    console.log(`Stored assets for ${data.section}:`, data.images)
}

const isSaving = ref(false)

async function saveAllToDb() {
    if (!selectedCategory.value) return alert('Please select a category first')
    
    isSaving.value = true
    try {
        // Construct the asset object to save
        // We'll use a specific ID format for category assets or just update a "template" site
        const assetPayload = {
            category: categoryName.value,
            assets: assetsMap.value,
            timestamp: Date.now()
        }

        // Call DB service (we need to implement saveAssets there)
        await db.saveAssets(categoryName.value, assetsMap.value)
        
        alert('Assets saved to database successfully!')
    } catch (e) {
        console.error(e)
        alert('Failed to save assets: ' + e.message)
    } finally {
        isSaving.value = false
    }
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 p-8">
    <div class="max-w-5xl mx-auto space-y-8">
      
      <!-- Header -->
      <div class="flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">AI Asset Generator</h1>
          <p class="text-slate-500 mt-2">Generate and curate images for website categories.</p>
        </div>
        <div class="w-1/3">
            <label class="block text-sm font-medium text-slate-700 mb-1">Select Category</label>
            <select v-model="selectedCategory" class="w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="" disabled>Choose a category...</option>
                <option v-for="cat in categoriesData" :key="cat.Category" :value="cat.Category">
                    {{ cat.Category }}
                </option>
            </select>
        </div>
      </div>

      <div v-if="selectedCategory" class="space-y-8 animate-fade-in">
        
        <!-- Info Banner -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <span class="text-xl">ℹ️</span>
            <div>
                <h4 class="font-semibold text-blue-900">Generating for: {{ categoryName }}</h4>
                <p class="text-sm text-blue-700">Style: {{ currentCategoryData['Website Style'] }} | Colors: {{ currentCategoryData['Background Colors'] }}</p>
            </div>
        </div>

        <!-- Sections -->
        
        <!-- Hero (1 Image) -->
        <ImageGeneratorSection 
            title="Hero Section" 
            :count="1" 
            :base-prompt="prompts.hero"
            section-key="hero"
            @save="handleSave"
        />

        <!-- Services (3 Images) -->
        <ImageGeneratorSection 
            title="Services Showcase" 
            :count="3" 
            :base-prompt="prompts.services"
            section-key="services"
            @save="handleSave"
        />

        <!-- Team (1 Image) -->
        <ImageGeneratorSection 
            title="Team Picture" 
            :count="1" 
            :base-prompt="prompts.team"
            section-key="team"
            @save="handleSave"
        />

        <!-- Gallery / Visual Proof (3 Images) -->
        <ImageGeneratorSection 
            title="Visual Proof (Gallery)" 
            :count="3" 
            :base-prompt="prompts.gallery"
            section-key="gallery"
            @save="handleSave"
        />

        <!-- Global Actions -->
        <div class="fixed bottom-8 right-8 z-50">
            <button 
                @click="saveAllToDb" 
                :disabled="isSaving"
                class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition transform hover:scale-105 flex items-center"
            >
                <span v-if="isSaving" class="animate-spin mr-2">⟳</span>
                Save All Assets to DB
            </button>
        </div>

      </div>
      
      <div v-else class="text-center py-20 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
        Select a category above to start generating assets.
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
