
import { supabase } from './supabase'

const STORAGE_KEY = 'generated_sites';

export const db = {
    // Save to Cloud (Supabase)
    async saveSite(data) {
        const id = data.id || Math.random().toString(36).substring(2, 10);
        const siteData = { ...data, id };

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
            const cleanData = JSON.parse(JSON.stringify(data));

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
            const sites = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            sites[id] = { ...data, timestamp: Date.now() };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.warn('LocalStorage full, cleaning up old sites...');

                // Reload current state (in case parsed variable was huge)
                let sites = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

                // Sort by timestamp
                const sortedKeys = Object.keys(sites).sort((a, b) => sites[a].timestamp - sites[b].timestamp);

                // Remove oldest items until we fit or run out
                let saved = false;
                while (sortedKeys.length > 0) {
                    const oldest = sortedKeys.shift();
                    console.log(`Evicting site: ${oldest}`);
                    delete sites[oldest];

                    try {
                        // Try adding new one
                        sites[id] = { ...data, timestamp: Date.now() };
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
                        saved = true;
                        break;
                    } catch (retryErr) {
                        // Continue deleting
                    }
                }

                if (!saved) {
                    console.error('LocalStorage completely full even after cleanup. Site too large?');
                    // OPTIONAL: Save without images as last resort?
                    // sites[id] = { ...data, customImages: {}, timestamp: Date.now() };
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
    }
}
