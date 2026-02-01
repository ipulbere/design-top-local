<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWebsiteStore } from '../stores/website'

import { db } from '../services/db'
import EditorPanel from '../components/EditorPanel.vue'

const router = useRouter()
const route = useRoute()
const store = useWebsiteStore()

// Load from DB if ID exists
onMounted(async () => {
  if (route.params.id) {
    const savedSite = await db.getSite(route.params.id)
    if (savedSite) {
      store.updateCompanyInfo(savedSite)
    } else {
      // Site not found or expired
      alert('Site not found or expired (30-day limit)')
      router.push('/')
    }
  } else if (!store.companyInfo.name || store.companyInfo.name === 'Your Company') {
      router.push('/')
  }
})

const isEditing = ref(false)

function toggleEdit() {
  if (isEditing.value) {
      saveChanges(); // Save when turning off
  }
  isEditing.value = !isEditing.value
}

function handleContentUpdate(key, event) {
  if (isEditing.value) {
    store.companyInfo[key] = event.target.innerText
    // Auto-save if we have an ID
    if (route.params.id) {
      db.updateSite(route.params.id, store.companyInfo)
    }
  }
}

function handleApprove() {
  store.approveWebsite()
  router.push({ path: '/lander', query: { id: route.params.id } })
}

// Dynamic Theme Colors (fallbacks if category data missing)
const themeColor = store.companyInfo.colors?.accent || 'text-blue-600'
const btnColor = store.companyInfo.colors?.btn || 'bg-blue-600 hover:bg-blue-700'
const bgColor = store.companyInfo.colors?.bg || 'bg-slate-50'

const originUrl = ref(window.location.origin + '/Successpayment') // Redirect to existing success/payment view for demo purposes
// Or just window.location.href to stay on page. Let's use the 'Payment/Success' view for a "conversion" effect.
// But the user specifically asked about "submitting an email".
// I will set it to the current href.
const currentUrl = ref(window.location.href);

// State for advanced editor panel
const showEditorPanel = ref(false)

async function handleShare() {
    if (navigator.share) {
        try {
            // Sharing ONLY url (and title) often forces mobile OS to treat it as a Link Share (Hyperlink)
            // rather than a Text Share.
            await navigator.share({
                title: store.companyInfo.name || 'My Website',
                url: window.location.href
            });
        } catch (err) {
            console.log('Share dismissed', err);
        }
    } else {
        // Fallback
        navigator.clipboard.writeText(window.location.href).then(() => {
            toastMessage.value = 'Link Copied!';
            toastSubMessage.value = 'Ready to share with the world.';
            showSuccessToast.value = true;
            setTimeout(() => { showSuccessToast.value = false }, 3000);
        });
    }
}
// Toast Message State
const toastMessage = ref('Message Sent!');
const toastSubMessage = ref('We will get back to you shortly.');

function handleFormUpdate(updates) {
    // 1. Save Changes to DB
    saveChanges();
    
    // 2. Scroll to first visual change (Prioritize Services as requested "new box... should appear in line")
    // If services or styles changed, scrolling to Services section is a safe bet for visual confirmation.
    const servicesSection = document.getElementById('services');
    if (servicesSection) {
        servicesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Close panel
    showEditorPanel.value = false;
    isEditing.value = false; // Also exit "visual edit" mode to show clean view
}

// --- Editor Enhancements ---
const showImageModal = ref(false)
const pendingImagePath = ref('')
const imagePrompt = ref('')
const showSuccessToast = ref(false)

// URL for FormSubmit to redirect back to, with a success flag
const successRedirectUrl = ref(window.location.origin + window.location.pathname + '?success=true')

function openImageUpdate(path) {
    if (!isEditing.value) return;
    pendingImagePath.value = path;
    imagePrompt.value = ''; 
    showImageModal.value = true;
}

const isSaving = ref(false)

async function saveChanges() {
    if (route.params.id) {
        isSaving.value = true;
        const result = await db.updateSite(route.params.id, store.companyInfo);
        isSaving.value = false;
        
        if (!result.success) {
            console.error("Save failed:", result.error);
            alert("Error saving changes: " + (result.error?.message || "Unknown error"));
        }
    }
}

function handleImageUpdate() {
   if (!imagePrompt.value) return;
   store.updateImage(pendingImagePath.value, imagePrompt.value);
   showImageModal.value = false;
   // Small delay to ensure store updates
   setTimeout(saveChanges, 100);
}

// Check for success flag on mount
onMounted(() => {
    // Check for success param from FormSubmit redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
        showSuccessToast.value = true;
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Auto hide after 5 seconds
        setTimeout(() => {
            showSuccessToast.value = false;
        }, 5000);
    }
})

// Universal Text Editing Directive
const vEditable = {
  mounted: (el, binding) => {
    el.addEventListener('blur', (e) => {
       if (isEditing.value) {
           store.updateContent(binding.value, e.target.innerText);
           saveChanges();
       }
    })
    // Prevent navigating when clicking links in edit mode
    el.addEventListener('click', (e) => {
        if (isEditing.value && el.tagName === 'A') e.preventDefault();
    })
  },
  updated: (el, binding) => {
     el.contentEditable = isEditing.value;
     if (isEditing.value) {
         el.classList.add('outline-dashed', 'outline-2', 'outline-yellow-400', 'bg-yellow-50/50', 'cursor-text', 'rounded', 'px-1', 'transition-all');
     } else {
         el.classList.remove('outline-dashed', 'outline-2', 'outline-yellow-400', 'bg-yellow-50/50', 'cursor-text', 'rounded', 'px-1', 'transition-all');
         el.contentEditable = false;
     }
  }
}

</script>

<template>
  <div class="min-h-screen relative pb-20">
    <!-- Toolbar -->
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur text-white px-2 py-2 rounded-full shadow-2xl flex items-center gap-2 transition-all hover:scale-105">
      <button @click="showEditorPanel = true" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        Edit Design
      </button>
      
      <div class="h-4 w-px bg-slate-600"></div>

      <button @click="toggleEdit" :class="isEditing ? 'bg-yellow-500 text-black' : 'bg-slate-700'" class="px-4 py-2 rounded-full font-medium transition-colors text-sm flex items-center gap-2">
        <span v-if="isSaving" class="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full"></span>
        {{ isSaving ? 'Saving...' : (isEditing ? 'Done Visual Edit' : 'Edit Description') }}
      </button>

      <div class="h-4 w-px bg-slate-600"></div>

      <button @click="handleShare" class="px-4 py-2 bg-indigo-600 hover:bg-slate-700 rounded-full font-bold text-sm shadow-lg transition-all flex items-center gap-2">
         <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
         Share
      </button>

      <div class="h-4 w-px bg-slate-600"></div>
      
      <button @click="handleApprove" class="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-full font-bold text-sm shadow-lg shadow-green-500/30 transition-all">
        Approve
      </button>
    </div>

    <EditorPanel 
        :show="showEditorPanel" 
        @close="showEditorPanel = false" 
        @update="handleFormUpdate"
    />

    <!-- Image Update Modal -->
    <div v-if="showImageModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <h3 class="text-2xl font-bold mb-4">Update Image</h3>
            <p class="text-slate-600 mb-6">Describe how you want this picture to be updated. Pass a prompt for our "Gemini Nano" generator.</p>
            <textarea 
                v-model="imagePrompt"
                rows="3" 
                class="w-full border-2 border-slate-200 rounded-xl p-4 mb-6 focus:border-blue-500 outline-none text-lg" 
                placeholder="E.g. 'A modern team of roofers smiling in front of a house'"
                autofocus
            ></textarea>
            <div class="flex gap-4 justify-end">
                <button @click="showImageModal = false" class="px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                <button @click="handleImageUpdate" class="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg">Generate Update</button>
            </div>
        </div>
    </div>

    <!-- Success Toast -->
    <div v-if="showSuccessToast" class="fixed bottom-8 right-8 z-[100] bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-bounce-in">
        <div class="bg-white/20 p-2 rounded-full">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <div>
            <h4 class="font-bold">{{ toastMessage }}</h4>
            <p class="text-green-100 text-sm">{{ toastSubMessage }}</p>
        </div>
        <button @click="showSuccessToast = false" class="ml-4 opacity-70 hover:opacity-100"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
    </div>

    <!-- Generated Website Container -->
    <div class="bg-white font-sans text-slate-900">
      
      <!-- 1. Navbar (Standard) -->
      <nav class="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100">
        <div class="container mx-auto px-6 h-20 flex justify-between items-center">
          <div class="flex items-center gap-3">
            <img :src="store.assets.logo" class="h-10 w-10 object-contain" alt="Logo" />
            <span v-editable="'name'" :class="themeColor" class="text-xl font-bold tracking-tight">{{ store.companyInfo.name }}</span>
          </div>
          <div class="hidden md:flex gap-8 text-sm font-medium text-slate-600">
             <a href="#services" class="hover:text-black transition">Services</a>
             <a href="#gallery" class="hover:text-black transition">Our Work</a>
             <a href="#contact" class="hover:text-black transition">Contact</a>
          </div>
          <a href="#contact" :class="btnColor" class="hidden md:block px-6 py-2.5 rounded-lg text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5">
            Get a Quote
          </a>
        </div>
      </nav>


      <!-- 2. Hero Section (High Impact) -->
      <section class="relative pt-16 pb-24 lg:pt-32 lg:pb-40 overflow-hidden bg-slate-50">
        <div class="container mx-auto px-6 relative z-10">
          <div class="max-w-4xl mx-auto text-center mb-12">
             <span v-editable="'category'" :class="themeColor" class="font-bold tracking-widest uppercase text-xs mb-4 block">Professional {{ store.companyInfo.category }} Services</span>
             <!-- Company Name in Text Description -->
             <h1 
               v-editable="'content.hero.headline'"
               class="text-4xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-8 tracking-tight"
             >
               {{ store.companyInfo.content?.hero?.headline || `Professional services by ${store.companyInfo.name}` }}
             </h1>
             <p class="text-xl text-slate-600 max-w-2xl mx-auto mb-10" v-editable="'content.hero.subheadline'">
               {{ store.companyInfo.content?.hero?.subheadline || `Trusted by neighbors in ${store.companyInfo.address.split(',')[1] || 'Your Area'}. We deliver excellence on every job.` }}
             </p>
             <div class="flex flex-col sm:flex-row gap-4 justify-center">
               <a href="#contact" v-editable="'content.hero.cta'" :class="btnColor" class="px-8 py-4 rounded-xl text-white font-bold text-lg shadow-xl shadow-blue-500/20 transition-all hover:scale-105 inline-block cursor-pointer">
                 {{ store.companyInfo.content?.hero?.cta || 'Get Your Free Estimate' }}
               </a>
               <a href="#services" class="px-8 py-4 rounded-xl bg-white text-slate-700 font-extrabold border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all inline-block">
                 View Our Services
               </a>
             </div>
          </div>
          <div class="relative max-w-5xl mx-auto mt-12 group">
            <div class="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <!-- Click to Update Image -->
            <div class="relative cursor-pointer" @click="openImageUpdate('equipment')">
                <div v-if="isEditing" class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10 rounded-2xl">
                    <span class="text-white font-bold bg-black/50 px-3 py-1 rounded-full border border-white/50">Click to Update Image</span>
                </div>
                <img :src="store.assets.equipment" class="relative rounded-2xl shadow-2xl w-full object-cover aspect-[21/9]" alt="Hero Image" />
            </div>
          </div>
        </div>
      </section>

      <!-- 3. List of Services -->
      <section id="services" class="py-24 bg-white">
        <div class="container mx-auto px-6">
          <div class="text-center max-w-2xl mx-auto mb-16">
            <h2 v-editable="'content.services.title'" class="text-3xl md:text-4xl font-bold mb-4">{{ store.companyInfo.content?.services?.title || 'List of Services' }}</h2>
            <p v-editable="'content.services.subtitle'" class="text-slate-500 text-lg">{{ store.companyInfo.content?.services?.subtitle || 'Comprehensive solutions tailored to your needs.' }}</p>
          </div>
          <div class="grid md:grid-cols-3 gap-8">
            <div v-for="(service, index) in store.companyInfo.services || ['Service 1', 'Service 2', 'Service 3']" :key="index" class="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all duration-300 group">
              <div class="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                 <svg :class="themeColor" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 v-editable="'services.'+index" class="text-xl font-bold mb-3 text-slate-900">{{ service }}</h3>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. Trust, Certs, Equipment, Hours -->
      <section class="py-16 bg-slate-900 text-white overflow-hidden">
        <div class="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-start">
           <div class="space-y-8">
             <!-- Trust Copy -->
             <div class="mb-8">
                 <h2 v-editable="'content.trust.title'" class="text-3xl font-bold mb-4">{{ store.companyInfo.content?.trust?.title || 'Why Choose Us?' }}</h2>
                 <p v-editable="'content.trust.copy'" class="text-blue-100 text-lg">{{ store.companyInfo.content?.trust?.copy || 'We are dedicated to providing the best service in the industry.' }}</p>
             </div>

             <!-- Certificates -->
             <div v-if="store.certifications && store.certifications.length">
                <h3 class="text-xl font-bold mb-4 text-blue-200 uppercase tracking-wider text-sm">Certificates</h3>
                <div class="flex flex-wrap gap-3">
                   <div v-for="cert in store.certifications" :key="cert" class="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/5">
                     <svg class="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                     <span class="font-medium text-sm">{{ cert }}</span>
                   </div>
                </div>
             </div>

             <!-- Equipment -->
             <div v-if="store.companyInfo.equipment">
                <h3 class="text-xl font-bold mb-4 text-blue-200 uppercase tracking-wider text-sm mt-8">Equipment</h3>
                <p v-editable="'equipment'" class="text-slate-300 text-lg">{{ store.companyInfo.equipment }}</p>
             </div>

             <!-- Uniforms -->
             <div v-if="store.companyInfo.uniforms" class="flex items-center gap-4 bg-green-500/20 px-4 py-3 rounded-xl border border-green-500/30">
               <svg class="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
               <div>
                  <h4 class="font-bold">Professional Uniformed Staff</h4>
                  <p class="text-sm text-green-100">Our team arrives in full uniform, ready to work.</p>
               </div>
             </div>
           </div>

           <div class="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <h3 class="text-xl font-bold mb-6 text-white">Working Hours</h3>
              <div class="flex items-center gap-4 mb-6">
                 <div class="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                    <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                 </div>
                 <div>
                    <p v-editable="'hours'" class="text-2xl font-bold">{{ store.companyInfo.hours || 'Mon-Fri 9am - 5pm' }}</p>
                    <p class="text-slate-400">Available for appointments</p>
                 </div>
              </div>
              <!-- Team Image Update -->
              <div class="relative cursor-pointer" @click="openImageUpdate('team')">
                 <div v-if="isEditing" class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10 rounded-2xl">
                    <span class="text-white font-bold bg-black/50 px-3 py-1 rounded-full border border-white/50">Update Team Image</span>
                 </div>
                 <img :src="store.assets.team" class="w-full rounded-xl object-cover h-48 opacity-80" alt="Team" />
              </div>
           </div>
        </div>
      </section>

      <!-- 5. Free Offers -->
      <section class="py-20 bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-center relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div class="container mx-auto px-6 relative z-10">
          <span class="inline-block py-1 px-3 rounded-full bg-yellow-400 text-yellow-900 font-bold text-xs uppercase tracking-wide mb-6">Limited Time Offer</span>
          <h2 v-editable="'offer.text'" class="text-4xl md:text-5xl font-extrabold mb-4">{{ store.offer.text }}</h2>
          <p v-editable="'offer.subtext'" class="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">{{ store.offer.subtext }}</p>
          <a href="#contact" class="px-10 py-5 bg-white text-blue-700 text-lg font-bold rounded-full shadow-2xl hover:bg-slate-100 transform hover:scale-105 transition-all inline-block">
            Claim This Offer Now
          </a>
          <p class="mt-6 text-sm opacity-60">No credit card required. Free no-obligation quote.</p>
        </div>
      </section>

      <!-- 6. Before and After Pictures (Conditional) -->
      <section v-if="store.companyInfo.showBeforeAfter" id="gallery" class="py-24 bg-slate-50">
        <div class="container mx-auto px-6">
          <div class="text-center mb-16">
            <h2 v-editable="'content.gallery.title'" class="text-3xl font-bold">{{ store.companyInfo.content?.gallery?.title || 'Before and After Pictures' }}</h2>
            <p v-editable="'content.gallery.subtitle'" class="text-slate-500 mt-2">{{ store.companyInfo.content?.gallery?.subtitle || 'See the transformation.' }}</p>
          </div>
          <!-- Single Card Logic: Visual Comparison LOOPED for Services -->
          <div class="space-y-16">
             <div v-for="(service, idx) in store.companyInfo.services" :key="idx" class="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                 <div class="grid md:grid-cols-2 relative group">
                    <!-- Before Side -->
                    <div class="relative h-64 md:h-96 border-r border-white/20 cursor-pointer" @click="openImageUpdate(`${service}_before`)">
                        <div v-if="isEditing" class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10">
                            <span class="text-white font-bold bg-black/50 px-3 py-1 rounded-full border border-white/50">Update Before</span>
                        </div>
                        <span class="absolute top-4 left-4 z-10 bg-black/70 text-white px-4 py-1 rounded-full font-bold text-sm backdrop-blur-sm">BEFORE</span>
                        <!-- Dynamic Service-Specific Assets -->
                        <img :src="store.getServiceImage(service, 'before')" class="w-full h-full object-cover brightness-90" :alt="service + ' Before'" />
                    </div>
                    <!-- After Side -->
                    <div class="relative h-64 md:h-96 cursor-pointer" @click="openImageUpdate(`${service}_after`)">
                        <div v-if="isEditing" class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10">
                            <span class="text-white font-bold bg-black/50 px-3 py-1 rounded-full border border-white/50">Update After</span>
                        </div>
                        <span class="absolute top-4 right-4 z-10 bg-green-500 text-white px-4 py-1 rounded-full font-bold text-sm shadow-lg">AFTER</span>
                        <img :src="store.getServiceImage(service, 'after')" class="w-full h-full object-cover" :alt="service + ' After'" />
                        <div class="absolute inset-0 bg-gradient-to-l from-transparent to-black/10 pointer-events-none"></div>
                    </div>
                    
                    <!-- Center Badge (Visual Merge) -->
                    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-xl z-20 hidden md:block">
                       <svg class="w-8 h-8 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </div>
                 </div>
                 <div class="p-8 text-center bg-white">
                    <h3 class="text-xl font-bold text-slate-900 mb-2">{{ service }} Transformation</h3>
                    <p class="text-slate-500">Professional results for {{ service }}.</p>
                 </div>
             </div>
          </div>
        </div>
      </section>

      <!-- 7. Contact/Lead Generation -->
      <section id="contact" class="py-24 bg-white">
        <div class="container mx-auto px-6">
           <div class="max-w-2xl mx-auto bg-slate-50 rounded-3xl p-8 md:p-12 border border-slate-100 shadow-xl">
             <div class="text-center mb-10">
               <h2 v-editable="'content.contact.title'" class="text-3xl font-bold mb-4">{{ store.companyInfo.content?.contact?.title || 'Ready to get started?' }}</h2>
               <p v-editable="'content.contact.subtitle'" class="text-slate-600">{{ store.companyInfo.content?.contact?.subtitle || 'Fill out the form below.' }}</p>
             </div>
             <form 
               class="space-y-4" 
               :action="`https://formsubmit.co/${store.companyInfo.email || ''}`" 
               method="POST"
             >
               <!-- Hidden Success Redirect: Stay on page (or go to local success) -->
               <!-- Using a computed property or simple JS in template isn't persistent in _value if script isn't reactive to it, 
                    but for this demo, we can just use the current URL -->
               <input type="hidden" name="_next" :value="successRedirectUrl">
               <input type="hidden" name="_captcha" value="false">
               <input type="hidden" name="_subject" :value="`New Lead for ${store.companyInfo.name}`">

               <div class="grid md:grid-cols-2 gap-4">
                 <input type="text" name="name" placeholder="Your Name" required class="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                 <input type="tel" name="phone" placeholder="Phone Number" required class="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
               </div>
               <input type="email" name="email" placeholder="Email Address" required class="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
               <select name="service" class="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-slate-500">
                 <option value="" disabled selected>What service do you need?</option>
                 <option v-for="s in store.companyInfo.services" :key="s" :value="s">{{ s }}</option>
               </select>
               <textarea name="message" rows="3" placeholder="Tell us about your project..." class="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
               <button type="submit" :class="btnColor" class="w-full py-4 rounded-xl text-white font-bold shadow-lg text-lg hover:brightness-110 transition-all">
                 Send Message
               </button>
             </form>
             <p class="text-center text-xs text-slate-400 mt-6">Your information is secure. We never share your data.</p>
           </div>
        </div>
      </section>

       <!-- Footer -->
       <footer class="bg-slate-950 text-slate-400 py-16">
         <div class="container mx-auto px-6 grid md:grid-cols-4 gap-12 text-sm">
           <div class="col-span-1 md:col-span-2 space-y-4">
             <div class="flex items-center gap-2 text-white text-xl font-bold">
               <img :src="store.assets.logo" class="h-8 w-8 object-contain brightness-0 invert" alt="Logo" />
               {{ store.companyInfo.name }}
             </div>
             <p v-editable="'description'" class="max-w-xs">{{ store.companyInfo.description }}</p>
             <div class="flex gap-4 pt-2">
                <!-- Social Icons -->
                <a href="#" class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition">fb</a>
                <a href="#" class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition">in</a>
                <a href="#" class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition">tw</a>
             </div>
           </div>
           <div>
             <h4 class="text-white font-bold mb-4">Company</h4>
             <ul class="space-y-2">
               <li><a href="#" class="hover:text-white transition">About Us</a></li>
               <li><a href="#" class="hover:text-white transition">Careers</a></li>
               <li><a href="#" class="hover:text-white transition">Privacy Policy</a></li>
             </ul>
           </div>
           <div>
             <h4 class="text-white font-bold mb-4">Contact</h4>
             <ul class="space-y-2">
               <li>{{ store.companyInfo.address }}</li>
               <li>
                 <a :href="`tel:${store.companyInfo.phone}`" class="hover:text-white transition">{{ store.companyInfo.phone || '(555) 123-4567' }}</a>
               </li>
               <li>{{ store.companyInfo.email }}</li>
               <li class="pt-2 text-green-400">● Open Now</li>
             </ul>
           </div>
         </div>
         <div class="container mx-auto px-6 pt-12 mt-12 border-t border-slate-900 text-center text-xs">
           &copy; {{ new Date().getFullYear() }} {{ store.companyInfo.name }}. Built with WebCraft SaaS.
         </div>
       </footer>

    </div>
  </div>
</template>
