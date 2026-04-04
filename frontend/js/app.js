// frontend/js/app.js
import { fetchProducts } from './api.js?v=3';
import { cart, addToCart, updateQuantity, clearCart, setQuantity, removeCartItem } from './cart.js?v=3';
import { renderProducts, renderCart, updateCardUI } from './ui.js?v=3';

document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTES Y ELEMENTOS DEL DOM ---
    const WHATSAPP_NUMBER = '+573052494444';
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwmf4kk65LmUAt5Ff4Aeek_ThZXnGecYVHfFUztZGgdkn1jdH30ySmyx8eEQqQTg9MUmg/exec';

    const mainContent = document.getElementById('main-content');
    const mainHeader = document.getElementById('main-header');
    const headerTop = document.getElementById('header-top');
    const controlsRow = document.getElementById('controls-row');
    
    const tabsContainer = document.getElementById('tabs-container');
    const productsContainer = document.getElementById('products-container');
    const cartItemsEl = document.getElementById('cart-items');
    const cartTotalEl = document.getElementById('cart-total');
    const form = document.getElementById('customer-form');
    const searchBar = document.getElementById('search-bar');
    const searchClearBtn = document.getElementById('search-clear-btn');
    
    // Cart Drawer elements
    const mobileCartBtn = document.getElementById('mobile-cart-fab');
    const mobileCartCount = document.getElementById('fab-badge');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartOverlay = document.getElementById('cart-overlay');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    const toastContainer = document.getElementById('toast-container');

    // Category trigger elements
    const categoryTrigger = document.getElementById('category-trigger');
    const categoryMenu = document.getElementById('category-menu');
    const selectedCategoryText = document.getElementById('selected-category');

    // Zoom elements
    const zoomModal = document.getElementById('zoom-modal');
    const zoomImg = document.getElementById('zoom-img');

    let allProducts = [];

    // --- RESPONSIVE CHECK ---
    const isMobile = () => window.innerWidth < 1024;

    // ===================================================================
    // SCROLL HEADER — Progressive multi-phase shrink (MOBILE ONLY)
    // ===================================================================
    // Uses a "virtual progress" variable (0→1) that increments/decrements
    // proportionally to scroll deltas, giving immediate response to
    // direction changes without requiring the user to scroll back to top.
    //
    // Phase 1 (progress 0.0–0.4): Title fades out + shrinks
    // Phase 2 (progress 0.4–0.7): Search bar + category button shrink
    // Phase 3 (progress 0.7–1.0): Entire header slides up via translateY
    // ===================================================================
    let headerProgress = 0;          // 0 = fully expanded, 1 = fully collapsed
    const PROGRESS_SPEED = 0.012;    // how fast progress changes per px of scroll delta
    let lastScrollTop = 0;
    let scrollTicking = false;

    function handleScroll() {
        if (!mainContent || !mainHeader) return;

        const scrollTop = mainContent.scrollTop;
        const scrollDelta = scrollTop - lastScrollTop;

        if (isMobile()) {
            // Blur search bar to hide keyboard if scrolling
            if (Math.abs(scrollDelta) > 5 && document.activeElement === searchBar) {
                searchBar.blur();
            }

            // Update virtual progress based on scroll direction
            if (scrollDelta > 0) {
                headerProgress = Math.min(1, headerProgress + Math.abs(scrollDelta) * PROGRESS_SPEED);
            } else if (scrollDelta < 0) {
                headerProgress = Math.max(0, headerProgress - Math.abs(scrollDelta) * PROGRESS_SPEED);
            }

            // If near top of page, force progress toward 0
            if (scrollTop <= 10) {
                headerProgress = 0;
            }

            applyHeaderProgress(headerProgress);
        } else {
            // Desktop: reset everything
            headerProgress = 0;
            resetHeaderStyles();
        }

        lastScrollTop = scrollTop;
        scrollTicking = false;
    }

    function applyHeaderProgress(p) {
        // --- Phase 1 (0.0–0.5): Title fades & shrinks completely ---
        const p1 = Math.min(Math.max((p - 0.0) / 0.5, 0), 1); // 0→1 within phase
        if (headerTop) {
            const height = 40 - (40 * p1);        // 40px → 0px
            const opacity = 1 - p1;
            headerTop.style.height = `${height}px`;
            headerTop.style.opacity = `${opacity}`;
        }

        // --- Phase 2 (0.5–1.0): Search bar + category button shrink slightly, but stay visible ---
        const p2 = Math.min(Math.max((p - 0.5) / 0.5, 0), 1); // 0→1 within phase
        if (controlsRow) {
            const rowHeight = 44 - (10 * p2);      // 44px → 34px
            const rowPadY = 8 - (4 * p2);           // 8px → 4px
            controlsRow.style.height = `${rowHeight}px`;
            controlsRow.style.paddingTop = `${rowPadY}px`;
            controlsRow.style.paddingBottom = `${rowPadY}px`;
        }
        if (searchBar) {
            const sbHeight = 36 - (8 * p2);       // 36px → 28px
            const sbFont = 16 - (3 * p2);           // 16px → 13px
            searchBar.style.height = `${sbHeight}px`;
            searchBar.style.fontSize = `${sbFont}px`;
        }
        if (categoryTrigger) {
            const ctHeight = 36 - (8 * p2);       // 36px → 28px
            const ctFont = 11 - (1 * p2);           // 11px → 10px
            categoryTrigger.style.height = `${ctHeight}px`;
            categoryTrigger.style.fontSize = `${ctFont}px`;
        }

        // Adjust header wrapper padding to absorb gap
        const headerWrapper = mainHeader.querySelector('div');
        if (headerWrapper) {
            const wrapperGap = 8 - (8 * p1);       // 8px → 0px gap
            const wrapperPadY = 8 - (4 * Math.max(p1, p2)); // 8px → 4px
            headerWrapper.style.gap = `${wrapperGap}px`;
            headerWrapper.style.paddingTop = `${wrapperPadY}px`;
            headerWrapper.style.paddingBottom = `${wrapperPadY}px`;
        }
    }

    function resetHeaderStyles() {
        if (headerTop) {
            headerTop.style.height = '';
            headerTop.style.opacity = '';
        }
        if (controlsRow) {
            controlsRow.style.height = '';
            controlsRow.style.paddingTop = '';
            controlsRow.style.paddingBottom = '';
        }
        if (searchBar) {
            searchBar.style.height = '';
            searchBar.style.fontSize = '';
        }
        if (categoryTrigger) {
            categoryTrigger.style.height = '';
            categoryTrigger.style.fontSize = '';
        }
        mainHeader.style.transform = '';
        const headerWrapper = mainHeader.querySelector('div');
        if (headerWrapper) {
            headerWrapper.style.gap = '';
            headerWrapper.style.paddingTop = '';
            headerWrapper.style.paddingBottom = '';
        }
    }

    if (mainContent) {
        mainContent.addEventListener('scroll', () => {
            if (!scrollTicking) {
                requestAnimationFrame(handleScroll);
                scrollTicking = true;
            }
            // Category label: show "Categoría" while scrolling
            handleScrollCategoryLabel();
        }, { passive: true });
    }

    // ===================================================================
    // CATEGORY LABEL DEBOUNCE (Punto 3)
    // ===================================================================
    let activeCategoryName = '';
    let scrollDebounceTimer = null;
    let initialLabelTimer = null;
    let labelReady = false;

    function getActiveCategoryName() {
        const activeBtn = document.querySelector('.tab-button.active');
        return activeBtn ? activeBtn.dataset.category : '';
    }

    function fadeCategoryLabel(text) {
        if (!selectedCategoryText) return;
        // Don't re-fade if text is already showing
        if (selectedCategoryText.textContent === text) return;
        selectedCategoryText.style.opacity = '0';
        setTimeout(() => {
            selectedCategoryText.textContent = text;
            selectedCategoryText.style.opacity = '1';
        }, 250);
    }

    function handleScrollCategoryLabel() {
        if (!labelReady) return;
        // During active scroll → show generic "Categoría"
        if (selectedCategoryText && selectedCategoryText.textContent !== 'Categoría') {
            fadeCategoryLabel('Categoría');
        }
        // Clear previous debounce and set new one
        clearTimeout(scrollDebounceTimer);
        scrollDebounceTimer = setTimeout(() => {
            const name = getActiveCategoryName();
            if (name) {
                fadeCategoryLabel(name);
            }
        }, 400);
    }

    function initCategoryLabel() {
        if (selectedCategoryText) {
            selectedCategoryText.textContent = 'Categoría';
        }
        initialLabelTimer = setTimeout(() => {
            labelReady = true;
            const name = getActiveCategoryName();
            if (name) {
                fadeCategoryLabel(name);
            }
        }, 2500);
    }

    // --- CATEGORY DROPDOWN TRIGGER ---
    if (categoryTrigger && categoryMenu) {
        categoryTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            categoryMenu.classList.toggle('hidden');
        });
        
        document.addEventListener('click', () => {
            categoryMenu.classList.add('hidden');
        });
    }

    // --- TABS CLICK (Category Selection) ---
    tabsContainer.addEventListener('click', e => {
        const button = e.target.closest('.tab-button');
        if (button) {
            const category = button.dataset.category;
            
            // Update active state in trigger dropdown
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update visible label immediately (override debounce)
            activeCategoryName = category;
            clearTimeout(scrollDebounceTimer);
            fadeCategoryLabel(category);
            categoryMenu.classList.add('hidden');

            // Clear search when switching categories
            if (searchBar.value.trim()) {
                searchBar.value = '';
                updateClearButtonVisibility();
            }

            // Toggle product tab views
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('hidden');
                content.classList.remove('active');
            });

            const targetContent = document.getElementById(`category-${category.replace(/\s+/g, '-')}`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
                targetContent.classList.add('active');
            }

            // Show all cards in this category (reset any search filtering)
            const allCards = targetContent ? targetContent.querySelectorAll('.product-card') : [];
            allCards.forEach(card => {
                card.classList.remove('hidden');
                card.style.display = 'flex';
            });

            // Scroll back to top of product grid
            if (mainContent) {
                mainContent.scrollTop = 0;
            }
        }
    });

    // --- TOAST NOTIFICATION ---
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);

        toast.offsetHeight;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // ===================================================================
    // PRODUCT GRID EVENT DELEGATION (Toggles, Steppers, Zoom, Qty Edit)
    // ===================================================================
    productsContainer.addEventListener('click', e => {

        // 1. UNIT MODE TOGGLE (Punto 2: colores + Punto 4: conservar cantidad)
        const toggleBtn = e.target.closest('.unit-toggle');
        if (toggleBtn) {
            e.stopPropagation();
            const card = toggleBtn.closest('.product-card');
            const productId = card.getAttribute('data-product-id');
            const unidadesPorCaja = parseInt(card.getAttribute('data-unidades-por-caja')) || 12;
            const currentMode = toggleBtn.getAttribute('data-mode');
            const product = allProducts.find(p => p.id == productId);

            const oldMode = currentMode;
            const newMode = currentMode === 'caja' ? 'unidad' : 'caja';
            const oldCartKey = `${productId}-${oldMode}`;
            const newCartKey = `${productId}-${newMode}`;

            // --- Punto 4: Conservar la cantidad ingresada ---
            // Keep the SAME quantity number, just move to new mode.
            // The price recalculation happens in updateCardUI().
            const oldCartItem = cart[oldCartKey];
            if (oldCartItem && oldCartItem.quantity > 0) {
                const sameQty = oldCartItem.quantity;

                // Remove old entry and create new one with SAME quantity
                removeCartItem(oldCartKey);
                if (product) {
                    addToCart(product, sameQty, newMode);
                }
            }

            // --- Toggle visual state (Punto 2: colores) ---
            // Caja state: bg-white, text-primary, border-primary (outlined)
            // Unidad state: bg-primary, text-on-primary, border-transparent (solid)
            if (newMode === 'unidad') {
                toggleBtn.textContent = 'Unidad';
                toggleBtn.setAttribute('data-mode', 'unidad');
                toggleBtn.classList.remove('bg-white', 'text-primary', 'border-primary');
                toggleBtn.classList.add('bg-primary', 'text-on-primary', 'border-transparent');
            } else {
                toggleBtn.textContent = `Caja ${unidadesPorCaja}`;
                toggleBtn.setAttribute('data-mode', 'caja');
                toggleBtn.classList.remove('bg-primary', 'text-on-primary', 'border-transparent');
                toggleBtn.classList.add('bg-white', 'text-primary', 'border-primary');
            }
            
            updateCardUI(card);
            renderCart(cartItemsEl, cartTotalEl, mobileCartCount);
            return;
        }

        // 2. EDITABLE QUANTITY (Punto 6) — Click on qty-display to edit
        const qtyDisplay = e.target.closest('.qty-display');
        if (qtyDisplay && !qtyDisplay.classList.contains('editing')) {
            e.stopPropagation();
            const card = qtyDisplay.closest('.product-card');
            const productId = card.getAttribute('data-product-id');
            const cardToggle = card.querySelector('.unit-toggle');
            const activeMode = cardToggle ? cardToggle.getAttribute('data-mode') : 'unidad';
            const cartKey = `${productId}-${activeMode}`;
            const currentQty = cart[cartKey] ? cart[cartKey].quantity : 0;

            // Create input element
            const input = document.createElement('input');
            input.type = 'text';
            input.inputMode = 'numeric';
            input.pattern = '[0-9]*';
            input.className = 'qty-input';
            input.value = currentQty;
            
            // Adaptive font size for multi-digit numbers
            const digits = String(currentQty).length;
            if (digits >= 3) {
                input.style.fontSize = '9px';
            } else if (digits >= 2) {
                input.style.fontSize = '10px';
            } else {
                input.style.fontSize = '11px';
            }

            // Replace span with input
            const parent = qtyDisplay.parentNode;
            qtyDisplay.style.display = 'none';
            parent.insertBefore(input, qtyDisplay.nextSibling);
            input.focus();
            input.select();

            function commitEdit() {
                const val = parseInt(input.value);
                if (!isNaN(val) && val > 0) {
                    setQuantity(cartKey, val);
                } 
                input.remove();
                qtyDisplay.style.display = '';
                updateCardUI(card);
                renderCart(cartItemsEl, cartTotalEl, mobileCartCount);
            }

            input.addEventListener('blur', commitEdit);
            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    input.blur();
                }
                if (ev.key === 'Escape') {
                    input.value = currentQty;
                    input.blur();
                }
            });

            input.addEventListener('click', (ev) => ev.stopPropagation());

            return;
        }

        // 3. ADD TO CART
        const stepAdd = e.target.closest('.step-add');
        if (stepAdd) {
            e.stopPropagation();
            const card = stepAdd.closest('.product-card');
            const productId = card.getAttribute('data-product-id');
            const product = allProducts.find(p => p.id == productId);
            
            const cardToggle = card.querySelector('.unit-toggle');
            const activeMode = cardToggle ? cardToggle.getAttribute('data-mode') : 'unidad';
            
            addToCart(product, 1, activeMode);
            renderCart(cartItemsEl, cartTotalEl, mobileCartCount);
            showToast('¡Producto añadido a tu pedido!');
            return;
        }

        // 4. STEP UP
        const stepUp = e.target.closest('.step-up');
        if (stepUp) {
            e.stopPropagation();
            const card = stepUp.closest('.product-card');
            const productId = card.getAttribute('data-product-id');
            
            const cardToggle = card.querySelector('.unit-toggle');
            const activeMode = cardToggle ? cardToggle.getAttribute('data-mode') : 'unidad';
            const cartKey = `${productId}-${activeMode}`;
            
            updateQuantity(cartKey, 1);
            renderCart(cartItemsEl, cartTotalEl, mobileCartCount);
            return;
        }

        // 5. STEP DOWN
        const stepDown = e.target.closest('.step-down');
        if (stepDown) {
            e.stopPropagation();
            const card = stepDown.closest('.product-card');
            const productId = card.getAttribute('data-product-id');
            
            const cardToggle = card.querySelector('.unit-toggle');
            const activeMode = cardToggle ? cardToggle.getAttribute('data-mode') : 'unidad';
            const cartKey = `${productId}-${activeMode}`;
            
            updateQuantity(cartKey, -1);
            renderCart(cartItemsEl, cartTotalEl, mobileCartCount);
            return;
        }

        // 6. IMAGE ZOOM (on click inside image container, excluding the toggle)
        const zoomable = e.target.closest('.zoomable');
        if (zoomable && !e.target.closest('.unit-toggle')) {
            const img = zoomable.querySelector('img');
            if (img) {
                zoomImg.src = img.src;
                zoomModal.classList.remove('opacity-0', 'pointer-events-none');
                zoomModal.classList.add('active');
            }
        }
    });

    // --- CART ITEMS EVENT LISTENERS (Drawer internal controls) ---
    cartItemsEl.addEventListener('click', e => {
        const button = e.target.closest('button');
        if (!button) return;
        
        const cartKey = button.dataset.key;
        if (!cartKey) return;

        if (button.classList.contains('add-one') || button.closest('.add-one')) {
            updateQuantity(cartKey, 1);
        } else if (button.classList.contains('remove-one') || button.closest('.remove-one')) {
            updateQuantity(cartKey, -1);
        }
        renderCart(cartItemsEl, cartTotalEl, mobileCartCount);
    });

    // --- CLEAR CART ---
    clearCartBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres vaciar tu carrito?')) {
            clearCart();
            renderCart(cartItemsEl, cartTotalEl, mobileCartCount);
        }
    });

    // --- CHECKOUT FORM ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const customerName = document.getElementById('customer-name').value.trim();
        const customerPhone = document.getElementById('customer-phone').value.trim();
        const customerAddress = document.getElementById('customer-address').value.trim();
        const customerNotes = document.getElementById('customer-notes').value.trim();
        const sendButton = document.getElementById('send-whatsapp-btn');

        if (Object.keys(cart).length === 0) {
            alert('Tu carrito está vacío.'); return;
        }
        if (!customerName || !customerPhone || !customerAddress) {
            alert('Por favor, ingresa tu Nombre, Teléfono y Dirección de Entrega.'); return;
        }

        sendButton.disabled = true;
        sendButton.innerHTML = 'Enviando Pedido... ⏳';

        try {
            let total = 0;
            let fullOrderListString = '';
            const articulosParaGoogle = [];

            for (const key in cart) {
                const item = cart[key];
                const itemTotal = item.price * item.quantity;
                total += itemTotal;

                fullOrderListString += `• (${item.quantity}x) ${item.name} (${item.displayType}) - $${itemTotal.toLocaleString('es-CO')}\n`;

                const productId = key.split('-')[0];
                const productInfo = allProducts.find(p => p.id == productId);
                const unidadesCaja = productInfo ? (productInfo.unidadesPorCaja || 1) : 1;
                const precioUnitario = productInfo ? productInfo.price : item.price;

                let cantidadTotalUnidades = item.type === 'caja' ? (item.quantity * unidadesCaja) : item.quantity;

                articulosParaGoogle.push({
                    id: productId,
                    name: item.name,
                    cantidad: cantidadTotalUnidades,
                    unidadesPorCaja: unidadesCaja,
                    price: precioUnitario
                });
            }

            const payload = {
                cliente: customerName,
                telefono: customerPhone,
                direccion: customerAddress,
                notas: customerNotes,
                articulos: articulosParaGoogle
            };

            let whatsappSummary = `¡Hola! 👋 Acabo de enviar un pedido desde el catálogo.\n\n`;
            whatsappSummary += `*👤 Cliente:* ${customerName}\n`;
            whatsappSummary += `*📍 Dirección:* ${customerAddress}\n`;
            whatsappSummary += `*💰 Total Estimado:* $${total.toLocaleString('es-CO')}\n`;

            if (customerNotes) {
                whatsappSummary += `\n*📝 Notas Adicionales:*\n${customerNotes}\n`;
            }
            whatsappSummary += `\nYa está registrado en tu sistema. Por favor, confírmame el envío. ¡Gracias! 🙏`;

            const whatsappUrl = `https://api.whatsapp.com/send/?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(whatsappSummary)}`;
            window.open(whatsappUrl, '_blank');

            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            clearCart();
            window.location.reload();

        } catch (error) {
            console.error('Error Crítico:', error);
            alert('No se pudo registrar el pedido automáticamente en el sistema. Por favor contacta al administrador.');
        } finally {
            sendButton.disabled = false;
            sendButton.innerHTML = `Enviar Pedido por WhatsApp`;
        }
    });

    // ===================================================================
    // BUSCADOR GLOBAL (Punto 5: clear button + global search)
    // ===================================================================
    function updateClearButtonVisibility() {
        if (!searchClearBtn) return;
        if (searchBar.value.length > 0) {
            searchClearBtn.classList.add('visible');
        } else {
            searchClearBtn.classList.remove('visible');
        }
    }

    searchBar.addEventListener('input', (e) => {
        updateClearButtonVisibility();

        const searchTerm = e.target.value.toLowerCase().trim();
        const allTabContents = document.querySelectorAll('.tab-content');
        const allCards = document.querySelectorAll('.product-card');

        if (searchTerm.length > 0) {
            // Show ALL tab-contents so we can search across categories
            allTabContents.forEach(tab => {
                tab.classList.remove('hidden');
                tab.style.display = 'grid';
            });

            // Filter individual cards
            allCards.forEach(card => {
                const productName = card.querySelector('.name').textContent.toLowerCase();
                if (productName.includes(searchTerm)) {
                    card.classList.remove('hidden');
                    card.style.display = 'flex';
                } else {
                    card.classList.add('hidden');
                    card.style.display = 'none';
                }
            });
        } else {
            restoreActiveCategory();
        }
    });

    // Clear button handler
    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            searchBar.value = '';
            updateClearButtonVisibility();
            restoreActiveCategory();
            searchBar.focus();
        });
    }

    function restoreActiveCategory() {
        const allTabContents = document.querySelectorAll('.tab-content');
        const allCards = document.querySelectorAll('.product-card');
        const activeBtn = document.querySelector('.tab-button.active');
        const activeCategory = activeBtn ? activeBtn.dataset.category : '';

        allTabContents.forEach(tab => {
            const tabId = tab.id;
            const expectedId = `category-${activeCategory.replace(/\s+/g, '-')}`;
            
            if (tabId === expectedId) {
                tab.classList.remove('hidden');
                tab.classList.add('active');
                tab.style.display = '';
            } else {
                tab.classList.add('hidden');
                tab.classList.remove('active');
                tab.style.display = '';
            }
        });

        allCards.forEach(card => {
            card.classList.remove('hidden');
            card.style.display = 'flex';
        });
    }

    // --- DRAWER OPEN/CLOSE & MODAL CLOSES ---
    function openCart() {
        cartDrawer.classList.add('open');
        cartOverlay.classList.add('open');
    }

    function closeAll() {
        cartDrawer.classList.remove('open');
        cartOverlay.classList.remove('open');
        zoomModal.classList.remove('active');
        zoomModal.classList.add('opacity-0', 'pointer-events-none');
    }

    mobileCartBtn.addEventListener('click', openCart);
    closeCartBtn.addEventListener('click', closeAll);
    cartOverlay.addEventListener('click', closeAll);
    zoomModal.addEventListener('click', closeAll);

    // --- INIT ---
    async function initializeApp() {
        try {
            allProducts = await fetchProducts();
            renderProducts(allProducts, tabsContainer, productsContainer);
            renderCart(cartItemsEl, cartTotalEl, mobileCartCount);
            
            // Initialize category label behavior (Punto 3)
            initCategoryLabel();
        } catch (error) {
            console.error(error);
            productsContainer.innerHTML = '<p class="col-span-full text-center text-red-500 py-10 font-body">Error al cargar los productos. Por favor, intenta recargar la página.</p>';
        }
    }

    initializeApp();
});
