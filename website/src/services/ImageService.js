import { supabase } from './supabase'
import categoryImagesMap from '../data/category-images-map.json'

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
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '_');

        try {
            // Read from the direct exact map of category -> type -> urls

            // First check direct match
            let categoryData = categoryImagesMap[normalizedCategory];

            // If not found, try to find a matching prefix/suffix as a fallback
            if (!categoryData) {
                const availableCategories = Object.keys(categoryImagesMap);
                const matchingCategory = availableCategories.find(cat =>
                    normalizedCategory.includes(cat) || cat.includes(normalizedCategory)
                );

                if (matchingCategory) {
                    categoryData = categoryImagesMap[matchingCategory];
                }
            }

            if (!categoryData) {
                console.warn(`No images found for category: ${categoryName} (normalized: ${normalizedCategory})`);
                return {};
            }

            const result = {}

            const getIndex = (url) => {
                const match = url.match(/_(\d+)\.(?:jpg|png|jpeg)$/i);
                return match ? parseInt(match[1], 10) : 0;
            };

            Object.keys(categoryData).forEach(section => {
                let urls = categoryData[section];
                if (!urls || urls.length === 0) return;

                // Sort urls by index (highest first)
                urls = [...urls].sort((a, b) => getIndex(b) - getIndex(a));

                // Normalize section name to lowercase for the result object
                const normalizedSection = section.toLowerCase();

                if (normalizedSection === 'before_and_after') {
                    // special case: return top 2 (sorted by highest index)
                    result[normalizedSection] = urls.slice(0, 2);
                } else {
                    // default: return the one with the highest index
                    result[normalizedSection] = urls[0];
                }
            })

            // Fallback: If AI requested happy_customer but we only have before_and_after
            if (!result.happy_customer && result.before_and_after) {
                console.log(`[ImageService] Falling back to before_and_after for happy_customer in ${categoryName}`);
                result.happy_customer = result.before_and_after[0];
            }

            result.library = categoryData;
            console.log(`Images for ${categoryName}:`, result)
            return result

        } catch (e) {
            console.error('ImageService Error:', e)
            return {}
        }
    }
}
