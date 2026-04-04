// frontend/js/cart.js
export let cart = {};
try {
    const stored = localStorage.getItem('cart');
    if (stored) cart = JSON.parse(stored);
} catch(e) {
    console.warn("localStorage is disabled or unavailable");
}

export function saveCart() {
    try {
        localStorage.setItem('cart', JSON.stringify(cart));
    } catch(e) {
        console.warn("Could not save to localStorage");
    }
}

export function addToCart(product, quantity, type) {
    const productId = product.id;
    const cartKey = `${productId}-${type}`;
    const unidadesCaja = product.unidadesPorCaja || 0;

    if (cart[cartKey]) {
        cart[cartKey].quantity += quantity;
    } else {
        cart[cartKey] = {
            name: product.name,
            price: type === 'caja' ? (product.price * unidadesCaja) : product.price,
            quantity: quantity,
            type: type,
            displayType: type === 'unidad' ? 'Unidad' : `Caja (${unidadesCaja} unds)`
        };
    }
    saveCart();
}

export function updateQuantity(cartKey, delta) {
    if (!cart[cartKey]) return;
    cart[cartKey].quantity += delta;
    if (cart[cartKey].quantity <= 0) {
        delete cart[cartKey];
    }
    saveCart();
}

export function clearCart() {
    cart = {};
    saveCart();
}

export function isProductInCart(productId) {
    return !!(cart[`${productId}-unidad`] || cart[`${productId}-caja`]);
}

export function setQuantity(cartKey, quantity) {
    if (!cart[cartKey]) return;
    if (quantity <= 0) {
        delete cart[cartKey];
    } else {
        cart[cartKey].quantity = quantity;
    }
    saveCart();
}

export function removeCartItem(cartKey) {
    delete cart[cartKey];
    saveCart();
}
