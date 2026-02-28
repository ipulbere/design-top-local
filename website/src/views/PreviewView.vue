<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWebsiteStore } from '../stores/website'

import { db } from '../services/db'
import EditorPanel from '../components/EditorPanel.vue'
import { EditModeScript } from '../services/EditModeScript'

const router = useRouter()
const route = useRoute()
const store = useWebsiteStore()

// Load from DB if ID exists
onMounted(async () => {
  // ULTRA-STRICT PERSISTENCE CHECK
  if (window.location.pathname.startsWith('/site/')) {
      const id = route.params.id || window.location.pathname.split('/site/')[1];
      
      if (id) {
          const savedSite = await db.getSite(id);
          if (savedSite) {
              store.updateCompanyInfo(savedSite, true);
          } else {
              notFound.value = true;
          }
      } else {
          notFound.value = true;
      }
      return;
  }

  // LOGIC FOR NEW SITES (via /preview)
  if (!store.companyInfo.name || store.companyInfo.name === 'Your Company') {
      router.push('/')
  } else {
      // New site (from InputView), fetching AI template if not present
      if (!store.companyInfo.rawHTML && store.companyInfo.category) {
          store.fetchTemplate(store.companyInfo.category);
      }
  }
})

// Watcher removed to prevent auto-regeneration on load. 
// Initial generation is handled by onMounted checks.



const isEditing = ref(false)
const notFound = ref(false)

function syncEditModeWithIframe() {
  const frame = document.querySelector('.dynamic-template-frame');
  if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ type: 'toggle-edit', enabled: isEditing.value }, '*');
  }
}

function toggleEdit() {
  isEditing.value = !isEditing.value
  syncEditModeWithIframe()
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

function handlePublish() {
  if (!store.companyInfo.rawHTML) {
    alert("No website content to publish yet!");
    return;
  }
  // Navigate to success page with a test flag and the chosen subdomain
  router.push({ 
    path: '/success', 
    query: { 
      test: 'true',
      subdomain: store.companyInfo.subdomain || store.companyInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    } 
  })
}

function handleClearSession() {
  if (confirm("Clear all current website data and start over?")) {
    store.clearSession();
  }
}

// Dynamic Theme Colors (fallbacks if category data missing)
const themeColor = store.companyInfo.colors?.accent || 'text-blue-600'
const btnColor = store.companyInfo.colors?.btn || 'bg-blue-600 hover:bg-blue-700'
const bgColor = store.companyInfo.colors?.bg || 'bg-slate-50'

const originUrl = ref(window.location.origin + '/success') // Redirect to existing success/payment view for demo purposes
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
const suggestedImages = ref([])
const showSuccessToast = ref(false)

function openImageUpdate(pathOrSrc) {
    if (!isEditing.value) return;
    
    // determine section from path or src keywords
    let section = 'hero';
    const lower = pathOrSrc.toLowerCase();
    
    if (lower.includes('team') || lower.includes('staff') || lower.includes('work')) section = 'team_at_work';
    else if (lower.includes('before') || lower.includes('after') || lower.includes('project')) section = 'before_and_after';
    else if (lower.includes('customer') || lower.includes('testimonial') || lower.includes('happy')) section = 'before_and_after'; // fallback map
    else if (lower.includes('hero') || lower.includes('main')) section = 'hero';

    pendingImagePath.value = pathOrSrc;
    
    // Get alternative images from store library
    const library = store.companyInfo.images?.library || {};
    
    // Exact match for library keys (Hero, team_at_work, before_and_after)
    let libraryKey = section; 
    if (section === 'hero') libraryKey = 'Hero'; // Match JSON key case
    
    suggestedImages.value = library[libraryKey] || [];
    
    showImageModal.value = true;
}

const isSaving = ref(false)

async function saveChanges() {
    if (route.params.id) {
        isSaving.value = true;
        const result = await db.updateSite(route.params.id, store.companyInfo);
        isSaving.value = false;
    }
}

function handleImageSelect(url) {
    store.updateImage(pendingImagePath.value, url, true); // true = direct URL
    showImageModal.value = false;
    setTimeout(saveChanges, 100);
}

function handleImageUpdate() {
   if (!imagePrompt.value) return;
   store.updateImage(pendingImagePath.value, imagePrompt.value);
   showImageModal.value = false;
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

// Computed HTML with injected functionality
import { computed } from 'vue'

const processedHTML = computed(() => {
    let html = store.companyInfo.rawHTML || '';
    if (!html) return '';

    // 1. Inject FormTarget to break out of iframe
    if (html.includes('<form')) {
        // Add target="_top" if not present
        if (!html.includes('target=')) {
            html = html.replace('<form', '<form target="_top"');
        }
    }

    // 2. Inject FormSubmit configuration
    if (html.includes('</form>')) {
        console.log('[Preview] Injecting FormSubmit hidden fields...');
        const currentPath = window.location.origin + window.location.pathname;
        const nextUrl = `${currentPath}?success=true`;
        
        const hiddenFields = `
            <input type="hidden" name="_next" value="${nextUrl}">
            <input type="hidden" name="_subject" value="New Lead from Website (${store.companyInfo.name || 'Client'})">
            <input type="hidden" name="_captcha" value="false">
            <input type="text" name="_honey" style="display:none">
        `;
        
        html = html.replace('</form>', `${hiddenFields}</form>`);
    } else {
        console.warn('[Preview] </form> tag not found. FormSubmit injection failed.');
    }

    // 3. Inject Edit Mode Script
    const scriptTag = `<script>${EditModeScript}<\/script>`;
    html = html.replace('</body>', `${scriptTag}</body>`);

    return html;
});

// Message Listener from Iframe
onMounted(() => {
    window.addEventListener('message', (event) => {
        if (event.data.type === 'text-updated') {
            console.log('[Preview] Text update received:', event.data.data);
            // We could try to map this back to store, but for now simple innerText update is hard 
            // without unique IDs. We'll rely on the user manually saving or visual feedback.
        }
        if (event.data.type === 'image-click') {
            openImageUpdate(event.data.data.src);
        }
    });
});
</script>

<template>
  <div class="min-h-screen relative pb-20">
    <!-- NEW Unified Toolbar -->
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-xl text-white px-3 py-3 rounded-2xl shadow-2xl flex items-center gap-4 transition-all hover:shadow-blue-500/20 border border-white/10">
      
      <div class="flex items-center gap-2 px-2">
        <div :class="isEditing ? 'bg-green-500' : 'bg-slate-600'" class="w-2 h-2 rounded-full animate-pulse"></div>
        <span class="text-xs font-bold uppercase tracking-wider opacity-70">{{ isEditing ? 'Edit Mode' : 'Preview' }}</span>
      </div>

      <div class="h-6 w-px bg-white/10"></div>

      <button @click="toggleEdit" :class="isEditing ? 'bg-blue-600 shadow-lg shadow-blue-600/40 text-white' : 'hover:bg-white/10 text-slate-300'" class="px-6 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center gap-3">
        <svg v-if="!isEditing" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        {{ isEditing ? 'Exit & Save' : 'Edit Website' }}
      </button>
      
      <div class="h-6 w-px bg-white/10"></div>

      <button @click="handleShare" class="p-2.5 hover:bg-white/10 rounded-xl transition-all group" title="Share Preview">
         <svg class="w-5 h-5 text-slate-300 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
      </button>
      
      <button @click="handleApprove" class="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all">
        Next: Finalize
      </button>

      <div class="h-6 w-px bg-white/10"></div>

      <button @click="handlePublish" class="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 active:scale-95 rounded-xl font-bold text-sm shadow-xl shadow-blue-500/20 transition-all flex items-center gap-2">
        <i class="fa-solid fa-rocket"></i>
        Go Live
      </button>

      <button @click="handleClearSession" title="Delete & Reset" class="p-2.5 hover:bg-red-500/20 text-red-500 rounded-xl transition-all">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>

    <!-- Browser Style Domain Bar -->
    <div class="bg-slate-100 border-b border-slate-200 p-3 flex items-center gap-4 shadow-sm relative z-40">
        <div class="flex gap-1.5 ml-2">
            <div class="w-3 h-3 rounded-full bg-slate-300"></div>
            <div class="w-3 h-3 rounded-full bg-slate-300"></div>
            <div class="w-3 h-3 rounded-full bg-slate-300"></div>
        </div>
        <div class="flex-1 max-w-2xl mx-auto flex items-center bg-white border border-slate-300 rounded-lg px-4 py-1.5 gap-3 group">
            <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path></svg>
            <span class="text-slate-400 text-sm select-none">https://</span>
            <input 
                v-model="store.companyInfo.subdomain" 
                class="flex-1 bg-transparent border-none outline-none text-slate-700 text-sm font-medium"
                placeholder="choose-your-address"
            />
            <span class="text-slate-400 text-sm">.top-local.net</span>
            <div class="w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </div>
        </div>
        <div class="w-20"></div> <!-- spacer -->
    </div>

    <EditorPanel 
        :show="showEditorPanel" 
        @close="showEditorPanel = false" 
        @update="handleFormUpdate"
    />

    <!-- Image Update Modal -->
    <div v-if="showImageModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div class="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div class="flex justify-between items-start mb-6">
                <div>
                    <h3 class="text-2xl font-bold">Swap Image</h3>
                    <p class="text-slate-500">Pick from our library or generate a new one.</p>
                </div>
                <button @click="showImageModal = false" class="text-slate-400 hover:text-slate-600"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>

            <!-- Library Suggestions -->
            <div v-if="suggestedImages.length > 0" class="mb-8">
                <h4 class="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">From Library</h4>
                <div class="grid grid-cols-3 gap-3 overflow-y-auto max-h-64 pr-2">
                    <div 
                        v-for="url in suggestedImages" 
                        :key="url"
                        @click="handleImageSelect(url)"
                        class="aspect-square rounded-xl overflow-hidden cursor-pointer hover:ring-4 ring-blue-500 transition-all relative group"
                    >
                        <img :src="url" class="w-full h-full object-cover" />
                        <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span class="bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-bold shadow-lg">Select</span>
                        </div>
                    </div>
                </div>
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
           :srcdoc="processedHTML"
           class="w-full h-screen border-0 dynamic-template-frame"
           sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-top-navigation allow-popups"
           title="Website Preview"
           @load="syncEditModeWithIframe"
      ></iframe>

      <!-- ERROR STATE -->
      <div v-else-if="store.companyInfo.templateSource === 'error'" class="min-h-screen flex flex-col items-center justify-center p-8 bg-red-50">
          <h2 class="text-2xl font-bold text-red-600 mb-4">Generation Failed</h2>
          <div v-html="store.companyInfo.rawHTML" class="text-center text-red-800"></div>
          <button @click="router.go(0)" class="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Try Again</button>
      </div>

      <!-- NOT FOUND STATE -->
      <div v-else-if="notFound" class="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
          <h2 class="text-3xl font-bold text-slate-900 mb-4">Website Not Found</h2>
          <p class="text-slate-600 mb-8 max-w-md">The website you are looking for does not exist or has expired.</p>
          
          <a href="https://design.top-local.net" class="px-8 py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition shadow-lg">
              Create a New Website
          </a>
          <p class="mt-4 text-sm text-slate-400">Powered by design.top-local.net</p>
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
