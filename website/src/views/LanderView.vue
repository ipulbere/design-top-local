<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWebsiteStore } from '../stores/website'

const router = useRouter()
const route = useRoute()
const store = useWebsiteStore()

// --- Countdown Timer Logic ---
const hours = ref(1)
const minutes = ref(39)
const seconds = ref(11)
let timer = null

function loadUniqueOrderId() {
    // Try to get from route query, store, or fallback
    if (route.query.id) return route.query.id;
    // Attempt to find ID if store has it (we might need to ensure store has ID)
    // For now, generate a random one if strict ID is missing, but requirements say "taken from site/6bf..."
    // We will assume the component is loaded with ?id=... or store is populated.
    return 'unknown_order_' + Math.floor(Math.random() * 100000);
}

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
    yearly: 'https://buy.stripe.com/test_fZubIV94o4M7a3g6hmdQQ04'
};
const STRIPE_KEY = 'pk_test_51SrPV39VyIzH8me4fnULKe89k9BEx0WEwwgqqKvtmsvevaEhjWr7zodNqXEB2UrDG8I6ezOfIfynrfZXtbMfUiKQ00ZEItc8R6';

function handleStripeCheckout(planType) {
    isProcessing.value = true;
    const orderId = store.siteId || route.query.id || 'demo_site_id';
    const email = store.companyInfo.email || ''; 

    // Construct URL with params for tracking
    // client_reference_id: Tracks the order ID in Stripe
    // prefilled_email: Auto-fills email field
    const baseUrl = PAYMENT_LINKS[planType];
    const url = new URL(baseUrl);
    url.searchParams.append('client_reference_id', orderId);
    if (email) {
        url.searchParams.append('prefilled_email', email);
    }
    
    // Redirect
    window.location.href = url.toString();
}

function goBack() {
    router.back()
}

function sharePage() {
    if (navigator.share) {
        navigator.share({
            title: `Check out ${store.companyInfo.name}`,
            text: 'I just built this website! Check it out.',
            url: window.location.href
        }).catch(console.error)
    } else {
        alert('Link copied to clipboard!')
        navigator.clipboard.writeText(window.location.href)
    }
}
</script>

<template>
  <div class="min-h-screen bg-white font-sans text-slate-900 pb-20">
    
    <!-- Top Navigation Control -->
    <div class="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-100 p-4">
        <div class="container mx-auto max-w-5xl flex justify-between items-center">
            <button @click="goBack" class="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-bold transition">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Back to Edit
            </button>
            <button @click="sharePage" class="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-bold hover:bg-blue-200 transition">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                Share This Page
            </button>
        </div>
    </div>

    <div class="container mx-auto max-w-3xl px-6 pt-10">
        <!-- Hero -->
        <div class="text-center mb-12">
            <span class="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block animate-pulse">Launch Special</span>
            <h1 class="text-4xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
                Activate Your <br><span class="text-blue-600">Local Dominance</span>
            </h1>
            <p class="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Websites built with Top-Local intelligence are optimized specifically for local search behavior, helping small businesses get <span class="font-bold text-slate-900 bg-yellow-100 px-1">30-40% more inbound calls</span> on average.
            </p>
        </div>

        <!-- Timer -->
        <div class="bg-slate-900 text-white rounded-2xl p-6 mb-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl overflow-hidden relative">
            <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full filter blur-[80px] opacity-20 pointer-events-none"></div>
            <div>
                <p class="text-blue-300 font-bold uppercase text-xs tracking-widest mb-1">Limited Time Launch Offer</p>
                <p class="font-bold text-lg">Offer expires in:</p>
            </div>
            <div class="flex gap-4 text-center">
                <div class="bg-white/10 rounded-lg p-3 w-16 backdrop-blur">
                    <div class="text-2xl font-bold font-mono">{{ hours.toString().padStart(2, '0') }}</div>
                    <div class="text-[10px] text-slate-400 uppercase">Hours</div>
                </div>
                <div class="bg-white/10 rounded-lg p-3 w-16 backdrop-blur">
                    <div class="text-2xl font-bold font-mono">{{ minutes.toString().padStart(2, '0') }}</div>
                    <div class="text-[10px] text-slate-400 uppercase">Mins</div>
                </div>
                <div class="bg-white/10 rounded-lg p-3 w-16 backdrop-blur">
                    <div class="text-2xl font-bold font-mono text-red-400">{{ seconds.toString().padStart(2, '0') }}</div>
                    <div class="text-[10px] text-slate-400 uppercase">Secs</div>
                </div>
            </div>
        </div>

        <!-- Value Stack -->
        <div class="bg-slate-50 border border-slate-200 rounded-3xl p-8 mb-12">
            <h3 class="font-bold text-slate-900 text-xl mb-6">What's Included</h3>
            <div class="space-y-4">
                <div class="flex justify-between items-center pb-4 border-b border-slate-200">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">✓</div>
                        <span class="font-medium">AI Design & Strategy</span>
                    </div>
                    <span class="text-slate-500 line-through">$500.00</span>
                </div>
                <div class="flex justify-between items-center pb-4 border-b border-slate-200">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">✓</div>
                        <span class="font-medium">Premium Local Hosting</span>
                    </div>
                    <span class="text-slate-500 line-through">$200.00</span>
                </div>
                <div class="flex justify-between items-center pb-4 border-b border-slate-200">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">✓</div>
                        <span class="font-medium">Local SEO Structure</span>
                    </div>
                    <span class="text-slate-500 line-through">$300.00</span>
                </div>
                <div class="flex justify-between items-center pt-2">
                    <span class="font-bold text-slate-900 text-lg">Total Value</span>
                    <span class="font-extrabold text-slate-900 text-xl line-through decoration-red-500">$1,000.00</span>
                </div>
            </div>
        </div>

        <!-- Main Title & Guarantee Block -->
        <div class="text-center mb-8">
            <h2 class="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Claim My Design & Go Live</h2>
            <div class="inline-block text-left bg-blue-50 border border-blue-100 p-6 rounded-2xl shadow-sm">
                 <ul class="space-y-3 text-slate-700 font-medium">
                     <li class="flex items-center gap-2">
                         <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                         Satisfaction Guaranteed
                     </li>
                     <li class="flex items-center gap-2">
                         <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                         Cancel anytime
                     </li>
                     <li class="flex items-center gap-2">
                         <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                         Unlimited AI assisted page modifications
                     </li>
                     <li class="flex items-center gap-2">
                         <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                         Image generations and or additions
                     </li>
                 </ul>
            </div>
        </div>

        <!-- Pricing Buttons Grid -->
        <div class="grid md:grid-cols-2 gap-6 mb-8">
            <!-- Monthly Plan -->
            <button 
                @click="handleStripeCheckout('monthly')"
                class="relative p-8 rounded-2xl border-2 border-slate-200 bg-white hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all group text-left"
            >
                <div>
                    <div class="font-bold text-slate-900 text-xl mb-1">Start Monthly Plan</div>
                    <div class="text-slate-500 text-sm mb-4">Flex plan</div>
                </div>
                <div class="flex items-end gap-1 mb-2">
                    <span class="text-5xl font-extrabold text-slate-900">$54</span>
                    <span class="text-slate-600 mb-1 font-medium">/ month</span>
                </div>
            </button>

            <!-- Yearly Plan -->
            <button 
                @click="handleStripeCheckout('yearly')"
                class="relative p-8 rounded-2xl border-2 border-slate-200 bg-white hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all group text-left"
            >
                <div class="absolute -top-3 right-4 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wide animate-bounce">
                    Save $119 / yr
                </div>
                <div>
                    <div class="font-bold text-slate-900 text-xl mb-1">Activate Yearly Access</div>
                    <div class="text-slate-500 text-sm mb-4">Best Value</div>
                </div>
                <div class="flex items-end gap-1 mb-2">
                    <span class="text-5xl font-extrabold text-slate-900">$529</span>
                    <span class="text-slate-600 mb-1 font-medium">/ year</span>
                </div>
            </button>
        </div>

        <p class="text-center text-slate-500 text-sm mb-16">
            Secure 256-bit SSL Encrypted Payment
        </p>

        <!-- Feature Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            <div class="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                <div class="text-2xl mb-2">📱</div>
                <div class="font-bold text-sm">Mobile-First</div>
            </div>
            <div class="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                <div class="text-2xl mb-2">📍</div>
                <div class="font-bold text-sm">Google Maps</div>
            </div>
            <div class="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                <div class="text-2xl mb-2">⚡</div>
                <div class="font-bold text-sm">Lightning Fast</div>
            </div>
            <div class="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                <div class="text-2xl mb-2">📞</div>
                <div class="font-bold text-sm">Easy Calls</div>
            </div>
        </div>

        <!-- FAQ -->
        <div class="space-y-8 border-t border-slate-200 pt-12">
            <div>
                <h4 class="font-bold text-slate-900 mb-2">How long until my site is live?</h4>
                <p class="text-slate-600">Go live in 5 minutes after checkout.</p>
            </div>
            <div>
                <h4 class="font-bold text-slate-900 mb-2">Do you handle content/photos?</h4>
                <p class="text-slate-600">Yes, we will guide you or add stock/professional shots.</p>
            </div>
            <div>
                <h4 class="font-bold text-slate-900 mb-2">Mobile-friendly?</h4>
                <p class="text-slate-600">100% – essential for local searches.</p>
            </div>
            <div class="bg-blue-50 p-6 rounded-2xl text-blue-900 border border-blue-100">
                <span class="font-bold block mb-2">Additional Features:</span>
                Custom domain name (yourcompany.com), Online payments, Scheduling, Multi-language site, and Internet store can be added at a later time for additional cost.
            </div>
        </div>

    </div>
  </div>
</template>
