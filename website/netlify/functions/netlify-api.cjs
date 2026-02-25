const { NetlifyAPI } = require('netlify');

exports.handler = async (event, context) => {
    const headers = { 'Content-Type': 'application/json' };
    const action = event.headers['x-action'];
    const NETLIFY_TOKEN = process.env.VITE_NETLIFY_TOKEN;

    if (!NETLIFY_TOKEN) {
        return { statusCode: 500, headers, body: JSON.stringify({ message: 'Server error: Netlify token not configured.' }) };
    }

    const client = new NetlifyAPI(NETLIFY_TOKEN);
    const API_BASE = 'https://api.netlify.com/api/v1';

    try {
        if (action === 'create-site') {
            const { subdomain } = JSON.parse(event.body);
            const siteName = subdomain.toLowerCase().replace(/[^a-z0-9]/g, '-');

            console.log(`[Function] Creating site: ${siteName}`);

            try {
                const site = await client.createSite({ body: { name: siteName } });
                return { statusCode: 201, headers, body: JSON.stringify(site) };
            } catch (createErr) {
                if (createErr.status === 422) {
                    const uniqueSiteName = `${siteName}-${Math.floor(Math.random() * 9000) + 1000}`;
                    const site = await client.createSite({ body: { name: uniqueSiteName } });
                    return { statusCode: 201, headers, body: JSON.stringify(site) };
                }
                throw createErr;
            }
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

            const site = await client.updateSite({
                site_id: siteId,
                body: body
            });

            return { statusCode: 200, headers, body: JSON.stringify(site) };
        }

        else if (action === 'poll-status') {
            const siteId = event.headers['x-site-id'];
            const deployId = event.headers['x-deploy-id'];

            const deploy = await client.getDeploy({
                site_id: siteId,
                deploy_id: deployId
            });

            return { statusCode: 200, headers, body: JSON.stringify(deploy) };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ message: 'Invalid action' }) };

    } catch (err) {
        console.error('[Function Error Details]', {
            message: err.message,
            stack: err.stack,
            status: err.status
        });
        return {
            statusCode: err.status || 500,
            headers,
            body: JSON.stringify({
                message: err.message,
                error: true,
                errorType: 'FunctionCrash'
            })
        };
    }
};
