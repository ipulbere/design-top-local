
// ESM Test Script
async function testGen() {
    try {
        console.log("Sending request...");
        const response = await fetch('http://localhost:8888/.netlify/functions/generate-assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'single',
                prompt: 'test image 1:1 red cube'
            })
        });

        if (!response.ok) {
            console.error("Error Status:", response.status);
            const text = await response.text();
            console.error("Error Text:", text); // Print full text
            return;
        }

        const data = await response.json();
        console.log("Success!");
        console.log("URL:", data.url ? data.url.substring(0, 50) + "..." : "No URL");
        if (data.url && data.url.startsWith("data:image")) {
            console.log("Returned Base64 image (Storage fallback or direct return)");
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

testGen();
