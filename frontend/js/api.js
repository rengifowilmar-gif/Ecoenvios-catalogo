// frontend/js/api.js
export async function fetchProducts() {
    const response = await fetch('data/products.json');
    if (!response.ok) {
        throw new Error(`Error al cargar products.json: ${response.statusText}`);
    }
    const products = await response.json();
    
    try {
        const qResponse = await fetch('data/quantities.json');
        if (qResponse.ok) {
            const quantities = await qResponse.json();
            products.forEach(product => {
                if (quantities[product.id] !== undefined) {
                    product.unidadesPorCaja = quantities[product.id];
                }
            });
        }
    } catch (e) {
        console.warn("No se pudo cargar quantities.json", e);
    }
    
    return products;
}
