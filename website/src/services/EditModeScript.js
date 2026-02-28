export const EditModeScript = `
(function() {
    console.log('[EditMode] Controller Injected');
    
    let isEditMode = false;

    // Messaging to parent
    const notifyParent = (type, data) => {
        window.parent.postMessage({ type, data }, '*');
    };

    // Initialize ContentEditable
    const toggleEditable = (enabled) => {
        isEditMode = enabled;
        document.querySelectorAll('h1, h2, h3, p, span, a, li, button, img, section, header, .bg-cover').forEach(el => {
            // Only apply to leaf nodes OR specific tags
            const isControl = ['A', 'BUTTON', 'IMG', 'SECTION', 'HEADER'].includes(el.tagName) || el.classList.contains('bg-cover');
            if (el.children.length > 0 && !isControl) return; 
            
            if (!isControl || ['A', 'BUTTON'].includes(el.tagName)) el.contentEditable = enabled;
            
            if (enabled) {
                el.classList.add('edit-outline');
                el.addEventListener('blur', handleBlur);
                el.addEventListener('click', handleClick);
            } else {
                el.classList.remove('edit-outline');
                el.removeEventListener('blur', handleBlur);
                el.removeEventListener('click', handleClick);
            }
        });

        // Toggle Section Controls
        document.querySelectorAll('.edit-section-controls').forEach(el => {
            el.style.display = enabled ? 'flex' : 'none';
        });
    };

    const handleBlur = (e) => {
        const el = e.target;
        // Logic to determine path or key
        // For simplicity, we can use a data-attribute if we had them, 
        // but since we are injecting into raw HTML, we might need to send the whole block or index.
        // Let's send the text and the element's identifier.
        notifyParent('text-updated', {
            text: el.innerText,
            id: el.id,
            tagName: el.tagName
            // We'll need a more robust way to map this back to the store
        });
    };

    const handleClick = (e) => {
        if (!isEditMode) return;
        let el = e.target;
        
        // Find if the clicked element or its parent has an image
        let src = null;
        let alt = 'Image';

        if (el.tagName === 'IMG') {
            src = el.src;
            alt = el.alt;
        } else {
            // Check for background-image on current or parents (up to 3 levels for overlays)
            let curr = el;
            for (let i = 0; i < 3 && curr && curr !== document.body; i++) {
                const bg = window.getComputedStyle(curr).backgroundImage;
                if (bg && bg !== 'none' && bg.includes('url(')) {
                    src = bg.replace(/^url\\(["']?/, '').replace(/["']?\\)$/, '');
                    alt = 'Background';
                    break;
                }
                curr = curr.parentElement;
            }
        }

        if (src) {
            e.preventDefault();
            e.stopPropagation();
            notifyParent('image-click', { src, alt });
        }
    };

    // Inject Styles
    const style = document.createElement('style');
    style.innerHTML = \`
        .edit-outline:hover { outline: 2px dashed #3b82f6 !important; cursor: text !important; }
        .edit-outline:focus { outline: 2px solid #2563eb !important; background: rgba(59, 130, 246, 0.05) !important; }
        .edit-section-controls {
            position: absolute;
            top: 0;
            right: 0;
            display: none;
            gap: 4px;
            background: #1e293b;
            padding: 4px;
            border-radius: 0 0 0 8px;
            z-index: 50;
        }
        .edit-btn {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        }
        .edit-btn-add { background: #10b981; }
        .edit-btn-remove { background: #ef4444; }

        /* Target Specific Centering for Service/Feature Sections */
        section#services .grid, 
        section#features .grid,
        .services-grid, 
        .features-grid { 
            display: flex !important;
            flex-wrap: wrap !important;
            justify-content: center !important; 
            gap: 2rem !important;
            margin-left: auto !important;
            margin-right: auto !important;
            width: 100% !important;
        }

        /* Ensure service cards stay centered and don't stretch excessively */
        section#services .grid > div, 
        section#features .grid > div,
        .services-grid > div, 
        .features-grid > div { 
            margin: 0 !important;
            flex: 0 1 350px !important; /* Fixed base width for cards */
            min-width: 300px !important;
        }

        /* Revert global image centering if any exists */
        img { display: inline-block !important; margin: initial !important; }
    \`;
    document.head.appendChild(style);

    // Inject Section Controls
    const addControls = () => {
        // Find potential "repeatable" items (cards, list items)
        const selectors = [
            'section div.grid > div', // Grid items (services)
            'ul > li',                // List items
            '.service-card',          // Named classes
            '.feature-item'
        ];
        
        document.querySelectorAll(selectors.join(', ')).forEach(el => {
            if (el.querySelector('.edit-section-controls')) return;
            
            const controls = document.createElement('div');
            controls.className = 'edit-section-controls';
            controls.innerHTML = \`
                <div class="edit-btn edit-btn-add" title="Clone Item">+</div>
                <div class="edit-btn edit-btn-remove" title="Remove Item">&times;</div>
            \`;
            
            // Positioning helper
            if (getComputedStyle(el).position === 'static') {
                el.style.position = 'relative';
            }
            
            controls.querySelector('.edit-btn-add').addEventListener('click', (e) => {
                e.stopPropagation();
                const clone = el.cloneNode(true);
                clone.querySelectorAll('.edit-section-controls').forEach(c => c.remove());
                el.parentNode.insertBefore(clone, el.nextSibling);
                // Re-init for clones
                setTimeout(addControls, 10);
            });

            controls.querySelector('.edit-btn-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Remove this item?')) el.remove();
            });

            el.appendChild(controls);
        });
    };

    // Listen for mode changes from parent
    window.addEventListener('message', (e) => {
        if (e.data.type === 'toggle-edit') {
            toggleEditable(e.data.enabled);
            if (e.data.enabled) addControls();
        }
    });

    // Helper to wrap sections (if possible or needed)
    // For now, we rely on existing structure.
})();
`;
