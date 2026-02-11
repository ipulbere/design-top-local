
import { supabase } from './supabase'

const BUCKET_NAME = 'category-pictures'
const CDN_URL = `https://sfprlxnbahkkpvodjewd.supabase.co/storage/v1/object/public/${BUCKET_NAME}/`

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

            const { data, error } = await supabase
                .storage
                .from(BUCKET_NAME)
                .list('', {
                    limit: 1000, // Fetch enough to cover all
                    offset: 0,
                    sortBy: { column: 'name', order: 'asc' },
                })

            if (error) {
                console.error('Error listing images:', error)
                throw error
            }

            // 2. Filter and Parse
            const relevantFiles = data.filter(file =>
                file.name.toLowerCase().startsWith(normalizedCategory + '_')
            )

            const groupedImages = {}

            relevantFiles.forEach(file => {
                // filename: category_section_number.jpg
                // e.g. windows_Hero_1.jpg
                // e.g. hvac_installers_contractors_Hero_2.jpg

                // 1. Remove the category prefix (already normalized and matched)
                // We matched with startsWith(normalizedCategory + '_'), so we can safely slice it off.
                // +1 for the underscore.
                const nameWithoutCategory = file.name.substring(normalizedCategory.length + 1);
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
                    name: file.name,
                    number: number,
                    url: CDN_URL + file.name
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
