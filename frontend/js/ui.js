// frontend/js/ui.js
import { cart } from './cart.js?v=3';
import { abbreviateName } from './utils.js?v=3';

// Format currency in Colombian Pesos
const formatCurrency = (val) => '$' + new Intl.NumberFormat('es-CO').format(val);

// Helper to update a single product card's UI elements based on cart state
export function updateCardUI(card) {
    const productId = card.getAttribute('data-product-id');
    const unitPrice = parseInt(card.getAttribute('data-unit-price'));
    const unidadesPorCaja = parseInt(card.getAttribute('data-unidades-por-caja')) || 12;
    
    const toggleBtn = card.querySelector('.unit-toggle');
    const stepAdd = card.querySelector('.step-add');
    const stepControls = card.querySelector('.step-controls');
    const qtyDisplay = card.querySelector('.qty-display');
    const priceDisplay = card.querySelector('.product-total-price');
    const stepDownIcon = card.querySelector('.step-down .material-symbols-outlined');

    // Determine current active unit type (unidad vs caja)
    const activeMode = toggleBtn ? toggleBtn.getAttribute('data-mode') : 'unidad';
    const multiplier = activeMode === 'caja' ? unidadesPorCaja : 1;
    
    // Look up cart key
    const cartKey = `${productId}-${activeMode}`;
    const cartItem = cart[cartKey];
    const qtyInCart = cartItem ? cartItem.quantity : 0;

    // 1. Update quantity display
    qtyDisplay.textContent = qtyInCart;

    // 2. Calculate and update price display
    const currentUnitPrice = unitPrice * multiplier;
    const totalPrice = qtyInCart === 0 ? unitPrice : (currentUnitPrice * qtyInCart);
    priceDisplay.textContent = formatCurrency(totalPrice);

    // 3. Update visibility and styles
    if (qtyInCart > 0) {
        card.classList.add('in-cart');
        stepAdd.classList.add('hidden');
        stepControls.classList.remove('hidden');
        
        // Show delete icon if quantity is 1, minus icon if greater than 1
        if (stepDownIcon) {
            stepDownIcon.textContent = qtyInCart === 1 ? 'delete' : 'remove';
        }
    } else {
        card.classList.remove('in-cart');
        stepAdd.classList.remove('hidden');
        stepControls.classList.add('hidden');
    }
}

// Update all cards in the grid
export function updateCardStates() {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => updateCardUI(card));
}

// Render dynamic products categorized by tabs
export function renderProducts(allProducts, tabsContainer, productsContainer) {
    const categories = ["Aseo hogar", "Aseo y cuidado personal", "Bebé", "Lo nuevo", "Extraordinarios", "Aseo hogar Ara", "Cuidado Personal Ara"];
    tabsContainer.innerHTML = '';
    productsContainer.innerHTML = '';

    categories.forEach((category, index) => {
        const productsInCategory = allProducts.filter(p => p.category === category);
        const productCount = productsInCategory.length;

        if (productCount === 0) return; 

        // Create category trigger button inside dropdown
        const tabButton = document.createElement('button');
        tabButton.className = 'tab-button category-option w-full text-left px-4 py-3 text-[12px] border-b border-gray-100 hover:bg-surface text-gray-700 font-medium transition-colors flex justify-between items-center';
        tabButton.dataset.category = category;
        tabButton.innerHTML = `
            <span>${category}</span>
            <span class="count bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">${productCount}</span>
        `;
        tabsContainer.appendChild(tabButton);

        // Create container for product grid
        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content hidden grid grid-cols-2 lg:grid-cols-5 gap-3 w-full pb-20';
        tabContent.id = `category-${category.replace(/\s+/g, '-')}`;
        productsContainer.appendChild(tabContent);

        // Populate products
        productsInCategory.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.setAttribute('data-product-id', product.id);
            productCard.setAttribute('data-unit-price', product.price);
            
            const unidadesCaja = product.unidadesPorCaja || 0;
            productCard.setAttribute('data-unidades-por-caja', unidadesCaja);

            let toggleHTML = '';
            if (unidadesCaja > 0) {
                toggleHTML = `
                    <div class="unit-toggle-container">
                        <button class="unit-toggle py-1 px-3 bg-white text-primary rounded-full text-xs font-bold border border-primary shadow-sm active:scale-95 transition-transform" data-mode="caja">Caja ${unidadesCaja}</button>
                    </div>
                `;
            }

            const formattedName = product.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

            productCard.innerHTML = `
                <div class="image-container zoomable cursor-pointer relative">
                    <img src="${product.imageUrl}" alt="${formattedName}" class="object-contain max-h-full mx-auto" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/150x150/cccccc/ffffff?text=Sin+imagen';">
                    ${toggleHTML}
                </div>
                <div class="product-info-area">
                    <h3 class="name text-sm font-semibold text-on-surface line-clamp-2 leading-tight font-body mb-2 text-center" style="min-height: 40px;">${formattedName}</h3>
                    <div class="price-stepper-row mt-1 flex justify-between items-center w-full">
                        <span class="text-primary font-bold product-total-price font-display flex-1 min-w-0 text-left text-[13px] sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis mr-1">
                            $${product.price.toLocaleString('es-CO')}
                        </span>
                        <div class="stepper-slot flex-shrink-0 flex justify-end items-center">
                            <div class="stepper-container flex items-center justify-end w-full">
                                <button class="step-add w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-primary text-on-primary rounded-full shadow-sm active:scale-95 transition-all">
                                    <span class="material-symbols-outlined text-[18px]">add</span>
                                </button>
                                <div class="step-controls flex items-center gap-1 hidden">
                                    <button class="step-down w-[26px] h-[26px] sm:w-7 sm:h-7 flex items-center justify-center bg-white text-primary rounded-full border border-primary/20 active:scale-95 transition-all shadow-sm">
                                        <span class="material-symbols-outlined text-[14px] sm:text-[16px]">delete</span>
                                    </button>
                                    <span class="qty-display text-[11px] sm:text-xs font-bold text-primary w-3 sm:w-4 text-center select-none cursor-pointer" title="Toca para editar">0</span>
                                    <button class="step-up w-[26px] h-[26px] sm:w-7 sm:h-7 flex items-center justify-center bg-white text-primary rounded-full border border-primary/20 active:scale-95 transition-all shadow-sm">
                                        <span class="material-symbols-outlined text-[14px] sm:text-[16px]">add</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            tabContent.appendChild(productCard);
            
            // Initialize card's UI state immediately
            updateCardUI(productCard);
        });

        // Set the first category as active by default
        if (index === 0) {
            tabButton.classList.add('active');
            tabContent.classList.remove('hidden');
            tabContent.classList.add('active');
        }
    });
}

// Render shopping cart drawer items
export function renderCart(cartItemsEl, cartTotalEl, mobileCartCount) {
    if (Object.keys(cart).length === 0) {
        cartItemsEl.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-center py-20">
                <span class="material-symbols-outlined text-6xl text-gray-200 mb-4 select-none">shopping_basket</span>
                <p class="text-gray-400 font-medium text-sm">Tu carrito está vacío</p>
            </div>
        `;
        cartTotalEl.textContent = 'Total: $0';
        mobileCartCount.textContent = '0';
        updateCardStates();
        return { total: 0 };
    }
    
    cartItemsEl.innerHTML = '';
    let total = 0;
    let totalItems = 0;
    
    for (const cartKey in cart) {
        const item = cart[cartKey];
        const itemTotal = item.price * item.quantity; 
        total += itemTotal;
        totalItems += 1;
        
        const li = document.createElement('li');
        li.className = 'flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 shadow-sm';

        const abbreviatedDisplayName = abbreviateName(item.name);

        li.innerHTML = `
            <div class="flex-1 min-w-0">
                <h4 class="text-xs font-bold text-gray-800 truncate">${abbreviatedDisplayName}</h4>
                <p class="text-[10px] text-gray-500 font-semibold mt-0.5">${item.displayType} • $${item.price.toLocaleString('es-CO')} c/u</p>
                <p class="text-[11px] text-primary font-bold mt-1">Subtotal: $${itemTotal.toLocaleString('es-CO')}</p>
            </div>
            <div class="flex items-center gap-1.5 bg-white border border-gray-150 rounded-full p-1 flex-shrink-0">
                <button data-key="${cartKey}" class="remove-one w-6 h-6 flex items-center justify-center text-primary hover:bg-gray-50 rounded-full active:scale-95 transition-transform">
                    <span data-key="${cartKey}" class="material-symbols-outlined text-sm">remove</span>
                </button>
                <span class="text-[11px] font-bold text-gray-700 w-4 text-center select-none">${item.quantity}</span>
                <button data-key="${cartKey}" class="add-one w-6 h-6 flex items-center justify-center text-primary hover:bg-gray-50 rounded-full active:scale-95 transition-transform">
                    <span data-key="${cartKey}" class="material-symbols-outlined text-sm">add</span>
                </button>
            </div>
        `;
        cartItemsEl.appendChild(li);
    }
    
    cartTotalEl.textContent = `Total: $${total.toLocaleString('es-CO')}`;
    mobileCartCount.textContent = totalItems;
    
    updateCardStates();
    
    return { total };
}
