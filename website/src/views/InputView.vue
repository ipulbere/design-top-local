<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWebsiteStore } from '../stores/website'
import categoriesData from '../data/categories.json'
import { db } from '../services/db'

const router = useRouter()
const store = useWebsiteStore()

const form = ref({
  name: store.companyInfo.name,
  email: store.companyInfo.email,
  phone: store.companyInfo.phone,
  address: store.companyInfo.address,
   // Default to first category if current invalid
  category: store.companyInfo.category || categoriesData[0].Category,
  description: store.companyInfo.description,
})

const isSubmitting = ref(false)

async function handleSubmit() {
  isSubmitting.value = true
  
  try {
    // Update store with selected category details
    const selectedCat = categoriesData.find(c => c.Category === form.value.category)
    
    // Parse services
    const serviceList = selectedCat ? selectedCat['List of Services'].split(', ') : []

    store.updateCompanyInfo({
      ...form.value,
      // Clean category name (remove "1. ")
      category: selectedCat.Category.replace(/^\d+\.\s+/, ''), 
      style: selectedCat['Website Style'],
      colors: {
          bg: 'bg-white', // Simplified mapping based on description
          text: 'text-slate-900',
          btn: 'bg-blue-600',
          nav: 'bg-white'
      },
      // Pass all the new metadata
      raw_category_data: selectedCat,
      services: serviceList,
      
      // Map new fields
      certificates: selectedCat['Certificates'],
      offer: { text: selectedCat['Free Offers'], subtext: 'Contact us today' },
      equipment: selectedCat['Equipment'],
      uniforms: selectedCat['Uniforms'] === 'Yes',
      hours: selectedCat['Working Hours'],
      showBeforeAfter: selectedCat['Before and After Pictures'] !== 'No',
      
      // Pass enriched content
      content: selectedCat.content
    })

    // Save to DB and get ID
    const siteId = await db.saveSite(store.companyInfo)
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Redirect to persistent link
    router.push(`/site/${siteId}`)
  } catch (error) {
    console.error('Submission failed:', error)
    alert('Something went wrong: ' + error.message)
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-slate-900">Website Generator</h1>
        <p class="text-slate-500 mt-2">Get your professional website in seconds.</p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
          <input v-model="form.name" type="text" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="e.g. Elite Painters" />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Business Category</label>
          <select v-model="form.category" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition">
            <option v-for="(cat, index) in categoriesData" :key="index" :value="cat.Category">
              {{ cat.Category }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
          <input v-model="form.email" type="email" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="you@company.com" />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
          <input v-model="form.phone" type="tel" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="(555) 123-4567" />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Business Address</label>
          <input v-model="form.address" type="text" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="123 Business Rd, City" />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea v-model="form.description" rows="3" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="What do you do best?"></textarea>
        </div>

        <button type="submit" :disabled="isSubmitting" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02] flex justify-center items-center">
          <span v-if="isSubmitting" class="animate-spin mr-2">⟳</span>
          {{ isSubmitting ? 'Generating Site...' : 'Create Website' }}
        </button>
      </form>
    </div>
  </div>
</template>
