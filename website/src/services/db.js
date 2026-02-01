const DB_KEY = 'saas_websites_db';
const RETENTION_DAYS = 30;

export const db = {
    // Save a new site
    saveSite(data) {
        const sites = this.getAllSites();
        const id = (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)).split('-')[0]; // Short random ID

        const newSite = {
            id,
            createdAt: new Date().toISOString(),
            ...data
        };

        sites[id] = newSite;
        this.persist(sites);
        return id;
    },

    // Update an existing site
    updateSite(id, data) {
        const sites = this.getAllSites();
        if (sites[id]) {
            sites[id] = { ...sites[id], ...data };
            this.persist(sites);
            return true;
        }
        return false;
    },

    // Get a site by ID
    getSite(id) {
        this.cleanup(); // Auto-cleanup on access
        const sites = this.getAllSites();
        return sites[id] || null;
    },

    // Internal: Get all
    getAllSites() {
        try {
            return JSON.parse(localStorage.getItem(DB_KEY) || '{}');
        } catch (e) {
            return {};
        }
    },

    // Internal: Save to LS
    persist(sites) {
        localStorage.setItem(DB_KEY, JSON.stringify(sites));
    },

    // Delete old sites
    cleanup() {
        const sites = this.getAllSites();
        const now = new Date();
        const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

        let changed = false;
        Object.keys(sites).forEach(key => {
            const site = sites[key];
            const created = new Date(site.createdAt);
            if (now - created > retentionMs) {
                delete sites[key];
                changed = true;
            }
        });

        if (changed) {
            this.persist(sites);
        }
    }
};
