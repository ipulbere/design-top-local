import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GeminiService } from '../services/GeminiService'
import { ImageService } from '../services/ImageService'
import categoriesData from '../data/categories.json'

export const useWebsiteStore = defineStore('website', () => {

    // ... (keep existing state) ...

    // Dynamic Template Actions
    async function fetchTemplate(categoryName) {
        if (!categoryName) return;

        // Reset to ensure we don't show old template while loading
        companyInfo.value.rawHTML = null;
        companyInfo.value.templateSource = 'loading';

        try {
            console.log(`[Store] Generating template for ${categoryName}...`);

            // 1. Get Category Data
            // 1. Get Category Data
            // The categoryName passed in is often stripped of "1. " (e.g. "Management advisors")
            // But the JSON has "3. Management advisors".
            // We need to find valid data. matching either exact or suffix.

            const categoryData = categoriesData.find(c => {
                // Check exact match
                if (c.Category === categoryName) return true;
                // Check if JSON entry key (without number) matches our categoryName
                const cleanKey = c.Category.replace(/^\d+\.\s+/, '');
                return cleanKey === categoryName;
            });

            if (!categoryData) {
                console.error('Available Categories:', categoriesData.map(c => c.Category));
                throw new Error(`Category data not found for: ${categoryName}`);
            }

            // 2. Prepare Data for Gemini
            // Ensure we have current form data in the structure Gemini expects
            const formData = {
                companyName: companyInfo.value.name,
                phone: companyInfo.value.phone,
                address: companyInfo.value.address,
                email: companyInfo.value.email,
                description: companyInfo.value.description,
                category: categoryName
            };

            // 3. Fetch Images & HTML in Parallel
            const cleanCategoryName = categoryName.replace(/^\d+\.\s+/, '').toLowerCase();

            const [images, rawHtml] = await Promise.all([
                ImageService.getCategoryImages(cleanCategoryName),
                GeminiService.generateWebsiteHtml(categoryData, formData)
            ]);

            // 4. Verify Syntax
            console.log('[Store] Verifying HTML...');
            let html = await GeminiService.verifyAndFixWebsite(rawHtml);

            // 5. Inject Images
            // 5. Inject Images
            Object.keys(images).forEach(sectionKey => {
                const sectionImages = images[sectionKey];
                const isArray = Array.isArray(sectionImages);

                let placeholderKey = '';
                if (sectionKey === 'hero') placeholderKey = 'Hero';
                else if (sectionKey === 'team' || sectionKey === 'team_at_work') placeholderKey = 'Team';
                else if (sectionKey === 'before_and_after') placeholderKey = 'BeforeAndAfter';
                else if (sectionKey === 'happy_customer') placeholderKey = 'HappyCustomer';
                else placeholderKey = sectionKey;

                if (!placeholderKey) return;

                if (isArray && sectionImages.length > 0) {
                    sectionImages.forEach(imgUrl => {
                        html = html.replace(`[DESC_PHOTO: ${placeholderKey}]`, imgUrl);
                    });
                } else if (!isArray && sectionImages) {
                    html = html.split(`[DESC_PHOTO: ${placeholderKey}]`).join(sectionImages);
                }
            });

            // 5b. Specific Fallback for Team if not found in Supabase
            // If we didn't find a 'team' key in the images object, or it was empty involved above.
            // We check if the placeholder still exists.
            if (html.includes('[DESC_PHOTO: Team]')) {
                console.warn('[Store] Team image not found in Supabase. Using generic fallback.');
                // Use a high-quality generic team meeting image from Unsplash or Placehold
                const genericTeam = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80";
                html = html.split('[DESC_PHOTO: Team]').join(genericTeam);
            }

            // 6. Force Styling Injection (Failsafe)
            if (!html.includes('cdn.tailwindcss.com')) {
                const headEnd = html.indexOf('</head>');
                const tailwindScript = `<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">`;
                if (headEnd !== -1) {
                    html = html.substring(0, headEnd) + tailwindScript + html.substring(headEnd);
                } else {
                    html = tailwindScript + html;
                }
            }

            // 7. Update State
            companyInfo.value.rawHTML = html;
            companyInfo.value.templateSource = 'ai';
            console.log('[Store] Template generated successfully.');

        } catch (err) {
            console.error('[Store] Template Generation Error:', err);
            // FAIL LOUDLY: Do not fallback.
            companyInfo.value.rawHTML = `<div style="color:red; padding:20px; text-align:center;">
                <h1>Generation Failed</h1>
                <p>${err.message}</p>
                <button onclick="window.location.reload()">Retry</button>
            </div>`;
            companyInfo.value.templateSource = 'error';
            // throw err; // Optional: if we want to catch it in the component
        }
    }

    // Input Data
    const companyInfo = ref({
        name: 'Your Company',
        email: '',
        phone: '',
        address: '123 Main St, City, Country',
        category: 'General Service',
        description: 'We provide professional services for your needs. Quality guaranteed.',
        // New Schema Fields
        services: [],
        certificates: '',
        offer: { text: '', subtext: '' },
        equipment: '',
        uniforms: false,
        hours: '',
        showBeforeAfter: true,
        showBeforeAfter: true,
        raw_category_data: null,
        subdomain: '', // Custom subdomain part
        rawHTML: null, // Dynamic AI Template
        templateSource: 'default' // 'default' or 'ai'
    })

    // Content Generation Helper
    function generateContent(category, name, city) {
        const cat = category || 'Service';
        return {
            hero: {
                headline: `Professional ${cat} Services`,
                subheadline: `Top-rated ${cat} in ${city}. We provide expert solutions tailored to your needs with a focus on quality and customer satisfaction.`,
                cta: 'Get a Free Quote'
            },
            services: {
                title: 'Our Services',
                subtitle: `Comprehensive ${cat} solutions for residential and commercial clients.`
            },
            trust: {
                title: 'Why Choose Us',
                copy: `Licensed, insured, and dedicated to excellence. Our team of ${cat} experts is ready to help.`
            },
            offer: {
                title: 'Special Offer',
                text: 'Free Initial Consultation'
            },
            gallery: {
                title: 'Our Work',
                subtitle: `See the difference our professional ${cat} services make.`
            },
            contact: {
                title: 'Contact Us',
                subtitle: `Ready to start? Call us today for your ${cat} needs.`
            }
        };
    }

    // Helper to get service specific images for the gallery loop
    function getServiceImage(service, type) {
        const key = `${service}_${type}`;
        if (companyInfo.value.customImages) {
            if (companyInfo.value.customImages[key]) return companyInfo.value.customImages[key];
            // Fallback to global AI generated asset if available
            if (companyInfo.value.customImages[type]) return companyInfo.value.customImages[type];
        }
        return getPlaceholder(type, service);
    }

    // Asset Logic: Return deterministic assets based on category/hero reference
    // In a real app, these would be paths to specific generated files.
    // Here we simulate "reused assets" by generating an SVG placeholder with the category name.

    function getPlaceholder(type, text) {
        // Valid types: logo, team, equipment, before, after
        // We use a free placeholder service for the demo to support infinite categories immediately
        // or fallback to our local SVGs if we had them.
        const categoryName = companyInfo.value.category || 'General';
        const slug = categoryName.toLowerCase().replace(/\s+/g, '-');
        // Using placehold.co for reliable dynamic images
        return `https://placehold.co/800x600/e2e8f0/1e293b?text=${encodeURIComponent(categoryName + ' ' + text)}`;
    }

    const assets = computed(() => {
        const custom = companyInfo.value.customImages || {};
        return {
            logo: '/images/logo_simple.svg', // Keep standard logo for now
            team: custom['team'] || getPlaceholder('team', 'Team'),
            equipment: custom['equipment'] || getPlaceholder('equipment', 'Equipment'),
            before: custom['before'] || getPlaceholder('before', 'Before Project'),
            after: custom['after'] || getPlaceholder('after', 'After Project'),
        }
    })

    // Dynamic Content for High-Converting Sections
    const certifications = computed(() => {
        // Return array from comma-separated string if available, otherwise default
        if (companyInfo.value.certificates) {
            return companyInfo.value.certificates.split(', ').map(c => c.trim())
        }
        const cat = companyInfo.value.category || 'General';
        return [
            `Licensed ${cat} Professional`,
            'Fully Insured & Bonded',
            'Certified Safety Expert',
            '5-Star Rated Business'
        ];
    });

    const offer = computed(() => {
        if (companyInfo.value.offer?.text) {
            return {
                title: 'Special Offer',
                text: companyInfo.value.offer.text,
                subtext: companyInfo.value.offer.subtext || 'Contact us today.'
            }
        }
        return {
            title: 'Limited Time Offer',
            text: 'Get 20% Off Your First Service',
            subtext: 'Valid for new customers this month only.'
        };
    });

    // Status
    const isGenerated = ref(false)
    const isApproved = ref(false)
    const isPaid = ref(false)

    // Actions
    async function fetchAssets(category) {
        // LEGACY: Disabled in favor of ImageService.js
        console.log('[Store] fetchAssets disabled. Using ImageService instead.');
        /*
        if (!category) return;

        // Don't re-fetch if we already have assets for this exact category in this session
        // (Optional optimization logic)

        try {
            console.log(`[Store] Fetching assets for ${category}...`);
            const response = await fetch('/.netlify/functions/generate-assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category })
            });

            if (!response.ok) throw new Error('Asset generation failed');

            const assets = await response.json();
            console.log(`[Store] Received assets:`, assets);

            // Update customImages with the new assets
            const newImages = { ...companyInfo.value.customImages };

            // 1. Core Assets
            newImages.hero = assets.hero;
            newImages.team = assets.team;

            // 2. Map Service Images
            // The DB returns service_0, service_1 etc.
            // We map them to specific service keys if needed, or just store them.
            // For now, we'll assign them to service_before/after for the demo loop.

            const services = companyInfo.value.services || ['Service 1', 'Service 2', 'Service 3'];

            services.forEach((service, index) => {
                // Use service_X from DB or fallback to service_0
                // Use gallery_X from DB or fallback to gallery_0

                const svcAsset = assets[`service_${index}`] || assets[`service_0`];
                const galAsset = assets[`gallery_${index}`] || assets[`gallery_0`];

                if (svcAsset) newImages[`${service}_after`] = svcAsset;
                if (galAsset) newImages[`${service}_before`] = galAsset;
            });

            // Global fallback
            if (assets.gallery_0) newImages.before = assets.gallery_0;
            if (assets.service_0) newImages.after = assets.service_0;
            if (assets.service_0) newImages.equipment = assets.service_0; // Fallback for equipment if no specific equipment asset

            companyInfo.value.customImages = newImages;

        } catch (err) {
            console.error('[Store] Fetch Asset Error:', err);
        }
        */
    }

    function updateCompanyInfo(info) {
        // Extract city for generation
        const city = info.address ? info.address.split(',')[1] || 'Your Area' : 'Your Area';

        // Merge enriched content
        let content = info.content || {}; // Use passed content if available (from JSON)

        // If content is missing (fallback for non-enriched JSON items), generate it
        if (!content.hero) {
            content = generateContent(info.category, info.name, city);
        }

        // Detect if category changed to trigger asset fetch
        const oldCat = companyInfo.value.category;
        const newCat = info.category || oldCat;

        // Reset assets if category changes to prevent stale images
        if (newCat && oldCat && newCat !== oldCat) {
            console.log(`[Store] Category changed from ${oldCat} to ${newCat}. Clearing stale assets.`);
            companyInfo.value.customImages = {};
            companyInfo.value.rawHTML = null;
        }

        companyInfo.value = { ...companyInfo.value, ...info, content }
        isGenerated.value = true

        if (newCat && newCat !== oldCat) {
            // Fetch in background
            fetchAssets(newCat);
            fetchTemplate(newCat);
        } else if (newCat && !companyInfo.value.customImages?.hero) {
        } else if (newCat && !companyInfo.value.customImages?.hero) {
            // Fetch if we have no images yet
            fetchAssets(newCat);
        }
    }

    function updateContent(path, value) {
        // Helper to update deep nested paths like 'content.hero.headline'
        const keys = path.split('.');
        let current = companyInfo.value;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
    }

    function updateImage(path, prompt) {
        // Regenerate image URL based on prompt (simulated with placehold.co)
        // path could be 'assets.hero' or a service index 'services[0].image' logic

        // For strictly "assets" defined in computed, we might need to override them.
        // However, the current 'assets' is a computed property derived from companyInfo.
        // To persist changes, we should store custom asset overrides in companyInfo.

        if (!companyInfo.value.customImages) companyInfo.value.customImages = {};

        // Generate new URL "Gemini nano banana style" (Mock)
        const newUrl = `https://placehold.co/800x600/2563eb/ffffff?text=${encodeURIComponent(prompt)}`;

        companyInfo.value.customImages[path] = newUrl;
    }

    function approveWebsite() {
        isApproved.value = true
    }

    function markPaid() {
        isPaid.value = true
    }

    // Legacy fetchTemplate was here. Using the one defined at the top.

    // Process raw HTML: Replace placeholders with Real Image requests (or placeholders for now)
    function processTemplate(html, category) {
        let processed = html;

        // Regex to find [DESC_PHOTO: ...]
        // Syntax: src="[DESC_PHOTO: description]"
        // We replace it with a placeholder URL that includes the description for the Asset Generator to pick up later (or now).
        // For immediate visual consistency, we can use placehold.co or trigger an asset fetch.

        const regex = /\[DESC_PHOTO:\s*(.*?)\]/g;

        processed = processed.replace(regex, (match, description) => {
            // Logic:
            // 1. We could trigger a precise asset generation here.
            // 2. For now, return a placeholder URL that LOOKS like a real image request
            //    so the UI renders something.
            //    We can store these descriptions to request "Real" images in the background.

            console.log(`[Template] Found Image Requirement: ${description}`);

            // Unique ID for this image slot based on description hash or simple random
            // In a real app, we'd map this to the 'assets' object.

            return `https://placehold.co/800x600/e2e8f0/1e293b?text=${encodeURIComponent(description.substring(0, 20) + '...')}`;
        });

        // Also simple text hydration? (Optional, if AI logic inserts [COMPANY_NAME] tags)
        // processed = processed.replace(/\[COMPANY_NAME\]/g, companyInfo.value.name);

        return processed;
    }

    return {
        companyInfo,
        assets,
        isGenerated,
        isApproved,
        isPaid,
        updateCompanyInfo,
        approveWebsite,
        markPaid,
        certifications,
        offer,
        getServiceImage,
        updateContent,
        updateContent,
        updateImage,
        fetchTemplate
    }
})
