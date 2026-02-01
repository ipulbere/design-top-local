<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const sessionId = ref('')
const orderId = ref('')
const email = ref('')
const loading = ref(true)

onMounted(async () => {
    sessionId.value = route.query.session_id;

    if (!sessionId.value) {
        // Fallback or legacy handling
        orderId.value = route.query.order_id || 'unknown';
        email.value = 'No session ID provided';
        loading.value = false;
        return;
    }

    try {
        // Call our serverless function to securely get the email
        const res = await fetch(`/.netlify/functions/verify-payment?session_id=${sessionId.value}`);
        if (!res.ok) throw new Error('Verification failed');
        
        const data = await res.json();
        
        email.value = data.email;
        orderId.value = data.order_id;
        
        // You could also save this to DB here:
        // db.markPaid(data.order_id, data.email);
        
    } catch (e) {
        console.error(e);
        
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            email.value = 'client@example.com (Mock for Localhost)';
            orderId.value = route.query.order_id || 'demo_order_id';
        } else {
            // Show the actual error to help debugging
            email.value = `Error: ${e.message}`; 
        }
        
        if (route.query.order_id && !orderId.value) orderId.value = route.query.order_id;
    } finally {
        loading.value = false;
    }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center space-y-6">
      
      <div v-if="loading" class="py-12">
          <div class="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-slate-500">Verifying Payment...</p>
      </div>

      <div v-else>
          <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          
          <h2 class="text-3xl font-extrabold text-slate-900 mb-2">Payment Successful!</h2>
          <p class="text-slate-600">Your website is being prepared for launch.</p>
          
          <div class="bg-slate-50 rounded-xl p-4 text-left space-y-3 border border-slate-100 mt-6">
              <div>
                  <span class="text-xs font-bold text-slate-400 uppercase block">Order ID</span>
                  <span class="font-mono text-slate-800">{{ orderId }}</span>
              </div>
               <div>
                  <span class="text-xs font-bold text-slate-400 uppercase block">Confirmation Email</span>
                  <span class="font-mono text-slate-800">{{ email }}</span>
              </div>
               <div>
                  <span class="text-xs font-bold text-slate-400 uppercase block">Session Reference</span>
                  <span class="font-mono text-xs text-slate-500 break-all">{{ sessionId }}</span>
              </div>
          </div>

          <button @click="router.push('/')" class="w-full bg-slate-900 text-white font-bold py-3 rounded-xl mt-8 hover:bg-slate-800 transition">
              Create Another Site
          </button>
      </div>

    </div>
  </div>
</template>
