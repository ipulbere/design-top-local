<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  title: String,
  count: {
    type: Number,
    default: 1
  },
  basePrompt: {
    type: String,
    default: ''
  },
  sectionKey: String // e.g., 'hero', 'services'
})

const emit = defineEmits(['save'])

const userPrompt = ref(props.basePrompt)
const generatedImages = ref([])
const isGenerating = ref(false)
const errorMsg = ref('')

// Generate via Backend (Gemini)
async function generate() {
  isGenerating.value = true
  generatedImages.value = []
  
  const prompt = userPrompt.value.trim()
  
  try {
      // Create an array of promises based on count
      const promises = Array.from({ length: props.count }, () => 
          fetch('/.netlify/functions/generate-assets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  prompt: prompt,
                  mode: 'single', 
                  category: props.sectionKey // Context for folder organization if we wanted
              })
          }).then(res => res.json())
      );

      const results = await Promise.all(promises);
      
      results.forEach(data => {
          if (data.url) {
              generatedImages.value.push(data.url)
          } else if (data.error) {
              // Capture error
              errorMsg.value = `Backend Error: ${data.error} \n ${data.details || ''}`
          }
      });

  } catch (e) {
      console.error("Generation error:", e)
      errorMsg.value = `Network Error: ${e.message}`
  } finally {
      isGenerating.value = false
  }
}

function save() {
  if (generatedImages.value.length === 0) return
  emit('save', {
    section: props.sectionKey,
    images: generatedImages.value,
    prompt: userPrompt.value
  })
}
</script>

<template>
  <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-slate-800">{{ title }} <span class="text-sm font-normal text-slate-500">({{ count }} images)</span></h3>
      <button 
        @click="save" 
        :disabled="generatedImages.length === 0"
        class="text-sm px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        Save to DB
      </button>
    </div>

    <!-- Error Banner -->
    <div v-if="errorMsg" class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
        <strong class="font-bold">Error!</strong>
        <pre class="block sm:inline text-xs mt-1 whitespace-pre-wrap">{{ errorMsg }}</pre>
        <span class="absolute top-0 right-0 px-4 py-3" @click="errorMsg = ''">
            <svg class="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
        </span>
    </div>

    <!-- Prompt Input -->
    <div class="mb-4">
      <label class="block text-xs font-medium text-slate-500 mb-1">Prompt</label>
      <div class="flex gap-2">
        <input 
          v-model="userPrompt" 
          type="text" 
          class="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          @keydown.enter="generate"
        />
        <button 
          @click="generate" 
          :disabled="isGenerating"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition flex items-center"
        >
          <span v-if="isGenerating" class="animate-spin mr-2">⟳</span>
          Generate
        </button>
      </div>
    </div>

    <!-- Image Grid -->
    <div v-if="generatedImages.length > 0" class="grid gap-4" :class="count > 1 ? 'grid-cols-3' : 'grid-cols-1'">
      <div v-for="(img, idx) in generatedImages" :key="idx" class="group relative aspect-[4/3] bg-slate-100 rounded overflow-hidden border border-slate-200">
        <img :src="img" class="w-full h-full object-cover" loading="lazy" />
        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <a :href="img" target="_blank" class="text-white text-xs underline">View Full</a>
        </div>
      </div>
    </div>
    <div v-else class="text-center py-8 bg-slate-50 rounded border border-dashed border-slate-300">
      <span class="text-slate-400 text-sm">No images generated yet</span>
    </div>
  </div>
</template>
