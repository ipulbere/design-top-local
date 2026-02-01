<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useWebsiteStore } from '../stores/website'
import categoriesData from '../data/categories.json'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close', 'update'])

const store = useWebsiteStore()

// Local Form State
const form = ref({
    subdomain: '',
    style: '',
    bgColor: '',
    accentColor: '',
    services: '',
    certificates: '',
    offerText: '',
    equipment: '',
    hours: ''
})

// Initialize form from store
watch(() => props.show, (newVal) => {
    if (newVal) {
        syncFromStore();
    }
})

function syncFromStore() {
    form.value.subdomain = store.companyInfo.subdomain || generateDefaultDomain(store.companyInfo.name);
    form.value.style = store.companyInfo.style || '';
    form.value.bgColor = store.companyInfo.colors?.bg || '';
    form.value.accentColor = store.companyInfo.colors?.accent || '';
    form.value.services = (store.companyInfo.services || []).join(', ');
    form.value.certificates = store.companyInfo.certificates || '';
    form.value.offerText = store.companyInfo.offer?.text || '';
    form.value.equipment = store.companyInfo.equipment || '';
    form.value.hours = store.companyInfo.hours || '';
}

// Generate default domain: strictly lowercase letters, max 2 words
function generateDefaultDomain(name) {
    if (!name) return 'mysite';
    // Remove symbols, digits, keep spaces for splitting, then take first 2 words
    const clean = name.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).slice(0, 2).join('');
    return clean || 'mysite';
}

// Computed for Domain Preview
const domainPreview = computed(() => {
    // Enforce rules on input: lowercase, no symbols
    const safe = form.value.subdomain.toLowerCase().replace(/[^a-z]/g, '');
    return `${safe}.top-local.net`;
})

function handleDomainInput(e) {
    // Real-time sanitization
    form.value.subdomain = e.target.value.toLowerCase().replace(/[^a-z]/g, '');
}

// Update Action
function handleUpdate() {
    // 1. Update Store
    const updates = {
        subdomain: form.value.subdomain,
        style: form.value.style,
        colors: { 
            ...store.companyInfo.colors,
            bg: form.value.bgColor || 'bg-white', // Simplified, assuming class names or hex
            accent: form.value.accentColor
        },
        services: form.value.services.split(',').map(s => s.trim()).filter(s => s),
        certificates: form.value.certificates,
        offer: { ...store.companyInfo.offer, text: form.value.offerText },
        equipment: form.value.equipment,
        hours: form.value.hours
    };

    store.updateCompanyInfo(updates);
    
    // 2. Emit event to Parent (to save DB and scroll)
    emit('update', updates);
}

// Unique Lists for Selects
const styles = [...new Set(categoriesData.map(c => c['Website Style']))];
</script>

<template>
  <div v-if="show" class="fixed top-0 left-0 w-full h-full z-[60] pointer-events-none">
      <!-- Backdrop (Click to close) -->
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" @click="$emit('close')"></div>
      
      <!-- Panel -->
      <div class="absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl pointer-events-auto overflow-y-auto flex flex-col transition-transform duration-300 transform translate-x-0">
          
          <!-- Header -->
          <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 class="text-xl font-bold text-slate-900">Edit Website design</h2>
              <button @click="$emit('close')" class="p-2 hover:bg-slate-200 rounded-full transition">
                  <svg class="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
          </div>

          <!-- Form Fields -->
          <div class="p-6 space-y-6 flex-1">
              
              <!-- 1. Domain Name -->
              <div class="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <label class="block text-sm font-bold text-blue-900 mb-2">Domain Name <span class="text-xs font-normal opacity-70 ml-1">(Free Subdomain)</span></label>
                  <div class="flex items-center">
                      <input 
                        v-model="form.subdomain" 
                        @input="handleDomainInput"
                        type="text" 
                        class="flex-1 min-w-0 px-3 py-2 border border-blue-200 rounded-l-lg focus:ring-2 focus:ring-blue-500 outline-none text-right font-mono text-sm"
                        placeholder="mycompany"
                      />
                      <span class="bg-blue-100 px-3 py-2 border border-l-0 border-blue-200 rounded-r-lg text-blue-800 font-bold text-sm select-none flex items-center gap-1">
                          .top-local.net
                          <div class="group relative">
                              <span class="cursor-help text-xs bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center">i</span>
                              <div class="absolute bottom-full right-0 w-64 p-3 bg-slate-800 text-white text-xs rounded shadow-xl hidden group-hover:block mb-2 z-10 font-normal leading-relaxed">
                                  Domain <b>{{ domainPreview }}</b> is free to use. Domain names like <b>yourcompany.com</b> comes with upgrade, and available anytime later.
                              </div>
                          </div>
                      </span>
                  </div>
                  <p class="text-xs text-blue-600/70 mt-2">Full URL: <span class="font-mono">https://{{ domainPreview }}</span></p>
              </div>

              <!-- 2. Website Style -->
              <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Website Style</label>
                  <select v-model="form.style" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                      <option v-for="style in styles" :key="style" :value="style">{{ style }}</option>
                  </select>
              </div>

              <!-- 5. List of Services -->
              <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Services <span class="text-xs text-slate-400">(Comma separated)</span></label>
                  <textarea v-model="form.services" rows="4" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Service 1, Service 2..."></textarea>
                  <p class="text-xs text-slate-500 mt-1">Add, remove comma separated services your company provides. Add description if needed.</p>
              </div>

              <!-- 7. Free Offers -->
              <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Special Offer Text</label>
                  <input v-model="form.offerText" type="text" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

               <!-- 9. Working Hours -->
              <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Working Hours</label>
                  <input v-model="form.hours" type="text" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
               <!-- 6. Certificates -->
              <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Certificates <span class="text-xs text-slate-400">(Comma separated)</span></label>
                   <input v-model="form.certificates" type="text" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

          </div>

          <!-- Footer Actions -->
          <div class="p-6 border-t border-slate-100 bg-slate-50">
              <button @click="handleUpdate" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95">
                  Update Website
              </button>
          </div>
      </div>
  </div>
</template>
