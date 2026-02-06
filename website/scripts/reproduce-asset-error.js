
// ESM script
async function testAssetGen() {
    const url = 'http://localhost:8888/.netlify/functions/generate-assets';
    const body = {
        category: 'Painters',
        prompt: 'A professional painter working on a wall',
        mode: 'debug',
        section: 'hero'
    };

    console.log(`Sending request to ${url}...`);
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log(`Response Body:`, text);

    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

testAssetGen();
