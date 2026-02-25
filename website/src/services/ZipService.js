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

        // DEBUG: Check first part of HTML for data URIs
        console.log('[ZipService] Packaging HTML (first 200 chars):', html.substring(0, 200));

        // 1. Process images (src="..." and url("..."))
        const imagePatterns = [
            {
                regex: /src=["'](data:image\/(png|jpg|jpeg|webp);base64,([^"']+))["']/g,
                extIndex: 2,
                dataIndex: 3
            },
            {
                regex: /url\(["']?(data:image\/(png|jpg|jpeg|webp);base64,([^"'\)]+))["']?\)/g,
                extIndex: 2,
                dataIndex: 3
            }
        ];

        let updatedHtml = html;
        let imageCounter = 0;

        for (const pattern of imagePatterns) {
            let match;
            while ((match = pattern.regex.exec(html)) !== null) {
                imageCounter++;
                const fullUri = match[1];
                const extension = match[pattern.extIndex];
                const base64Data = match[pattern.dataIndex];
                const fileName = `asset_${imageCounter}.${extension}`;
                const filePath = `assets/${fileName}`;

                console.log(`[ZipService] Localizing asset ${imageCounter}: ${fileName}`);

                // Add to assets folder directly using base64 support
                assetsFolder.file(fileName, base64Data, { base64: true });

                // Update HTML to point to local path
                updatedHtml = updatedHtml.replaceAll(fullUri, filePath);
            }
        }

        console.log(`[ZipService] Packaged ${imageCounter} assets.`);

        // 2. Add index.html
        zip.file('index.html', updatedHtml);

        // 3. Generate ZIP blob
        return await zip.generateAsync({ type: 'blob' });
    }
};
