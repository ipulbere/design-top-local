const NETLIFY_API_BASE = 'https://api.netlify.com/api/v1';
const NETLIFY_TOKEN = import.meta.env.VITE_NETLIFY_TOKEN || '';

export const NetlifyService = {
    /**
     * Creating the Netlify Site: Makes a POST request to allocate a new site container.
     */
    async getOrCreateNetlifySite(subdomain) {
        if (!NETLIFY_TOKEN) {
            throw new Error('VITE_NETLIFY_TOKEN is missing. Please add your Netlify Personal Access Token to .env');
        }

        const timestamp = Date.now().toString().slice(-4);
        const siteName = `${subdomain.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}`;

        console.log(`[Netlify] Requesting site container: ${siteName}...`);

        const response = await fetch(`${NETLIFY_API_BASE}/sites`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NETLIFY_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: siteName })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Netlify site creation failed: ${error.message || response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Uploading the ZIP to Netlify: Sends the raw ZIP binary data directly to Netlify's CDN.
     */
    async uploadDeployToNetlify(siteId, zipBlob) {
        console.log(`[Netlify] Uploading ZIP bundle to site ${siteId}...`);

        const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}/deploys?async=true`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NETLIFY_TOKEN}`,
                'Content-Type': 'application/zip'
            },
            body: zipBlob
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Netlify upload failed: ${error.message || response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Finalizing (Polling): Periodically checks the deployment state property.
     */
    async pollDeployStatus(siteId, deployId) {
        console.log(`[Netlify] Finalizing deployment: polling status for ${deployId}...`);

        while (true) {
            const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}/deploys/${deployId}`, {
                headers: { 'Authorization': `Bearer ${NETLIFY_TOKEN}` }
            });

            if (!response.ok) throw new Error('Deployment polling failed');

            const deployData = await response.json();
            const state = deployData.state;

            if (state === 'ready') return deployData;
            if (state === 'error') throw new Error('Netlify deployment entered error state during processing');

            console.log(`[Netlify] State: ${state}. Retrying in 2s...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
};
