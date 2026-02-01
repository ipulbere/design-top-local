
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

    // Local Storage Helpers
    saveLocal(id, data) {
        const sites = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        sites[id] = { ...data, timestamp: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
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
