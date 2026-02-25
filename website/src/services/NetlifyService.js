const FUNCTION_URL = '/.netlify/functions/netlify-api';

export const NetlifyService = {
    /**
     * Creating the Netlify Site through the secure relay.
     */
    async getOrCreateNetlifySite(subdomain) {
        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-action': 'create-site'
            },
            body: JSON.stringify({ subdomain })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Netlify site creation failed: ${error.message || response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Uploading the ZIP to Netlify through the secure relay.
     */
    async uploadDeployToNetlify(siteId, zipBlob) {
        console.log(`[NetlifyService] Preparing ZIP upload for ${siteId}...`);

        // Convert Blob to Base64 to send to Netlify Function
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
        });
        reader.readAsDataURL(zipBlob);
        const base64Data = await base64Promise;

        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'x-action': 'upload-zip',
                'x-site-id': siteId
            },
            body: base64Data
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Netlify upload failed: ${error.message || response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Finalizing (Polling) via relay.
     */
    async pollDeployStatus(siteId, deployId) {
        console.log(`[NetlifyService] Finalizing deployment: polling ${deployId}...`);

        while (true) {
            const response = await fetch(FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-action': 'poll-status',
                    'x-site-id': siteId,
                    'x-deploy-id': deployId
                }
            });

            if (!response.ok) throw new Error('Deployment polling failed');

            const deployData = await response.json();
            const state = deployData.state;

            if (state === 'ready') return deployData;
            if (state === 'error') throw new Error('Netlify deployment entered error state during processing');

            console.log(`[NetlifyService] State: ${state}. Retrying in 2s...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
};
