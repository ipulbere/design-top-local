<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWebsiteStore } from '../stores/website'
import categoriesData from '../data/categories.json'
import { db } from '../services/db'

const router = useRouter()
const store = useWebsiteStore()

const form = ref({
  name: store.companyInfo.name === 'Your Company' ? '' : store.companyInfo.name,
  email: store.companyInfo.email,
  phone: store.companyInfo.phone,
  address: store.companyInfo.address === '123 Main St' ? '' : store.companyInfo.address,
  city: store.companyInfo.city === 'New York' ? '' : store.companyInfo.city,
  zip: store.companyInfo.zip === '10001' ? '' : store.companyInfo.zip,
  category: store.companyInfo.category || categoriesData[0].Category,
  description: store.companyInfo.description === 'We provide professional services for your needs. Quality guaranteed.' ? '' : store.companyInfo.description,
})

const isSubmitting = ref(false)

// Professional Icon mapping (using FontAwesome class names)
function getCategoryIcon(category) {
    const icons = {
        'Independent consultants': 'fa-solid fa-user-tie',
        'Business analysts': 'fa-solid fa-chart-simple',
        'Management advisors': 'fa-solid fa-people-group',
        'Accounting': 'fa-solid fa-calculator',
        'Tax Preparation': 'fa-solid fa-file-invoice-dollar',
        'Bookkeeping': 'fa-solid fa-book',
        'Design studios': 'fa-solid fa-pen-nib',
        'Engineering consultants': 'fa-solid fa-compass-drafting',
        'Plumbers': 'fa-solid fa-faucet',
        'Electrician': 'fa-solid fa-bolt',
        'Electrical services': 'fa-solid fa-plug-circle-bolt',
        'Painters': 'fa-solid fa-palette',
        'HVAC installers, contractors': 'fa-solid fa-fan',
        'Roofers': 'fa-solid fa-house-chimney',
        'Residential remodelers': 'fa-solid fa-hammer',
        'Builders': 'fa-solid fa-trowel-bricks',
        'Local moving services': 'fa-solid fa-truck-ramp-box',
        'Dentist offices': 'fa-solid fa-tooth',
        'Physical therapy clinics': 'fa-solid fa-person-walking-with-cane',
        'Optometry practices': 'fa-solid fa-eye',
        'Social workers': 'fa-solid fa-hand-holding-heart',
        'Family counselors': 'fa-solid fa-house-user',
        'Child day-care services': 'fa-solid fa-baby-carriage',
        'Hair salons': 'fa-solid fa-scissors',
        'Barber shops': 'fa-solid fa-soap', // Using soap as a proxy for shaving cream/barber feel
        'Nail salons': 'fa-solid fa-hand-sparkles',
        'Independent fitness trainers': 'fa-solid fa-dumbbell',
        'Automotive repair shops': 'fa-solid fa-car-wrench',
        'Equipment repair': 'fa-solid fa-screwdriver-wrench',
        'Appliance repair': 'fa-solid fa-blender',
        'Pet Grooming': 'fa-solid fa-paw',
        'Pet boarding': 'fa-solid fa-dog',
        'Pet training services': 'fa-solid fa-bone',
        'Security systems installation': 'fa-solid fa-shield-halved',
        'Real estate agent': 'fa-solid fa-sign-hanging',
        'Dry cleaning': 'fa-solid fa-shirt',
        'Cleaning': 'fa-solid fa-soap',
        'Graphic design': 'fa-solid fa-bezier-curve',
        'T shirt design': 'fa-solid fa-tshirt', // Correct FA class will be checked
        'Air conditioning': 'fa-solid fa-snowflake',
        'Pest control': 'fa-solid fa-bug',
        'Pool cleaning': 'fa-solid fa-water',
        'Glass': 'fa-solid fa-window-maximize',
        'Windows': 'fa-solid fa-window-restore',
        'Landscaping': 'fa-solid fa-leaf',
        'Social services': 'fa-solid fa-people-carry-box',
        'Vending': 'fa-solid fa-box'
    };
    const cleanName = category.replace(/^\d+\.\s+/, '');
    return icons[cleanName] || 'fa-solid fa-briefcase';
}

async function handleSubmit() {
  if (!form.value.name || !form.value.email || !form.value.category) {
      alert('Please fill in the required fields.');
      return;
  }

  isSubmitting.value = true
  
  try {
    // 0. Reset store to ensure a fresh ID and state
    store.resetForNewSite();

    const selectedCat = categoriesData.find(c => c.Category === form.value.category)
    const serviceList = selectedCat ? selectedCat['List of Services'].split(', ') : []

    // 1. Generate Site ID from Phone Number
    const rawPhone = form.value.phone.replace(/\D/g, ''); // Strip all non-digits
    const phone10 = rawPhone.slice(-10); // Take last 10 digits
    
    if (phone10.length < 10) {
        alert('Please enter a valid 10-digit phone number.');
        isSubmitting.value = false;
        return;
    }

    let siteId = phone10;
    const suffixes = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g'];
    let foundUnique = false;

    for (const suffix of suffixes) {
        const potentialId = phone10 + suffix;
        const exists = await db.checkIdExists(potentialId);
        if (!exists) {
            siteId = potentialId;
            foundUnique = true;
            break;
        }
    }

    if (!foundUnique) {
        siteId = phone10 + Math.random().toString(36).substring(2, 5);
    }

    // 2. Update store with basic info and generated ID
    store.updateCompanyInfo({
      ...form.value,
      id: siteId, // Set the ID explicitly
      category: selectedCat.Category.replace(/^\d+\.\s+/, ''), 
      style: selectedCat['Website Style'],
      colors: {
          bg: 'bg-white',
          text: 'text-slate-900',
          btn: 'bg-blue-600',
          nav: 'bg-white'
      },
      raw_category_data: selectedCat,
      services: serviceList,
      certificates: selectedCat['Certificates'],
      offer: { text: selectedCat['Free Offers'], subtext: 'Contact us today' },
      equipment: selectedCat['Equipment'],
      uniforms: selectedCat['Uniforms'] === 'Yes',
      hours: selectedCat['Working Hours'],
      showBeforeAfter: selectedCat['Before and After Pictures'] !== 'No',
      content: selectedCat.content
    }, false) // false = not from DB load, trigger generation

    // 2. Fetch template (populates store.companyInfo.rawHTML)
    await store.fetchTemplate(selectedCat.Category.replace(/^\d+\.\s+/, ''));
    
    // 3. Save to Supabase to get unique ID
    await db.saveSite(store.companyInfo.value || store.companyInfo);
    console.log('[InputView] Site saved with ID:', siteId);
    
    await new Promise(resolve => setTimeout(resolve, 800))
    router.push(`/site/${siteId}`)
  } catch (error) {
    console.error('Submission failed:', error)
    alert('Something went wrong: ' + error.message)
    isSubmitting.value = false
  }
}

const selectCategory = (cat) => {
    form.value.category = cat;
    
    // Smooth scroll to form details
    setTimeout(() => {
        const element = document.getElementById('details-section');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
};
</script>

<template>
  <div class="min-h-screen bg-slate-950 font-sans text-white selection:bg-blue-500/30">
    <!-- Background Gradient -->
    <div class="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 -z-10 pointer-events-none"></div>
    <div class="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
    <div class="fixed bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

    <!-- Header/Logo -->
    <header class="py-6 px-6 border-b border-white/10 sticky top-0 bg-slate-950/50 backdrop-blur-xl z-50">
        <div class="container mx-auto flex justify-between items-center">
            <div class="flex items-center gap-2">
                <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">T</div>
                <span class="text-xl font-black tracking-tighter">top-local<span class="text-blue-500">.net</span></span>
            </div>
            <div class="hidden md:flex gap-8 text-xs font-bold uppercase tracking-widest text-slate-400">
                <a href="#" class="hover:text-blue-400 transition-colors">How it works</a>
                <a href="#" class="hover:text-blue-400 transition-colors">Pricing</a>
                <a href="#" class="hover:text-blue-400 transition-colors">Support</a>
            </div>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="pt-20 pb-16 px-6">
        <div class="container mx-auto max-w-4xl text-center">
            <div class="inline-block px-4 py-1.5 mb-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">AI Design Intelligence</div>
            <h1 class="text-5xl md:text-8xl font-black tracking-tight leading-[0.9] mb-8">
                Build Your Elite<br>
                <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-500">Local Presence</span> 
            </h1>
            <p class="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
                High-converting websites optimized for local growth. Powered by design intelligence.
            </p>
        </div>
    </section>

    <!-- Main Content -->
    <main class="container mx-auto max-w-6xl px-6 pb-32">
        <div class="space-y-20">
            
            <!-- Category Selection -->
            <div class="space-y-8">
                <div class="text-center md:text-left">
                    <h2 class="text-2xl font-black mb-2 flex items-center gap-3">
                        <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white text-xs">1</span>
                        Pick Your Category
                    </h2>
                    <p class="text-slate-500 font-medium">Select your service area to generate tailored design systems.</p>
                </div>
                
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <button 
                        v-for="cat in categoriesData" 
                        :key="cat.Category"
                        @click="selectCategory(cat.Category)"
                        :class="[
                            'group relative p-8 rounded-[2rem] border transition-all duration-500 overflow-hidden flex flex-col items-center gap-4 text-center',
                            form.category === cat.Category 
                                ? 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_40px_-15px_rgba(59,130,246,0.5)] scale-[1.03]' 
                                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'
                        ]"
                    >
                        <!-- Animated background for active state -->
                        <div v-if="form.category === cat.Category" class="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 animate-pulse"></div>
                        
                        <!-- Icon -->
                        <div 
                            :class="[
                                'relative w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-2xl transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-1',
                                form.category === cat.Category ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-blue-400'
                            ]"
                        >
                            <i :class="getCategoryIcon(cat.Category)"></i>
                        </div>

                        <!-- Label -->
                        <div 
                            :class="[
                                'relative font-bold text-sm tracking-tight transition-colors duration-300',
                                form.category === cat.Category ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                            ]"
                        >
                            {{ cat.Category.replace(/^\d+\.\s+/, '') }}
                        </div>

                        <!-- Active Indicator -->
                        <div v-if="form.category === cat.Category" class="absolute top-4 right-4 animate-in fade-in zoom-in duration-300">
                            <div class="bg-blue-500 text-white rounded-full p-1.5 shadow-lg shadow-blue-500/50">
                                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            <!-- Form Details -->
            <div id="details-section" class="max-w-4xl mx-auto w-full scroll-mt-32">
                <div class="text-center mb-12">
                    <h2 class="text-2xl font-black mb-2 flex items-center justify-center gap-3">
                        <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white text-xs">2</span>
                        Business Details
                    </h2>
                    <p class="text-slate-500 font-medium">Configure your contact points and brand voice.</p>
                </div>

                <form @submit.prevent="handleSubmit" class="relative group p-[1px] rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent">
                    <div class="bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-12 space-y-10">
                        <div class="grid md:grid-cols-2 gap-x-10 gap-y-8">
                            <div class="space-y-3">
                                <label class="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Company Name</label>
                                <input 
                                    v-model="form.name" 
                                    type="text" 
                                    required 
                                    class="w-full px-6 py-5 bg-white/5 border border-white/5 focus:border-blue-500/50 focus:bg-blue-500/5 rounded-2xl outline-none transition-all duration-300 font-semibold text-white placeholder:text-slate-600" 
                                    placeholder="Elite Painters & Co." 
                                />
                            </div>
                            <div class="space-y-3">
                                <label class="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
                                <input 
                                    v-model="form.email" 
                                    type="email" 
                                    required 
                                    class="w-full px-6 py-5 bg-white/5 border border-white/5 focus:border-blue-500/50 focus:bg-blue-500/5 rounded-2xl outline-none transition-all duration-300 font-semibold text-white placeholder:text-slate-600" 
                                    placeholder="contact@elitepainters.com" 
                                />
                            </div>
                            <div class="space-y-3">
                                <label class="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Phone Number</label>
                                <input 
                                    v-model="form.phone" 
                                    type="tel" 
                                    required 
                                    class="w-full px-6 py-5 bg-white/5 border border-white/5 focus:border-blue-500/50 focus:bg-blue-500/5 rounded-2xl outline-none transition-all duration-300 font-semibold text-white placeholder:text-slate-600" 
                                    placeholder="(555) 000-0000" 
                                />
                            </div>
                            <div class="space-y-3">
                                <label class="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Business Address</label>
                                <input 
                                    v-model="form.address" 
                                    type="text" 
                                    class="w-full px-6 py-5 bg-white/5 border border-white/5 focus:border-blue-500/50 focus:bg-blue-500/5 rounded-2xl outline-none transition-all duration-300 font-semibold text-white placeholder:text-slate-600" 
                                    placeholder="123 Success Ave" 
                                />
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-3">
                                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">City</label>
                                    <input 
                                        v-model="form.city" 
                                        type="text" 
                                        required
                                        class="w-full px-6 py-5 bg-white/5 border border-white/5 focus:border-blue-500/50 focus:bg-blue-500/5 rounded-2xl outline-none transition-all duration-300 font-semibold text-white placeholder:text-slate-600" 
                                        placeholder="New York" 
                                    />
                                </div>
                                <div class="space-y-3">
                                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Zip Code</label>
                                    <input 
                                        v-model="form.zip" 
                                        type="text" 
                                        required
                                        class="w-full px-6 py-5 bg-white/5 border border-white/5 focus:border-blue-500/50 focus:bg-blue-500/5 rounded-2xl outline-none transition-all duration-300 font-semibold text-white placeholder:text-slate-600" 
                                        placeholder="10001" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div class="space-y-3">
                            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Description & Voice</label>
                            <textarea 
                                v-model="form.description" 
                                rows="4" 
                                class="w-full px-6 py-5 bg-white/5 border border-white/5 focus:border-blue-500/50 focus:bg-blue-500/5 rounded-2xl outline-none transition-all duration-300 font-semibold text-white placeholder:text-slate-600 resize-none" 
                                placeholder="What makes your local business stand out? We'll use this to train the design AI."
                            ></textarea>
                        </div>

                        <div class="pt-6">
                            <button 
                                type="submit" 
                                :disabled="isSubmitting" 
                                class="group relative w-full p-[2px] rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
                            >
                                <div class="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 animate-gradient-x"></div>
                                <div class="relative bg-slate-950 py-6 rounded-2xl flex items-center justify-center gap-4 transition-all group-hover:bg-transparent">
                                    <span v-if="isSubmitting" class="animate-spin">
                                        <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    </span>
                                    <span class="text-lg font-black tracking-widest uppercase">{{ isSubmitting ? 'Optimizing Architecture...' : 'Initialize Website' }}</span>
                                    <i v-if="!isSubmitting" class="fa-solid fa-arrow-right-long group-hover:translate-x-1 transition-transform"></i>
                                </div>
                            </button>
                            <p class="text-center text-slate-600 text-[10px] mt-8 uppercase tracking-[0.3em] font-black">Design Intelligence System Ready</p>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="py-12 border-t border-white/5">
        <div class="container mx-auto px-6 text-center text-slate-600 text-xs font-bold uppercase tracking-widest">
            &copy; 2026 top-local.net &bull; Built with Design Intelligence
        </div>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');

:deep(body) {
    font-family: 'Inter', sans-serif;
}

.animate-gradient-x {
    background-size: 200% 200%;
    animation: gradient-x 15s ease infinite;
}

@keyframes gradient-x {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}

button:disabled {
    cursor: not-allowed;
    opacity: 0.8;
}
</style>
