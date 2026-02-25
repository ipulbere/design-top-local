import JSZip from 'jszip';

export const ZipService = {
    /**
     * Packages the website HTML and base64 images into a ZIP file.
     * @param {string} html - The raw HTML of the website.
     * @param {string} siteName - Name of the site for identification.
     * @returns {Promise<Blob>} - The generated ZIP file as a Blob.
     */
    async packageWebsite(html, siteName) {
        const zip = new JSZip();
        const assetsFolder = zip.folder('assets');

        // 1. Process images (src="..." and url("..."))
        const imagePatterns = [
            {
                regex: /src=["'](data:image\/(png|jpg|jpeg|webp);base64,([^"']+))["']/g,
                template: (path) => `src="${path}"`
            },
            {
                regex: /url\(["']?(data:image\/(png|jpg|jpeg|webp);base64,([^"'\)]+))["']?\)/g,
                template: (path) => `url("${path}")`
            }
        ];

        let updatedHtml = html;
        let imageCounter = 0;

        for (const pattern of imagePatterns) {
            let match;
            // Reset regex state
            pattern.regex.lastIndex = 0;

            while ((match = pattern.regex.exec(html)) !== null) {
                imageCounter++;
                const extension = match[2];
                const base64Data = match[3];
                const fileName = `asset_${imageCounter}.${extension}`;
                const filePath = `assets/${fileName}`;

                try {
                    const binaryData = atob(base64Data);
                    const uint8Array = new Uint8Array(binaryData.length);
                    for (let i = 0; i < binaryData.length; i++) {
                        uint8Array[i] = binaryData.charCodeAt(i);
                    }
                    assetsFolder.file(fileName, uint8Array);

                    // Replace the full match in the updated HTML
                    // We need to be careful with the full match vs the template
                    updatedHtml = updatedHtml.replace(match[1], filePath);
                } catch (e) {
                    console.warn(`[ZipService] Failed to process asset ${imageCounter}:`, e);
                }
            }
        }

        console.log(`[ZipService] Packaged ${imageCounter} assets.`);

        // 2. Add index.html
        zip.file('index.html', updatedHtml);

        // 3. Generate ZIP blob
        return await zip.generateAsync({ type: 'blob' });
    }
};
