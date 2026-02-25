// Native fetch is available in Node 18+ and Netlify Functions.
// We avoid the SDK for this specific environment due to internal path resolution bugs.

exports.handler = async (event, context) => {
    const headers = { 'Content-Type': 'application/json' };
    const action = event.headers['x-action'];
    const NETLIFY_TOKEN = process.env.VITE_NETLIFY_TOKEN;
    const API_BASE = 'https://api.netlify.com/api/v1';

    if (!NETLIFY_TOKEN) {
        return { statusCode: 500, headers, body: JSON.stringify({ message: 'Server error: Netlify token not configured.' }) };
    }

    try {
        if (action === 'create-site') {
            const { subdomain } = JSON.parse(event.body);
            // Cleaner sanitization: remove suffixes and all non-alphanumeric chars
            let siteName = subdomain.toLowerCase()
                .replace(/\b(llc|inc|corp|ltd)\b/g, '') // strip common suffixes
                .replace(/[^a-z0-9]/g, '');            // remove all non-alphanumeric (no hyphens)

            if (siteName.length < 3) siteName = 'site-' + siteName; // Ensure minimum length

            console.log(`[Function] Creating site: ${siteName}`);

            let response = await fetch(`${API_BASE}/sites`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${NETLIFY_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: siteName })
            });

            // If name is taken, retry with random suffix
            if (response.status === 422) {
                const uniqueSiteName = `${siteName}-${Math.floor(Math.random() * 9000) + 1000}`;
                console.log(`[Function] Name taken, retrying: ${uniqueSiteName}`);
                response = await fetch(`${API_BASE}/sites`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${NETLIFY_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: uniqueSiteName })
                });
            }

            const data = await response.json();
            return { statusCode: response.status, headers, body: JSON.stringify(data) };
        }

        else if (action === 'upload-zip') {
            const siteId = event.headers['x-site-id'];
            const { zipData } = JSON.parse(event.body);

            console.log(`[Function] Uploading ZIP to site: ${siteId}`);
            const zipBuffer = Buffer.from(zipData, 'base64');

            // Direct binary POST to Netlify API for ZIPs
            const response = await fetch(`${API_BASE}/sites/${siteId}/deploys?async=true`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${NETLIFY_TOKEN}`,
                    'Content-Type': 'application/zip'
                },
                body: zipBuffer
            });

            const data = await response.json();
            return { statusCode: response.status, headers, body: JSON.stringify(data) };
        }

        else if (action === 'update-site') {
            const siteId = event.headers['x-site-id'];
            const body = JSON.parse(event.body);

            console.log(`[Function] Updating site ${siteId}:`, body);

            const response = await fetch(`${API_BASE}/sites/${siteId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${NETLIFY_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            return { statusCode: response.status, headers, body: JSON.stringify(data) };
        }

        else if (action === 'poll-status') {
            const siteId = event.headers['x-site-id'];
            const deployId = event.headers['x-deploy-id'];

            const response = await fetch(`${API_BASE}/sites/${siteId}/deploys/${deployId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${NETLIFY_TOKEN}` }
            });

            const data = await response.json();
            return { statusCode: response.status, headers, body: JSON.stringify(data) };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ message: 'Invalid action' }) };

    } catch (err) {
        console.error('[Function Error]', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                message: err.message,
                stack: err.stack,
                error: true,
                raw: err.toString()
            })
        };
    }
};
