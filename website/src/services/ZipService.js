import JSZip from 'jszip';

export const ZipService = {
    /**
     * Packages the website HTML and base64 images into a ZIP file.
     * Returns a Base64 string directly for reliable transfer.
     */
    async packageWebsite(html, siteName) {
        const zip = new JSZip();
        const assetsFolder = zip.folder('assets');

        console.log(`[ZipService] Packaging site: ${siteName}. HTML Length: ${html?.length || 0}`);
        if (!html) throw new Error('Cannot package empty HTML');

        // 1. Process images (src="..." and url("..."))
        // regex support for png, jpg, jpeg, webp, and svg+xml
        const imagePatterns = [
            {
                regex: /src=["'](data:image\/(png|jpg|jpeg|webp|svg\+xml);base64,([^"']+))["']/g,
                extIndex: 2,
                dataIndex: 3
            },
            {
                regex: /url\(["']?(data:image\/(png|jpg|jpeg|webp|svg\+xml);base64,([^"'\)]+))["']?\)/g,
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
                let extension = match[pattern.extIndex];
                if (extension.includes('svg')) extension = 'svg'; // Clean svg+xml to svg

                const base64Data = match[pattern.dataIndex];
                const fileName = `asset_${imageCounter}.${extension}`;
                const filePath = `assets/${fileName}`;

                // Add to assets folder using native base64 support
                assetsFolder.file(fileName, base64Data, { base64: true });

                // Update HTML to point to local path
                updatedHtml = updatedHtml.replaceAll(fullUri, filePath);
            }
        }

        console.log(`[ZipService] Packaged ${imageCounter} assets.`);

        // 2. Add index.html
        zip.file('index.html', updatedHtml);

        // 3. Add _headers file to force Netlify to serve as HTML
        const headersContent = `/*\n  X-Frame-Options: DENY\n  X-XSS-Protection: 1; mode=block\n/index.html\n  Content-Type: text/html\n`;
        zip.file('_headers', headersContent);

        // 4. Generate ZIP as Base64 string
        const base64Zip = await zip.generateAsync({ type: 'base64' });
        console.log(`[ZipService] ZIP generated. Base64 length: ${base64Zip.length}`);

        return base64Zip;
    }
};
