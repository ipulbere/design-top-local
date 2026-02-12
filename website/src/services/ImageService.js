
import { supabase } from './supabase'
import categoryImages from '../data/category-images.json'

const BUCKET_NAME = 'category-pictures'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const CDN_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/`

export const ImageService = {
    /**
     * Fetch and organize images for a specific category.
     * @param {string} categoryName - The category name (e.g., "Windows")
     * @returns {Promise<Object>} - Object with section names as keys and image URLs as values.
     */
    async getCategoryImages(categoryName) {
        if (!categoryName) return {}

        // Normalize category name for matching
        // User example: "windows_Hero_1.jpg" implies strict "windows".
        // Also handle spaces: "Management advisors" -> "management_advisors"
        // And special chars: "HVAC installers & contractors" -> "hvac_installers_contractors"
        let normalizedCategory = categoryName.toLowerCase().trim()
            .replace(/&/g, 'and') // Replace & with 'and' first? Or remove? 
            // Actually, the user file is: hvac_installers_contractors_Hero...
            // If category is "HVAC installers & contractors", standard replace would be "hvac_installers_&_contractors"
            // We need to clean special chars.

            .replace(/[^a-z0-9\s]/g, '') // Remove special chars like &
            .replace(/\s+/g, '_'); // Space to underscore

        try {
            // 1. List all files in the bucket
            // Since we can't do wildcard search easily on 'list', we might need to list root and filter?
            // Or if they are in a folder? User example: "category-pictures/windows_Hero_1.jpg".
            // It seems they are all in the root of the bucket? OR strict folder?
            // "https://.../category-pictures/windows_Hero_1.jpg" implies they are at the root of the bucket.

            // 1. List all files from local JSON (source of truth)
            // matching the category prefix
            const data = categoryImages;
            const error = null; // No network error possible here

            // 2. Filter and Parse
            const relevantFiles = data.filter(filename =>
                filename.toLowerCase().startsWith(normalizedCategory + '_')
            )

            const groupedImages = {}

            relevantFiles.forEach(filename => {
                // filename: category_section_number.jpg
                // e.g. windows_Hero_1.jpg
                // e.g. hvac_installers_contractors_Hero_2.jpg

                // 1. Remove the category prefix (already normalized and matched)
                // We matched with startsWith(normalizedCategory + '_'), so we can safely slice it off.
                // +1 for the underscore.
                const nameWithoutCategory = filename.substring(normalizedCategory.length + 1);
                // e.g. "Hero_2.jpg"

                // 2. Split the rest to get section and number
                const parts = nameWithoutCategory.split('_');
                if (parts.length < 2) return; // Need at least section and number.ext

                // Last part is number.ext
                const numberPart = parts[parts.length - 1];
                const number = parseInt(numberPart.split('.')[0]);
                if (isNaN(number)) return;

                // Section is the rest
                const sectionParts = parts.slice(0, parts.length - 1);
                const section = sectionParts.join('_').toLowerCase(); // "hero"

                if (!groupedImages[section]) {
                    groupedImages[section] = []
                }

                groupedImages[section].push({
                    name: filename,
                    number: number,
                    url: CDN_URL + filename
                })
            })

            // 3. Selection Logic (Highest Number)
            const result = {}

            Object.keys(groupedImages).forEach(section => {
                const images = groupedImages[section]
                // Sort descending by number
                images.sort((a, b) => b.number - a.number)

                if (section === 'before_and_after') {
                    // special case: return top 2
                    result[section] = images.slice(0, 2).map(img => img.url)
                } else {
                    // default: return top 1
                    result[section] = images[0].url
                }
            })

            console.log(`Images for ${categoryName}:`, result)
            return result

        } catch (e) {
            console.error('ImageService Error:', e)
            return {}
        }
    }
}
