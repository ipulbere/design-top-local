
async function testAssetFetch() {
    const url = 'http://localhost:8888/.netlify/functions/generate-assets';
    const body = {
        category: 'Painters' // Based on user screenshot, Painters has assets
    };

    console.log(`Sending request to ${url} for category ${body.category}...`);
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error("Response:", text);
            return;
        }

        const assets = await response.json();
        console.log("Success! Received Assets Keys:", Object.keys(assets));

        // Check for specific keys
        ['hero', 'team', 'service_0', 'gallery_0'].forEach(key => {
            if (assets[key]) {
                const preview = assets[key].substring(0, 50);
                console.log(`${key}: ${preview}... (Length: ${assets[key].length})`);
            } else {
                console.warn(`${key}: MISSING`);
            }
        });

    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

testAssetFetch();
