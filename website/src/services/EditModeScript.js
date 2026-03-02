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
        // Text tags and card containers
        const textSelectors = 'h1, h2, h3, h4, h5, h6, p, span, a, li, button, img, section, header, .bg-cover, [class*="title"], [class*="heading"]';
        const cardSelectors = '.grid > div, section div.grid > div, .service-card, .feature-item, [class*="card"], [class*="item"]';

        document.querySelectorAll(\`\${textSelectors}, \${cardSelectors}\`).forEach(el => {
            const isTextTag = /^(H[1-6]|P|SPAN|LI|A|BUTTON)$/.test(el.tagName) || el.classList.contains('text-') || el.classList.contains('font-');
            const isControl = ['A', 'BUTTON', 'IMG', 'SECTION', 'HEADER'].includes(el.tagName) || el.classList.contains('bg-cover');
            const isCard = el.classList.contains('service-card') || el.classList.contains('feature-item') || /card|item/.test(el.className) || (el.parentElement?.classList.contains('grid') && el.tagName === 'DIV');

            // Logic to determine if we should add an outline/editable state
            if (el.children.length > 0 && !isTextTag && !isControl && !isCard) return; 
            
            if (isTextTag || ['A', 'BUTTON'].includes(el.tagName)) {
                el.contentEditable = enabled;
            }
            
            if (enabled) {
                el.classList.add('edit-outline');
                if (isCard) el.tabIndex = 0; // Make cards focusable to show controls
                el.addEventListener('blur', handleBlur);
                el.addEventListener('click', handleClick);
            } else {
                el.classList.remove('edit-outline');
                el.removeAttribute('tabindex');
                el.removeEventListener('blur', handleBlur);
                el.removeEventListener('click', handleClick);
                el.contentEditable = false;
            }
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

        /* Show controls only when parent is focused/hovered in edit mode */
        .edit-outline .edit-section-controls { display: none !important; }
        .edit-outline:focus .edit-section-controls,
        .edit-outline:hover .edit-section-controls { 
            display: flex !important; 
        }

        /* Target Specific Centering for Service/Feature Sections */
        section#services .grid, 
        section#features .grid,
        .services-grid, 
        .features-grid { 
            display: flex !important;
            flex-wrap: wrap !important;
            justify-content: center !important; 
            gap: 2rem !important;
        }

        /* Ensure service cards stay centered and don't stretch excessively */
        section#services .grid > div, 
        section#features .grid > div,
        .services-grid > div, 
        .features-grid > div { 
            flex: 0 1 350px !important;
            min-width: 300px !important;
        }

        /* Revert global image centering if any exists */
        img { display: inline-block !important; margin: initial !important; }
    \`;
    document.head.appendChild(style);

    // Inject Section Controls
    const addControls = () => {
        const cardSelectors = [
            'section div.grid > div', 
            'section .grid > div',
            '.services-grid > div',
            '.features-grid > div',
            '.service-card',
            '.feature-item'
        ];
        
        document.querySelectorAll(cardSelectors.join(', ')).forEach(el => {
            if (el.querySelector('.edit-section-controls')) return;
            
            // Skip icons and tiny elements
            if (['I', 'SVG', 'PATH', 'IMG', 'BUTTON'].includes(el.tagName)) return;
            if (el.offsetWidth < 120 || el.offsetHeight < 60) return;
            
            // PREVENT NESTED CONTROLS: 
            // If any parent already matches a card selector, this is likely an icon box or something inside the card.
            let parent = el.parentElement;
            let isNested = false;
            while (parent && parent !== document.body) {
                if (cardSelectors.some(s => parent.matches(s))) {
                    isNested = true;
                    break;
                }
                parent = parent.parentElement;
            }
            if (isNested) return;

            const controls = document.createElement('div');
            controls.className = 'edit-section-controls';
            controls.innerHTML = \`
                <div class="edit-btn edit-btn-add" title="Clone Item">+</div>
                <div class="edit-btn edit-btn-remove" title="Remove Item">&times;</div>
            \`;
            
            if (!['relative', 'absolute', 'fixed'].includes(getComputedStyle(el).position)) {
                el.style.position = 'relative';
            }
            
            controls.querySelector('.edit-btn-add').addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const clone = el.cloneNode(true);
                clone.querySelectorAll('.edit-section-controls').forEach(c => c.remove());
                clone.querySelectorAll('[id]').forEach(withRef => withRef.removeAttribute('id'));
                el.parentNode.insertBefore(clone, el.nextSibling);
                setTimeout(addControls, 10);
            });

            controls.querySelector('.edit-btn-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                el.parentNode.removeChild(el);
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
