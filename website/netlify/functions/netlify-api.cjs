// Node 18+ has global fetch available natively.

exports.handler = async (event, context) => {
    // Netlify Functions handle CORS automatically in local development.
    // If we add them manually, they might duplicate (e.g., '*, *').
    const headers = {
        'Content-Type': 'application/json'
    };

    const action = event.headers['x-action'];
    const NETLIFY_TOKEN = process.env.VITE_NETLIFY_TOKEN;
    const API_BASE = 'https://api.netlify.com/api/v1';

    if (!NETLIFY_TOKEN) {
        return { statusCode: 500, headers, body: JSON.stringify({ message: 'Server error: Netlify token not configured.' }) };
    }

    try {
        if (action === 'create-site') {
            const { subdomain } = JSON.parse(event.body);
            const timestamp = Date.now().toString().slice(-4);
            const siteName = `${subdomain.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}`;

            console.log(`[Function] Creating site: ${siteName}`);

            const response = await fetch(`${API_BASE}/sites`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${NETLIFY_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: siteName })
            });

            const data = await response.json();
            return { statusCode: response.status, headers, body: JSON.stringify(data) };
        }

        else if (action === 'upload-zip') {
            const siteId = event.headers['x-site-id'];
            if (!siteId) throw new Error('Missing site ID');

            console.log(`[Function] Uploading ZIP to site: ${siteId}`);

            // Netlify API accepts raw binary ZIP in the body
            const response = await fetch(`${API_BASE}/sites/${siteId}/deploys?async=true`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${NETLIFY_TOKEN}`,
                    'Content-Type': 'application/zip'
                },
                body: Buffer.from(event.body, 'base64')
            });

            const data = await response.json();
            return { statusCode: response.status, headers, body: JSON.stringify(data) };
        }

        else if (action === 'poll-status') {
            const siteId = event.headers['x-site-id'];
            const deployId = event.headers['x-deploy-id'];

            const response = await fetch(`${API_BASE}/sites/${siteId}/deploys/${deployId}`, {
                headers: { 'Authorization': `Bearer ${NETLIFY_TOKEN}` }
            });

            const data = await response.json();
            return { statusCode: response.status, headers, body: JSON.stringify(data) };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ message: 'Invalid action' }) };

    } catch (err) {
        console.error('[Function Error]', err);
        return { statusCode: 500, headers, body: JSON.stringify({ message: err.message }) };
    }
};
