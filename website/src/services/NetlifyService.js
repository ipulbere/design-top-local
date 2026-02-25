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
            const raw = await response.text();
            console.error('[NetlifyService] getOrCreateNetlifySite Raw Error:', raw);
            try {
                const error = JSON.parse(raw);
                throw new Error(`Netlify site creation failed: ${error.message || response.statusText}`);
            } catch (e) {
                throw new Error(`Netlify site creation crash: ${raw}`);
            }
        }

        return await response.json();
    },

    /**
     * Uploading the ZIP through the secure relay.
     * Sending as Base64 string in JSON body for maximum reliability in Netlify Dev/Functions.
     */
    async uploadDeployToNetlify(siteId, base64Zip) {
        console.log(`[NetlifyService] Uploading Base64 ZIP (${base64Zip.length} chars) to relay for ${siteId}...`);

        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-action': 'upload-zip',
                'x-site-id': siteId
            },
            body: JSON.stringify({ zipData: base64Zip })
        });

        if (!response.ok) {
            const raw = await response.text();
            console.error('[NetlifyService] uploadDeployToNetlify Raw Error:', raw);
            try {
                const error = JSON.parse(raw);
                throw new Error(`Netlify upload failed: ${error.message || response.statusText}`);
            } catch (parseErr) {
                throw new Error(`Netlify upload crash: ${raw}`);
            }
        }

        return await response.json();
    },

    /**
     * Setting the custom domain after a successful deploy.
     */
    async setCustomDomain(siteId, domain) {
        console.log(`[NetlifyService] Setting custom domain ${domain} for site ${siteId}...`);

        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-action': 'update-site',
                'x-site-id': siteId
            },
            body: JSON.stringify({ custom_domain: domain })
        });

        if (!response.ok) {
            const raw = await response.text();
            console.error('[NetlifyService] setCustomDomain Raw Error:', raw);
            try {
                const error = JSON.parse(raw);
                throw new Error(`Failed to set custom domain: ${error.message || response.statusText}`);
            } catch (e) {
                throw new Error(`Failed to set custom domain (crash): ${raw}`);
            }
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

            if (!response.ok) {
                const raw = await response.text();
                console.error('[NetlifyService] pollDeployStatus Raw Error:', raw);
                throw new Error(`Deployment polling crash: ${raw}`);
            }

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
