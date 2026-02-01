import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useWebsiteStore = defineStore('website', () => {

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
        subdomain: '' // Custom subdomain part
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
            // Only update if we don't have better ones (preserving user edits?) 
            // For now, we overwrite or merge.

            companyInfo.value.customImages = {
                ...companyInfo.value.customImages,
                hero: assets.hero,
                equipment: assets.hero, // Fallback reuse for equip if needed
                ['Box 1_services']: assets.service, // Map to service boxes maybe?
                ['Box 2_services']: assets.service,
                ['Box 3_services']: assets.service,
                before: assets.gallery,
                after: assets.gallery // Using same/similar for now or could expand
            };

            // Update specific "assets" map if needed, but our 'assets' computed property 
            // relies on 'customImages', so this should trigger reactivity.

        } catch (err) {
            console.error('[Store] Fetch Asset Error:', err);
        }
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

        companyInfo.value = { ...companyInfo.value, ...info, content }
        isGenerated.value = true

        if (newCat && newCat !== oldCat) {
            // Fetch in background
            fetchAssets(newCat);
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

    function markPaid() {
        isPaid.value = true
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
        updateImage
    }
})
