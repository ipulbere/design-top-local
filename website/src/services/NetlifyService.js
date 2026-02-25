const FUNCTION_URL = '/.netlify/functions/netlify-api';
console.log('[NetlifyService] RELOADED_V2');

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
     * Sending raw binary for maximum reliability.
     */
    async uploadDeployToNetlify(siteId, zipBlob) {
        console.log(`[NetlifyService] Uploading binary ZIP to relay for ${siteId}...`);

        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/zip',
                'x-action': 'upload-zip',
                'x-site-id': siteId
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
            if (state === 'error') {
                console.error('[NetlifyService] Deployment failed. Full error data:', deployData);
                throw new Error(`Netlify deployment error: ${deployData.error_message || 'Processing failed'}`);
            }

            console.log(`[NetlifyService] State: ${state}. Retrying in 2s...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
};
