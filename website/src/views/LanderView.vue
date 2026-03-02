<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWebsiteStore } from '../stores/website'

const router = useRouter()
const route = useRoute()
const store = useWebsiteStore()

// --- Pricing Logic ---
const billingCycle = ref('monthly') // 'monthly' or 'annual'

// --- Countdown Timer Logic ---
const hours = ref(1)
const minutes = ref(39)
const seconds = ref(11)
let timer = null

onMounted(() => {
    // Load Stripe SDK
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    document.head.appendChild(script);

    // Timer
    timer = setInterval(() => {
        if (seconds.value > 0) {
            seconds.value--
        } else if (minutes.value > 0) {
            minutes.value--
            seconds.value = 59
        } else if (hours.value > 0) {
            hours.value--
            minutes.value = 59
            seconds.value = 59
        } else {
            hours.value = 0
            minutes.value = 15
            seconds.value = 0
        }
    }, 1000)
    
    // Redirect if direct access without data
    if ((!store.companyInfo.name || store.companyInfo.name === 'Your Company') && !route.query.id) {
         router.push('/')
    }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const isProcessing = ref(false);
const PAYMENT_LINKS = {
    monthly: 'https://buy.stripe.com/test_5kQ4gt4O83I3grE35adQQ05',
    annual: 'https://buy.stripe.com/test_fZubIV94o4M7a3g6hmdQQ04'
};

function handleStripeCheckout() {
    isProcessing.value = true;
    const planType = billingCycle.value;
    const orderId = store.siteId || route.query.id || 'demo_site_id';
    const email = store.companyInfo.email || ''; 

    const baseUrl = PAYMENT_LINKS[planType];
    const url = new URL(baseUrl);
    url.searchParams.append('client_reference_id', orderId);
    if (email) {
        url.searchParams.append('prefilled_email', email);
    }
    
    window.location.href = url.toString();
}

const faqs = [
    { q: "How long until my site is live?", a: "Go live in 5 minutes after secure payment. Your site is already approved and waiting for activation." },
    { q: "Do you handle content and photos?", a: "Yes! We guide you through the process or add professional stock shots, all included in your plan." },
    { q: "Is the site mobile-friendly?", a: "100%. Your site is built to rank higher in local searches and look perfect on every device." },
    { q: "What if I need to cancel?", a: "No penalties and no contracts. Your site stays live until the end of your paid period, and you can cancel anytime." },
    { q: "Can I make more changes later?", a: "Absolutely. Unlimited AI-assisted edits are included, so your site can grow with your business." }
];

const testimonials = [
    { name: "John D.", role: "Local Plumber", text: "My site went live in minutes. I started getting calls from Google the very next day!", img: "https://i.pravatar.cc/150?u=john" },
    { name: "Sarah L.", role: "Real Estate Agent", text: "The AI design was spot on. I didn't have to change a thing before launching.", img: "https://i.pravatar.cc/150?u=sarah" },
    { name: "Mike R.", role: "Cafe Owner", text: "35% increase in leads in the first 2 months. Best investment for my business.", img: "https://i.pravatar.cc/150?u=mike" }
];
</script>

<template>
  <div class="min-h-screen bg-white font-sans text-slate-900 pb-20 selection:bg-blue-100">
    
    <!-- Simplified Nav -->
    <nav class="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div class="container mx-auto max-w-6xl px-6 py-4 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">T</div>
                <span class="font-bold text-xl tracking-tight text-slate-800">top-local</span>
            </div>
            <div class="hidden md:flex items-center gap-4">
                <span class="text-sm font-medium text-slate-500">Secure Checkout</span>
                <div class="flex gap-1">
                    <div class="w-5 h-3 bg-slate-200 rounded-sm"></div>
                    <div class="w-5 h-3 bg-slate-200 rounded-sm"></div>
                    <div class="w-5 h-3 bg-slate-200 rounded-sm"></div>
                </div>
            </div>
        </div>
    </nav>

    <main class="container mx-auto max-w-6xl px-6">
        
        <!-- Hero Section -->
        <section class="pt-12 md:pt-20 pb-16 border-b border-slate-100">
            <div class="grid lg:grid-cols-2 gap-12 items-center">
                <div class="text-left">
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-bold mb-6 border border-green-100">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                        Design Approved & Ready
                    </div>
                    <h1 class="text-4xl md:text-6xl font-black text-slate-900 leading-[1.1] mb-6">
                        <div class="text-blue-600 mb-2">{{ store.companyInfo.name }}</div>
                        <div class="mb-2">Your Custom Website Is Ready</div>
                        <div class="text-[#10b981] drop-shadow-sm">Go Live Today!</div>
                    </h1>
                    <p class="text-xl text-slate-600 leading-relaxed mb-8 max-w-xl">
                        Just activate hosting, maintenance & local SEO optimization now. Get <strong>30-40% more local calls</strong> starting immediately — live in 5 minutes after payment.
                    </p>
                    
                    <div class="flex flex-col gap-4 mb-8">
                        <button @click="handleStripeCheckout" class="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-blue-600 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95">
                            Pay Securely & Go Live in 5 Min
                            <svg class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                        </button>
                        <div class="flex items-center gap-4 text-xs font-semibold text-slate-400 uppercase tracking-widest pl-2">
                            <span class="flex items-center gap-1"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 006 0z" clip-rule="evenodd"></path></svg> Secure 256-bit SSL</span>
                            <span class="flex items-center gap-1"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg> Cancel Anytime</span>
                        </div>
                    </div>
                </div>

                <!-- Mockup Area -->
                <div class="relative">
                    <!-- Browser Bar Mockup -->
                    <div class="bg-slate-200 rounded-t-2xl p-3 flex items-center gap-3 border-x border-t border-slate-300 shadow-sm relative z-10">
                        <div class="flex gap-1.5">
                            <div class="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                            <div class="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                            <div class="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                        </div>
                        <div class="bg-white rounded-lg px-4 py-1 flex-grow text-[10px] font-medium text-slate-900 border border-slate-200 shadow-inner flex items-center gap-2">
                            <svg class="w-3 h-3 text-slate-300" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 006 0z" clip-rule="evenodd"></path></svg>
                            {{ store.companyInfo.subdomain || 'your-business' }}.top-local.net
                        </div>
                    </div>
                    
                    <div class="bg-slate-100 rounded-b-3xl p-4 shadow-inner relative overflow-hidden group border-x border-b border-slate-300">
                        <div class="aspect-video bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 relative">
                            <!-- Simulated Website Header -->
                            <div class="p-4 border-b border-slate-50 flex justify-end items-center bg-white">
                                <div class="flex gap-2">
                                    <div class="w-8 h-1 bg-slate-100 rounded"></div>
                                    <div class="w-8 h-1 bg-slate-100 rounded"></div>
                                </div>
                            </div>
                            <!-- Hero Mockup (Text Based Preview per User Request) -->
                            <div class="px-6 pt-0 pb-8 -mt-5 h-full flex flex-col justify-start text-left relative z-10">
                                <!-- Minipill -->
                                <div class="inline-block px-3 py-1 mb-4 rounded-full bg-blue-50 text-blue-600 text-[8px] font-bold border border-blue-100 w-fit">
                                    Top-Rated {{ store.companyInfo.category || 'Services' }} in {{ store.companyInfo.city || 'Willowbrook' }}, {{ store.companyInfo.zip || '60527' }}
                                </div>
                                <!-- Heading -->
                                <h1 class="text-2xl font-black text-slate-900 leading-tight mb-4 tracking-tight">
                                    Expert {{ store.companyInfo.category || 'Professional' }} Services <br>
                                    for <span class="text-blue-600">Peace of Mind</span>
                                </h1>
                                <!-- Subtext -->
                                <p class="text-[9px] text-slate-500 leading-relaxed max-w-[280px]">
                                    Licensed {{ store.companyInfo.category?.toLowerCase() || 'professional' }} services for your area. Whether you're in {{ store.companyInfo.city || 'your local community' }} or anywhere across the US remotely, we handle everything with precision and care.
                                </p>
                            </div>
                            
                            
                            <!-- Static Stamp -->
                            <div class="absolute top-[calc(60%+30px)] right-4 -translate-y-1/2 -rotate-6 pointer-events-none z-30">
                                <div class="border-2 border-green-500 text-green-500 text-lg font-black px-3 py-1 rounded-lg uppercase tracking-wider opacity-90 shadow-xl bg-white/90 backdrop-blur-sm flex items-center gap-2">
                                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                                    Design Complete
                                </div>
                            </div>
                        </div>
                        
                        <!-- Badge repositioned to avoid clipping -->
                        <div class="absolute left-2 bottom-8 bg-white rounded-2xl p-4 shadow-2xl border border-slate-100 flex items-center gap-3 animate-bounce z-20">
                            <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.95a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM6.464 14.95l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 111.414 1.414z"></path></svg>
                            </div>
                            <div>
                                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Live in</div>
                                <div class="text-lg font-black text-slate-900 leading-none">5 Minutes</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>


        <!-- Urgency Banner -->
        <section class="py-8">
            <div class="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
                <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full filter blur-[100px] opacity-20"></div>
                <div class="relative z-10 text-center md:text-left">
                    <div class="inline-block px-3 py-1 bg-red-500 text-white text-[10px] font-black rounded-full uppercase tracking-widest mb-3">Limited Offer</div>
                    <h3 class="text-white font-black text-2xl mb-1 italic">Launch Special: Lock in $54/mo</h3>
                    <p class="text-blue-200 font-bold">Save $119/yr – Special activation offer ends in 48 hours</p>
                </div>
                <div class="flex items-center gap-4 relative z-10 px-6 py-3 bg-white/10 backdrop-blur rounded-2xl border border-white/10">
                    <div class="text-white">
                        <div class="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Pricing Locked</div>
                        <div class="text-xl font-black italic">Go Live ✓</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Value Stack Section -->
        <section class="py-20">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-5xl font-black text-slate-900 mb-4">Total Value Delivered</h2>
                <p class="text-slate-500 font-medium">Everything you need for a dominant local presence.</p>
            </div>
            
            <div class="grid lg:grid-cols-3 gap-8 items-start">
                <div class="lg:col-span-2 space-y-4">
                    <div v-for="item in [
                        { label: 'AI Design & Strategy', val: '$500', sub: 'Custom layout, copy & SEO architecture', color: 'bg-indigo-50 border-indigo-100 hover:border-indigo-300' },
                        { label: 'Premium Local Hosting', val: '$200', sub: '99.9% uptime & lightning fast speeds', color: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300' },
                        { label: 'Local SEO Infrastructure', val: '$300', sub: 'Built to rank for 30-40% more calls', color: 'bg-amber-50 border-amber-100 hover:border-amber-300' }
                    ]" :key="item.label" :class="item.color" class="border rounded-2xl p-6 flex justify-between items-center group transition-all hover:shadow-md cursor-default">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <div class="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-600">
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                                </div>
                                <h4 class="font-black text-slate-800 tracking-tight">{{ item.label }}</h4>
                            </div>
                            <p class="text-sm text-slate-500 pl-8 font-medium italic opacity-80">{{ item.sub }}</p>
                        </div>
                        <span class="text-slate-800 font-black tracking-tighter text-lg">{{ item.val }} <span class="text-[10px] text-slate-400 uppercase font-bold">Value</span></span>
                    </div>
                    
                    <div class="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl shadow-blue-100">
                        <div>
                            <div class="text-blue-200 text-sm font-bold uppercase tracking-widest mb-1">Already Completed</div>
                            <div class="text-2xl font-black">Total Value Delivered: $1,000+</div>
                        </div>
                        <div class="text-center md:text-right">
                            <div class="text-sm font-medium opacity-80 mb-1">Your Price Today:</div>
                            <div class="text-4xl font-black">$54<span class="text-lg opacity-60">/mo</span></div>
                        </div>
                    </div>
                </div>

                <!-- Pricing Card -->
                <div class="bg-white border-2 border-slate-900 rounded-3xl p-8 shadow-2xl relative lg:-mt-10">
                    <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                        Most Popular
                    </div>
                    
                    <!-- Toggle -->
                    <div class="flex p-1 bg-slate-100 rounded-xl mb-8">
                        <button 
                            @click="billingCycle = 'monthly'" 
                            :class="billingCycle === 'monthly' ? 'bg-[#f59e0b] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'"
                            class="flex-1 py-2.5 text-xs font-bold rounded-lg transition-all"
                        >Monthly</button>
                        <button 
                            @click="billingCycle = 'annual'" 
                            :class="billingCycle === 'annual' ? 'bg-[#10b981] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'"
                            class="flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1"
                        >Annual <span :class="billingCycle === 'monthly' ? 'bg-[#39FF14] text-slate-900 animate-pulse' : 'bg-white/20 text-white'" class="text-[9px] px-1 rounded">-19%</span></button>
                    </div>

                    <div class="text-center mb-8">
                        <div class="text-5xl font-black text-slate-900 mb-2">
                            {{ billingCycle === 'annual' ? '$529' : '$54' }}
                            <span class="text-lg text-slate-400 font-bold">/{{ billingCycle === 'annual' ? 'yr' : 'mo' }}</span>
                        </div>
                        <p class="text-slate-500 text-sm">No setup fees. No contracts.<br>Cancel anytime.</p>
                    </div>

                    <button @click="handleStripeCheckout" class="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors mb-6 shadow-lg shadow-slate-200">
                        {{ billingCycle === 'annual' ? 'Secure Annual Launch' : 'Activate My Site' }}
                    </button>
                    
                    <ul class="space-y-4">
                        <li v-for="feat in ['Unlimited AI Edits', 'Custom Domain name', 'Google Maps Sync', '24/7 Priority Support']" :key="feat" class="flex items-center gap-3 text-sm font-bold text-slate-700">
                            <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                            {{ feat }}
                        </li>
                    </ul>
                </div>
            </div>
        </section>

        <!-- Trust & Proof -->
        <section class="py-20 bg-slate-50 -mx-6 px-6 border-y border-slate-100">
            <div class="max-w-6xl mx-auto">
                <div class="text-center mb-16">
                    <div class="text-blue-600 font-black tracking-widest uppercase text-xs mb-4">Trusted by Professionals</div>
                    <h2 class="text-3xl font-black text-slate-900">Proven Results for Local Business</h2>
                </div>
                
                <!-- Stats -->
                <div class="grid md:grid-cols-3 gap-8 mb-20 text-center">
                    <div v-for="stat in [
                        { val: '50+', label: 'Local businesses live' },
                        { val: '35%', label: 'Average lead increase' },
                        { val: '5 Min', label: 'Fastest launch time' }
                    ]" :key="stat.label">
                        <div class="text-5xl font-black text-slate-900 mb-2">{{ stat.val }}</div>
                        <div class="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{{ stat.label }}</div>
                    </div>
                </div>

                <!-- Testimonials -->
                <div class="grid md:grid-cols-3 gap-8">
                    <div v-for="t in testimonials" :key="t.name" class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                        <div class="flex gap-1 text-yellow-400 mb-6">
                            <svg v-for="i in 5" :key="i" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        </div>
                        <p class="text-slate-600 font-medium italic mb-8 flex-grow">"{{ t.text }}"</p>
                        <div class="flex items-center gap-4">
                            <img :src="t.img" class="w-12 h-12 rounded-full border-2 border-slate-100" />
                            <div>
                                <div class="font-bold text-slate-900">{{ t.name }}</div>
                                <div class="text-xs text-slate-400 font-bold">{{ t.role }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>


        <!-- FAQ Section -->
        <section class="py-20">
            <div class="max-w-3xl mx-auto px-6">
                <h2 class="text-3xl font-black text-center mb-16">Common Questions</h2>
            <div class="space-y-6">
                <div v-for="faq in faqs" :key="faq.q" class="border-b border-slate-100 pb-6 group">
                    <h4 class="font-bold text-lg mb-2 text-slate-800 flex items-center gap-2">
                        <span class="w-2 h-2 bg-blue-600 rounded-full group-hover:scale-150 transition-transform"></span>
                        {{ faq.q }}
                    </h4>
                    <p class="text-slate-500 font-medium pl-4">{{ faq.a }}</p>
                </div>
            </div>
            </div>
            
            <!-- Core Features Section -->
            <div class="container mx-auto max-w-6xl px-6 py-16">
                <div class="text-center mb-12">
                    <h2 class="text-3xl font-black text-slate-900 mb-2">Built for Performance</h2>
                    <p class="text-slate-500 font-medium">Everything included in your {{ store.companyInfo.name }} custom build.</p>
                </div>
                <div class="grid md:grid-cols-4 gap-6">
                    <div v-for="feature in [
                        { icon: '📱', label: 'Mobile-Friendly', color: 'bg-blue-50 text-blue-600' },
                        { icon: '📍', label: 'Google Maps optimized', color: 'bg-red-50 text-red-600' },
                        { icon: '⚡', label: 'Lightning Fast', color: 'bg-yellow-50 text-yellow-600' },
                        { icon: '📞', label: 'Easy Calls from website', color: 'bg-green-50 text-green-600' }
                    ]" :key="feature.label" class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center group hover:shadow-md transition-shadow">
                        <div :class="feature.color" class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 mx-auto group-hover:scale-110 transition-transform">
                            {{ feature.icon }}
                        </div>
                        <h3 class="font-black text-slate-800 tracking-tight">{{ feature.label }}</h3>
                    </div>
                </div>
            </div>

            <div class="max-w-3xl mx-auto px-6">
                <h4 class="font-black text-blue-900 mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                    Additional Features
                </h4>
                <p class="text-blue-800/80 font-medium text-sm leading-relaxed">
                    Custom domain names, Online payments, Scheduling, Multi-language sites, and Internet stores can be added at any time. Just ask our AI assistant after you go live.
                </p>
            </div>
        </section>

        <!-- Final CTA -->
        <section class="py-20 text-center">
            <div class="bg-blue-600 rounded-[3rem] p-12 md:p-20 relative overflow-hidden shadow-2xl">
                <div class="absolute top-0 right-0 w-96 h-96 bg-white rounded-full opacity-10 -mr-20 -mt-20"></div>
                <div class="absolute bottom-0 left-0 w-96 h-96 bg-blue-400 rounded-full opacity-10 -ml-20 -mb-20"></div>
                
                <h2 class="text-4xl md:text-6xl font-black text-white mb-8 relative z-10 leading-tight">
                    Ready to claim <br>your site?
                </h2>
                <button @click="handleStripeCheckout" class="relative z-10 px-12 py-5 bg-white text-blue-600 font-black text-xl rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl mb-8">
                    {{ billingCycle === 'annual' ? 'Launch Yearly for $529' : 'Launch Monthly for $54' }}
                </button>
                <div class="flex flex-wrap justify-center gap-6 text-white/70 text-sm font-bold uppercase tracking-widest relative z-10">
                    <span class="flex items-center gap-2">✓ No setup fees</span>
                    <span class="flex items-center gap-2">✓ Money-back guarantee</span>
                    <span class="flex items-center gap-2">✓ Live in 5 min</span>
                </div>
            </div>
        </section>

    </main>
    
    <!-- Badges Row -->
    <div class="bg-slate-50 border-t border-slate-100 py-16">
        <div class="container mx-auto max-w-6xl px-6 flex flex-wrap justify-center gap-12 grayscale opacity-60">
            <div class="flex items-center gap-2 font-black text-2xl tracking-tighter text-slate-800">
                <svg class="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
                Google Partner
            </div>
            <div class="flex items-center gap-2 font-black text-2xl tracking-tighter text-slate-800">
                <svg class="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm-5 13H5v-2h10v2zm4-4H5v-2h14v2zm0-4H5V7h14v2z"/></svg>
                Stripe Verified
            </div>
            <div class="flex items-center gap-2 font-black text-2xl tracking-tighter text-slate-800">
                <svg class="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                SSL Secure
            </div>
        </div>
    </div>

    <!-- Mobile Sticky CTA (Handy for conversions) -->
    <div class="lg:hidden fixed bottom-6 left-6 right-6 z-50">
        <button @click="handleStripeCheckout" class="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
            Secure My Launch – Pay Now
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
        </button>
    </div>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

:deep(html) {
    font-family: 'Plus Jakarta Sans', sans-serif;
}

.font-pj {
    font-family: 'Plus Jakarta Sans', sans-serif;
}
</style>

