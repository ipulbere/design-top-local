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
      // If the saved site doesn't have an AI template yet (legacy or fresh create), fetch it now
      if (!store.companyInfo.rawHTML && store.companyInfo.category) {
         store.fetchTemplate(store.companyInfo.category);
      }
    } else {
      // Site not found or expired
      alert('Site not found or expired (30-day limit)')
      router.push('/')
    }
  } else if (!store.companyInfo.name || store.companyInfo.name === 'Your Company') {
      router.push('/')
  } else {
      // New site (from InputView), fetching AI template if not present
      if (!store.companyInfo.rawHTML && store.companyInfo.category) {
          store.fetchTemplate(store.companyInfo.category);
      }
  }
})

// Watch for category changes to re-fetch
import { watch } from 'vue'
watch(() => store.companyInfo.category, (newCat) => {
    if (newCat) store.fetchTemplate(newCat);
});

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
    <!-- Generated Website Container -->
    <div class="bg-white font-sans text-slate-900">
      
      <!-- LOADING STATE -->
      <div v-if="store.companyInfo.templateSource === 'loading'" class="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
          <div class="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mb-6"></div>
          <h2 class="text-2xl font-bold text-slate-800">Designing Your Unique Site...</h2>
          <p class="text-slate-500 mt-2">Our AI is crafting a bespoke template for {{ store.companyInfo.category }}.</p>
      </div>

      <!-- DYNAMIC AI TEMPLATE -->
      <iframe 
           v-else-if="store.companyInfo.rawHTML" 
           :srcdoc="store.companyInfo.rawHTML"
           class="w-full h-screen border-0 dynamic-template-frame"
           sandbox="allow-scripts allow-same-origin allow-modals"
           title="Website Preview"
      ></iframe>

      <!-- ERROR STATE -->
      <div v-else-if="store.companyInfo.templateSource === 'error'" class="min-h-screen flex flex-col items-center justify-center p-8 bg-red-50">
          <h2 class="text-2xl font-bold text-red-600 mb-4">Generation Failed</h2>
          <div v-html="store.companyInfo.rawHTML" class="text-center text-red-800"></div>
          <button @click="router.go(0)" class="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Try Again</button>
      </div>

      <!-- NO CONTENT STATE (Fallback removed as requested) -->
      <div v-else class="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 text-slate-500">
          <p>No website content generated yet.</p>
          <button @click="store.fetchTemplate(store.companyInfo.category)" class="mt-4 text-blue-600 hover:underline">Generate Now</button>
      </div>

      <!-- FALLBACK REMOVED -->
      <!-- 
      <div v-else> ... </div> 
      -->
      
      <!-- 
        STATIC FALLBACK TEMPLATE REMOVED AS REQUESTED 
        (Previously contained Navbar, Hero, Services, etc.)
      -->

    </div>
  </div>
</template>
