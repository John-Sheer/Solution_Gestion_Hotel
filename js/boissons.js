// ===========================================
// Bar / Boissons
// ===========================================

let currentCategoryFilter = 'all';
let stockIsSynchronized = false;

function toggleMenu() {
    document.getElementById('navMenu').classList.toggle('open');
}

function renderBeverages() {
    const beverages = getBeverages();
    const grid = document.getElementById('beveragesGrid');

    let filtered = beverages;

    if (currentCategoryFilter !== 'all') {
        filtered = filtered.filter(b => b.category === currentCategoryFilter);
    }

    const countElement = document.getElementById('beverageCount');
    if (countElement) {
        countElement.textContent = `${filtered.length} référence${filtered.length > 1 ? 's' : ''}`;
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23.693L5 15.5m14.8-.2l.447 2.578a1.125 1.125 0 0 1-1.147 1.306H4.9a1.125 1.125 0 0 1-1.147-1.306l.478-2.778" />
                </svg>
                <h3>Aucune boisson trouvée</h3>
                <p>Essayez une autre catégorie</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(bev => `
        <div class="beverage-card">
            <div class="beverage-image">
                <img src="${bev.image}" alt="${bev.name}" loading="lazy">
                <span class="beverage-category">${getCategoryLabel(bev.category)}</span>
            </div>
            <div class="beverage-content">
                <h4>${bev.name}</h4>
                <p>${bev.description}</p>
                <div class="beverage-footer">
                    <span class="beverage-price">${formatPrice(bev.price)}</span>
                    <button class="btn btn-sm btn-primary" onclick="addToCartAndUpdate(${bev.id})" ${bev.stock <= 0 || !stockIsSynchronized ? 'disabled' : ''}>
                        ${!stockIsSynchronized ? 'Stock indisponible' : bev.stock <= 0 ? 'Épuisé' : 'Ajouter'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function filterCategory(category) {
    currentCategoryFilter = category;
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach((tab, idx) => {
        const categories = ['all', 'beer', 'soda', 'water'];
        const active = categories[idx] === category;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-pressed', String(active));
    });
    renderBeverages();
}

function addToCartAndUpdate(beverageId) {
    const beverage = getBeverageById(beverageId);
    if (!beverage || !stockIsSynchronized) return;
    addToCart(beverage, 1);
    updateCartUI();
}

function updateCartUI() {
    const cart = getCart();
    const badge = document.getElementById('cartBadge');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');

    badge.textContent = getCartItemCount();
    cartTotal.textContent = formatPrice(getCartTotal());

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
                <h3>Panier vide</h3>
                <p>Ajoutez des boissons</p>
            </div>
        `;
        checkoutBtn.disabled = true;
        return;
    }

    checkoutBtn.disabled = !stockIsSynchronized;
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <span class="price">${formatPrice(item.price)}</span>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="changeQty(${item.beverageId}, -1)">−</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="changeQty(${item.beverageId}, 1)">+</button>
                </div>
            </div>
        </div>
    `).join('');
}

function changeQty(beverageId, delta) {
    const cart = getCart();
    const item = cart.find(i => i.beverageId === beverageId);
    if (item) {
        updateCartItem(beverageId, item.quantity + delta);
        updateCartUI();
    }
}

function openCart() {
    document.getElementById('cartSidebar').classList.add('open');
    document.getElementById('cartOverlay').classList.add('open');
    document.querySelector('#cartSidebar .cart-close').focus();
}

function closeCart() {
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('open');
    document.querySelector('.cart-toggle').focus();
}

async function openOrderModal() {
    const cart = getCart();
    if (cart.length === 0) return;
    if (!stockIsSynchronized) {
        await showAppAlert('Le stock doit être synchronisé avant de passer une commande.');
        return;
    }

    document.getElementById('orderForm').reset();
    const status = document.getElementById('orderRoomStatus');
    const submitButton = document.querySelector('#orderForm button[type="submit"]');
    submitButton.disabled = !stockIsSynchronized;
    status.textContent = 'La chambre et le téléphone seront vérifiés avant l’envoi.';
    document.getElementById('orderTotal').textContent = formatPrice(getCartTotal());
    document.getElementById('orderModal').classList.add('open');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('open');
    document.getElementById('orderForm').reset();
    document.getElementById('orderRoomStatus').textContent =
        'La chambre et le téléphone seront vérifiés avant l’envoi.';
}

async function submitOrder(event) {
    event.preventDefault();

    const roomNumber = document.getElementById('orderRoom').value.trim();
    const guestPhone = document.getElementById('orderGuestPhone').value.trim();

    const submitButton = document.querySelector('#orderForm button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Envoi de la commande…';
    try {
        const result = await placeSharedHotelOrder(roomNumber, guestPhone, getCart());
        clearCart();
        closeOrderModal();
        closeCart();
        updateCartUI();
        await showAppAlert(
            `Commande n°${result.id} enregistrée. Total confirmé : ${formatPrice(result.totalPrice)}. Le personnel va la préparer.`,
            { title: 'Commande enregistrée' }
        );
        try {
            await loadSharedBeverageStock();
            stockIsSynchronized = true;
            document.getElementById('beverageSyncStatus').textContent = 'Stock et prix synchronisés avec le registre de l’hôtel.';
        } catch (stockError) {
            stockIsSynchronized = false;
            console.error('La commande a été enregistrée, mais le stock n’a pas pu être actualisé :', stockError);
            document.getElementById('beverageSyncStatus').textContent =
                'Commande enregistrée. Le stock n’a pas pu être resynchronisé ; rechargez la page avant une nouvelle commande.';
        }
        renderBeverages();
    } catch (error) {
        console.error('Échec de création de commande partagée :', error);
        await showAppAlert(error.message || 'La commande n’a pas été enregistrée. Vérifiez votre connexion puis réessayez.', { title: 'Envoi impossible' });
        stockIsSynchronized = false;
        try {
            await loadSharedBeverageStock();
            stockIsSynchronized = true;
        } catch (stockError) {
            console.error('Impossible de recharger le stock après l’échec :', stockError);
            document.getElementById('beverageSyncStatus').textContent =
                'Le stock n’a pas pu être vérifié. Rechargez la page avant de réessayer.';
        }
        updateCartUI();
        renderBeverages();
    } finally {
        submitButton.disabled = !stockIsSynchronized;
        submitButton.textContent = 'Confirmer';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    loadSharedBeverageStock().then(() => {
        stockIsSynchronized = true;
        document.getElementById('beverageSyncStatus').textContent = 'Stock et prix synchronisés avec le registre de l’hôtel.';
        renderBeverages();
        updateCartUI();
    }).catch(error => {
        stockIsSynchronized = false;
        console.error('Impossible de charger le stock partagé :', error);
        document.getElementById('beverageSyncStatus').textContent =
            'Le stock partagé est momentanément indisponible. Les commandes sont désactivées pour éviter toute erreur.';
        document.querySelectorAll('.beverage-card .btn').forEach(button => { button.disabled = true; });
        document.getElementById('checkoutBtn').disabled = true;
    });
});
