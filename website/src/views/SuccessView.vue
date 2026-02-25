<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWebsiteStore } from '../stores/website'
import { NetlifyService } from '../services/NetlifyService'
import { ZipService } from '../services/ZipService'

const route = useRoute()
const router = useRouter()
const store = useWebsiteStore()

const sessionId = ref('')
const orderId = ref('')
const email = ref('')
const loading = ref(true)
const deployStatus = ref('idle') // idle, packaging, creating_site, deploying, polling, ready, error
const deployUrl = ref('')
const deployError = ref('')

onMounted(async () => {
    sessionId.value = route.query.session_id;

    if (!sessionId.value) {
        // ALLOW TEST MODE (From "Publish Website" button)
        if (route.query.test === 'true') {
            email.value = 'Test Deployment (No Payment)';
            orderId.value = 'test_deployment_manual';
            loading.value = false;
            await startDeployment();
            return;
        }

        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            email.value = 'client@example.com (Mock for Localhost)';
            orderId.value = route.query.order_id || 'demo_order_id';
            loading.value = false;
            await startDeployment();
        } else {
            email.value = 'No session ID provided';
            loading.value = false;
        }
        return;
    }

    try {
        const res = await fetch(`/.netlify/functions/verify-payment?session_id=${sessionId.value}`);
        if (!res.ok) throw new Error('Verification failed');
        
        const data = await res.json();
        email.value = data.email;
        orderId.value = data.order_id;
        
        await startDeployment();
        
    } catch (e) {
        console.error(e);
        email.value = `Error: ${e.message}`; 
        loading.value = false;
    } finally {
        loading.value = false;
    }
})

async function startDeployment() {
    if (!store.companyInfo.rawHTML) {
        console.warn('[Success] No HTML found to deploy.');
        return;
    }

    try {
        deployStatus.value = 'packaging';
        const subdomain = store.companyInfo.name || 'my-business';
        const base64Zip = await ZipService.packageWebsite(store.companyInfo.rawHTML, subdomain);
        
        deployStatus.value = 'creating_site';
        const site = await NetlifyService.getOrCreateNetlifySite(subdomain);
        
        deployStatus.value = 'deploying';
        const deploy = await NetlifyService.uploadDeployToNetlify(site.id, base64Zip);
        
        deployStatus.value = 'polling';
        await NetlifyService.pollDeployStatus(site.id, deploy.id);
        
        // 3-second pause before setting custom domain as requested
        console.log('[Success] Deployment ready. Waiting 3s before setting custom domain...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const customDomain = `${site.name}.top-local.net`;
        deployStatus.value = 'finalizing';
        await NetlifyService.setCustomDomain(site.id, customDomain);
        
        deployStatus.value = 'ready';
        deployUrl.value = `https://${customDomain}`;
        
    } catch (err) {
        console.error('[Deployment Error]', err);
        deployStatus.value = 'error';
        deployError.value = err.message;
    }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30 font-sans flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950">
    <div class="max-w-2xl w-full">
      
      <!-- SUCCESS HEADER -->
      <div v-if="!loading && deployStatus !== 'error'" class="text-center mb-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div class="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_-10px_rgba(59,130,246,0.6)] animate-pulse">
            <svg class="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 class="text-4xl md:text-6xl font-black tracking-tight mb-4">
              {{ deployStatus === 'ready' ? 'Done!' : 'Launching...' }}
          </h2>
          <p class="text-xl text-slate-400 font-medium">
              {{ deployStatus === 'ready' ? 'Your website deployment complete.' : 'Your website building process is in progress.' }}
          </p>
      </div>

      <!-- MAIN CARD -->
      <div class="bg-white/[0.03] border border-white/10 backdrop-blur-3xl rounded-[3rem] p-8 md:p-12 shadow-2xl overflow-hidden relative group">
          
          <div v-if="loading" class="py-20 text-center">
              <div class="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
              <p class="text-lg font-bold text-slate-400 animate-pulse">Verifying Transaction...</p>
          </div>

          <div v-else class="space-y-12">
              
              <!-- DEPLOYMENT PROGRESS -->
              <div class="space-y-6">
                  <h3 class="text-xs font-black uppercase tracking-[0.2em] text-blue-500">Infrastructure Pipeline</h3>
                  
                  <div class="space-y-4">
                      <!-- Progress Bar -->
                      <div class="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                              class="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000 ease-out"
                              :style="{ width: deployStatus === 'ready' ? '100%' : (deployStatus === 'idle' ? '0%' : (deployStatus === 'packaging' ? '25%' : (deployStatus === 'creating_site' ? '50%' : (deployStatus === 'deploying' ? '75%' : '90%')))) }"
                          ></div>
                      </div>

                      <!-- Status Indicators -->
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div :class="['p-4 rounded-2xl border transition-all duration-500 flex items-center gap-4', deployStatus === 'ready' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-white/5 bg-white/5 text-slate-400']">
                              <div :class="['w-8 h-8 rounded-lg flex items-center justify-center', deployStatus === 'ready' ? 'bg-green-500 text-white' : 'bg-white/10']">
                                  <i :class="deployStatus === 'ready' ? 'fa-solid fa-check' : 'fa-solid fa-cloud-arrow-up'"></i>
                              </div>
                              <div>
                                  <div class="text-[10px] uppercase font-black tracking-widest leading-none mb-1">Status</div>
                                  <div class="font-bold text-sm">{{ deployStatus === 'ready' ? 'Ready' : (deployStatus === 'idle' ? 'Pending' : 'In Progress') }}</div>
                              </div>
                          </div>

                          <div class="p-4 rounded-2xl border border-white/5 bg-white/5 text-slate-400 flex items-center gap-4">
                              <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                  <i class="fa-solid fa-envelope"></i>
                              </div>
                              <div class="truncate">
                                  <div class="text-[10px] uppercase font-black tracking-widest leading-none mb-1">Receipt Email</div>
                                  <div class="font-bold text-sm truncate">{{ email }}</div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- DEPLOYED URL (When Ready) -->
              <div v-if="deployStatus === 'ready'" class="animate-in fade-in zoom-in duration-700">
                  <div class="p-8 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-500/20 text-center space-y-6">
                      <h4 class="text-2xl font-black">Follow this link to see your brand new website:</h4>
                      <div class="bg-black/20 backdrop-blur rounded-xl p-4 font-mono text-sm break-all border border-white/10 select-all">
                          {{ deployUrl }}
                      </div>
                      <div class="flex gap-4">
                          <a :href="deployUrl" target="_blank" class="flex-1 bg-white text-blue-700 font-black py-4 rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                              <i class="fa-solid fa-arrow-up-right-from-square"></i>
                              Open Website
                          </a>
                      </div>
                  </div>
              </div>

              <!-- ERROR STATE -->
              <div v-else-if="deployStatus === 'error'" class="p-8 rounded-[2rem] border border-red-500/30 bg-red-500/10 text-center space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-red-500/20">
                      <i class="fa-solid fa-triangle-exclamation text-2xl text-white"></i>
                  </div>
                  <h4 class="text-xl font-bold text-red-400">Deployment Failed</h4>
                  <p class="text-slate-400 text-sm max-w-xs mx-auto">{{ deployError }}</p>
                  <button @click="startDeployment" class="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all">
                      Retry Deployment
                  </button>
              </div>

              <!-- LOADING FLOW MESSAGES -->
              <div v-else class="text-center pt-4">
                  <p class="text-slate-500 text-sm font-medium animate-pulse">
                      <span v-if="deployStatus === 'packaging'">Packaging build assets...</span>
                      <span v-else-if="deployStatus === 'creating_site'">Provisioning Netlify production environment...</span>
                      <span v-else-if="deployStatus === 'deploying'">Uploading to CDN...</span>
                      <span v-else-if="deployStatus === 'polling'">Finalizing security certificates...</span>
                      <span v-else-if="deployStatus === 'finalizing'">Setting up custom domain...</span>
                      <span v-else>Stand by...</span>
                  </p>
              </div>
          </div>
      </div>

      <!-- FOOTER -->
      <div v-if="!loading" class="mt-12 text-center text-slate-500 font-medium text-sm flex items-center justify-center gap-8">
          <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-green-500"></span>
              Stripe Verified
          </div>
          <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span>
              Netlify Edge Ready
          </div>
      </div>

    </div>
  </div>
</template>
