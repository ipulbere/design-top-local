<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWebsiteStore } from '../stores/website'

const router = useRouter()
const store = useWebsiteStore()
const isProcessing = ref(false)

function handlePayment() {
  isProcessing.value = true
  setTimeout(() => {
    store.markPaid()
    router.push('/success')
  }, 2000)
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div class="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
      <div class="p-8 bg-slate-900 text-white text-center">
        <h2 class="text-2xl font-bold">Complete Your Purchase</h2>
        <p class="text-slate-400 mt-2">Launch your professional website today.</p>
      </div>
      <div class="p-8 space-y-6">
        <div class="flex justify-between items-center py-4 border-b border-slate-100">
           <span class="font-medium text-slate-700">Website Package</span>
           <span class="font-bold text-slate-900">$299.00</span>
        </div>
        
        <!-- Mock Stripe Form -->
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Card Number</label>
            <div class="bg-slate-50 border border-slate-200 rounded-lg h-10 flex items-center px-4 text-slate-400 font-mono text-sm">
              4242 4242 4242 4242
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
             <div>
               <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Expiration</label>
               <div class="bg-slate-50 border border-slate-200 rounded-lg h-10 flex items-center px-4 text-slate-400 font-mono text-sm">
                 12 / 28
               </div>
             </div>
             <div>
               <label class="block text-xs font-bold text-slate-500 uppercase mb-1">CVC</label>
               <div class="bg-slate-50 border border-slate-200 rounded-lg h-10 flex items-center px-4 text-slate-400 font-mono text-sm">
                 123
               </div>
             </div>
          </div>
        </div>

        <button @click="handlePayment" :disabled="isProcessing" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 mt-4 flex justify-center">
           <span v-if="isProcessing" class="animate-spin mr-2">⟳</span>
           {{ isProcessing ? 'Processing...' : 'Pay with Stripe' }}
        </button>
        
        <p class="text-xs text-center text-slate-400">
          This is a secure 256-bit SSL encrypted payment.
        </p>
      </div>
    </div>
  </div>
</template>
