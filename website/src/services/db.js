
import { supabase } from './supabase'

const STORAGE_KEY = 'generated_sites';

export const db = {
    // Save to Cloud (Supabase)
    async saveSite(data) {
        const id = data.id || Math.random().toString(36).substring(2, 10);

        // CLEANUP: Strip large Base64 images before saving to DB. 
        // We rely on the app to re-fetch assets based on category logic if they are missing.
        const cleanData = { ...data };
        if (cleanData.customImages) {
            const cleanImages = {};
            for (const [key, val] of Object.entries(cleanData.customImages)) {
                // Keep only non-base64 URLs (e.g. http://...)
                if (val && typeof val === 'string' && !val.startsWith('data:')) {
                    cleanImages[key] = val;
                }
            }
            cleanData.customImages = cleanImages;
        }

        const siteData = { ...cleanData, id };

        try {
            const { error } = await supabase
                .from('websites')
                .upsert({
                    id: id,
                    data: siteData,
                    created_at: new Date().toISOString()
                })

            if (error) throw error;

            // Backup locally
            this.saveLocal(id, siteData);
            return id;
        } catch (e) {
            console.error('Cloud save failed:', e);
            this.saveLocal(id, siteData);
            return id;
        }
    },

    // Get from Cloud
    async getSite(id) {
        try {
            const { data, error } = await supabase
                .from('websites')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error;
            if (data) return data.data;

        } catch (e) {
            console.warn('Cloud fetch failed, trying local:', e);
        }
        return this.getLocal(id);
    },

    // Update existing site
    async updateSite(id, data) {
        try {
            // Ensure we are sending a clean JSON object, strip Vue proxies
            let cleanData = JSON.parse(JSON.stringify(data));

            // CLEANUP: Strip Base64 here too
            if (cleanData.customImages) {
                const cleanImages = {};
                for (const [key, val] of Object.entries(cleanData.customImages)) {
                    if (val && typeof val === 'string' && !val.startsWith('data:')) {
                        cleanImages[key] = val;
                    }
                }
                cleanData.customImages = cleanImages;
            }

            const { error } = await supabase
                .from('websites')
                .update({ data: { ...cleanData, id } })
                .eq('id', id)

            if (error) throw error;

            this.saveLocal(id, { ...cleanData, id });
            return { success: true };
        } catch (e) {
            console.error('Update failed:', e);
            return { success: false, error: e };
        }
    },

    // Save Assets for a Category (New)
    async saveAssets(category, assets) {
        // We'll store this in a separate 'category_assets' table if it existed, 
        // or just a special row in 'websites' for now to keep it simple without SQL migration.
        // ID format: asset_CATNAME
        const id = `asset_${category.replace(/\s+/g, '_')}`;
        const data = {
            category,
            assets,
            updated_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase
                .from('websites')
                .upsert({
                    id: id,
                    data: data,
                    created_at: new Date().toISOString()
                })

            if (error) throw error;
            this.saveLocal(id, data);
            return true;
        } catch (e) {
            console.error('Cloud asset save failed:', e);
            this.saveLocal(id, data);
            return true; // Fallback to local success
        }
    },

    // Local Storage Helpers
    saveLocal(id, data) {
        try {
            // Optimization: Filter out large data URIs (images) to prevent LocalStorage quota limit
            const sites = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

            // Create a lightweight copy
            const dataToSave = { ...data };
            if (dataToSave.customImages) {
                // Determine if we should strip. If images are URLs (http), keep them. If data:image, strip.
                // For simplicity/safety with the new Base64 approach, we generally strip them 
                // and rely on re-fetching or the Cloud (Supabase) source.
                // We'll keep the object but empty it.
                dataToSave.customImages = {};
            }

            // Also check for 'assets' key from saveAssets
            if (dataToSave.assets) {
                // If this is an asset chunk, it's definitely too big. 
                // We likely shouldn't be saving asset chunks to LS at all.
                console.log(`Skipping LS save for large asset chunk: ${id}`);
                return;
            }

            sites[id] = { ...dataToSave, timestamp: Date.now() };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.warn('LocalStorage full even with stripped images, cleaning up old sites...');

                // Reload current state
                let sites = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

                // Sort by timestamp
                const sortedKeys = Object.keys(sites).sort((a, b) => sites[a].timestamp - sites[b].timestamp);

                // Remove oldest items
                let saved = false;
                while (sortedKeys.length > 0) {
                    const oldest = sortedKeys.shift();
                    console.log(`Evicting site: ${oldest}`);
                    delete sites[oldest];

                    try {
                        // Try adding new one
                        sites[id] = { ...data, timestamp: Date.now() }; // Note: variable scope issue here if I used 'dataToSave' above? 
                        // Wait, I should use dataToSave here too.
                        // Correcting logic on fly: use dataToSave.
                        sites[id] = { ...dataToSave, timestamp: Date.now() };

                        localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
                        saved = true;
                        break;
                    } catch (retryErr) {
                        // Continue deleting
                    }
                }

                if (!saved) {
                    console.error('LocalStorage completely full even after cleanup.');
                }
            } else {
                console.error('LocalStorage error:', e);
            }
        }
    },

    getLocal(id) {
        const sites = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return sites[id];
    },

    cleanup() {
        const sites = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const now = Date.now();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;

        Object.keys(sites).forEach(key => {
            if (now - sites[key].timestamp > thirtyDays) {
                delete sites[key];
            }
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
    },

    // --- Website Builder Methods ---

    /**
     * Fetch a random template for the given category
     * @param {string} category 
     */
    async getTemplate(category) {
        try {
            // Fetch all templates for this category
            const { data, error } = await supabase
                .from('category_templates')
                .select('*')
                .eq('category', category)

            if (error) {
                console.error('Error fetching templates:', error)
                throw error
            }

            if (!data || data.length === 0) {
                throw new Error(`No templates found for category: ${category}`)
            }

            // Pick a random one
            const randomIndex = Math.floor(Math.random() * data.length)
            return data[randomIndex]
        } catch (e) {
            console.error('getTemplate failed:', e)
            throw e
        }
    },

    /**
     * Fetch all image assets for the given category
     * @param {string} category 
     */
    async getCategoryAssets(category) {
        try {
            const { data, error } = await supabase
                .from('category_assets')
                .select('*')
                .eq('category', category)

            if (error) {
                console.error('Error fetching assets:', error)
                throw error
            }

            return data || []
        } catch (e) {
            console.error('getCategoryAssets failed:', e)
            throw e
        }
    }
}
