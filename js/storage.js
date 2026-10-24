// ===========================================
// Module de Stockage
// ===========================================

const STORAGE_KEYS = {
    ROOMS: 'hotel_rooms',
    RESERVATIONS: 'hotel_reservations',
    BEVERAGES: 'hotel_beverages',
    ORDERS: 'hotel_orders',
    CART: 'hotel_cart'
};

// Images placeholder pour les chambres
const ROOM_IMAGES = {
    ventilated: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&h=700&q=80',
    air_conditioned: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=900&h=700&q=80',
    apartment: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=900&h=700&q=80'
};

// Images pour les boissons (catégories disponibles : bière, boissons sans alcool, eau)
const BEVERAGE_IMAGES = {
    beer: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop',
    soda: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=400&fit=crop',
    water: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop'
};

// Données initiales des chambres
const INITIAL_ROOMS = [
    { id: 1, number: '101', name: 'Chambre Ventilée', type: 'ventilated', price: 15000, capacity: 2, features: ['Wi-Fi', 'TV', 'Ventilateur'], status: 'available', image: ROOM_IMAGES.ventilated },
    { id: 2, number: '102', name: 'Chambre Ventilée', type: 'ventilated', price: 15000, capacity: 2, features: ['Wi-Fi', 'TV', 'Ventilateur'], status: 'available', image: ROOM_IMAGES.ventilated },
    { id: 3, number: '103', name: 'Chambre Ventilée', type: 'ventilated', price: 15000, capacity: 2, features: ['Wi-Fi', 'TV', 'Ventilateur'], status: 'available', image: ROOM_IMAGES.ventilated },
    { id: 4, number: '201', name: 'Chambre Climatisée', type: 'air_conditioned', price: 35000, capacity: 2, features: ['Wi-Fi', 'TV', 'Climatisation', 'Mini-bar'], status: 'available', image: ROOM_IMAGES.air_conditioned },
    { id: 5, number: '202', name: 'Chambre Climatisée', type: 'air_conditioned', price: 35000, capacity: 2, features: ['Wi-Fi', 'TV', 'Climatisation', 'Mini-bar'], status: 'available', image: ROOM_IMAGES.air_conditioned },
    { id: 6, number: 'A01', name: 'Appartement Meublé', type: 'apartment', price: 75000, capacity: 6, features: ['Wi-Fi', 'TV', 'Climatisation', 'Cuisine équipée', 'Salon', 'Jacuzzi'], status: 'available', image: ROOM_IMAGES.apartment }
];

// Données initiales des boissons - Bar (Togo)
// Uniquement : bières, boissons sans alcool et eau
const INITIAL_BEVERAGES = [
    // === BIÈRES (BB LOMÉ & SNB TOGO) ===
    // BB LOMÉ
    { id: 1, name: 'PILS BB', category: 'beer', price: 800, description: 'La bière du pays - Brassée par BB Lomé (65cl)', image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop', stock: 100 },
    { id: 2, name: 'Castel Beer', category: 'beer', price: 800, description: 'Lager BB Lomé (33cl)', image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=400&fit=crop', stock: 100 },
    { id: 3, name: 'Awooyo', category: 'beer', price: 1000, description: 'Bière brune BB Lomé (33cl)', image: 'https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=400&h=400&fit=crop', stock: 80 },
    { id: 4, name: 'Guinness Foreign Extra', category: 'beer', price: 1200, description: 'Stout BB Lomé (33cl)', image: 'https://images.unsplash.com/photo-1568644396922-5c3bfae12521?w=400&h=400&fit=crop', stock: 60 },
    { id: 5, name: 'Beaufort Lager', category: 'beer', price: 800, description: 'Premium BB Lomé (33cl)', image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=400&h=400&fit=crop', stock: 80 },
    // SNB TOGO
    { id: 16, name: 'Djama Pilsner', category: 'beer', price: 800, description: 'Bière blonde - Brassée par SNB Togo (33cl)', image: 'https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=400&h=400&fit=crop', stock: 90 },
    { id: 17, name: 'Djama Lager', category: 'beer', price: 700, description: 'Légère SNB Togo (33cl)', image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=400&h=400&fit=crop', stock: 100 },
    { id: 18, name: 'Djama 228', category: 'beer', price: 900, description: 'Bière forte SNB Togo (33cl)', image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop', stock: 80 },
    { id: 19, name: 'Djama Stout', category: 'beer', price: 1000, description: 'Bière noire SNB Togo (33cl)', image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=400&fit=crop', stock: 70 },

    // === BOISSONS SANS ALCOOL ===
    { id: 7, name: 'Coca-Cola', category: 'soda', price: 500, description: 'Soda classique (33cl)', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=400&fit=crop', stock: 150 },
    { id: 8, name: 'Fanta Orange', category: 'soda', price: 500, description: 'Fanta orange pétillante (33cl)', image: 'https://images.unsplash.com/photo-1594971475674-6a97f8fe8c2b?w=400&h=400&fit=crop', stock: 120 },
    { id: 9, name: 'Sprite', category: 'soda', price: 500, description: 'Soda citron-lime (33cl)', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&h=400&fit=crop', stock: 100 },
    { id: 10, name: 'Malta Guinness', category: 'soda', price: 600, description: 'Boisson maltée sans alcool (33cl)', image: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400&h=400&fit=crop', stock: 80 },
    { id: 11, name: 'Youki Cocktail', category: 'soda', price: 400, description: 'Cocktail de fruits local (33cl)', image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&h=400&fit=crop', stock: 100 },
    { id: 12, name: 'Youki Orange', category: 'soda', price: 400, description: 'Soda orange BB Lomé (33cl)', image: 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=400&h=400&fit=crop', stock: 100 },
    { id: 13, name: 'World Cola', category: 'soda', price: 400, description: 'Cola local BB Lomé (33cl)', image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=400&fit=crop', stock: 80 },

    // === EAU ===
    { id: 14, name: 'Evian Petit', category: 'water', price: 500, description: 'Eau minérale Evian (50cl)', image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=400&fit=crop', stock: 200 },
    { id: 15, name: 'Evian Grand', category: 'water', price: 1000, description: 'Eau minérale Evian (1L)', image: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=400&h=400&fit=crop', stock: 150 }
];

// Les données de démonstration obsolètes étaient datées de février 2026.
const INITIAL_RESERVATIONS = [];
const INITIAL_ORDERS = [];

function getData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

function setData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function initializeData() {
    // Forcer la réinitialisation si les chambres ne correspondent pas au nouveau format
    const existingRooms = getData(STORAGE_KEYS.ROOMS);
    if (!existingRooms || !existingRooms[0] || existingRooms[0].type === 'standard') {
        setData(STORAGE_KEYS.ROOMS, INITIAL_ROOMS);
    }

    // Forcer la réinitialisation si les boissons ne contiennent pas les bières SNB (Djama)
    const existingBeverages = getData(STORAGE_KEYS.BEVERAGES);
    if (!existingBeverages || !existingBeverages.some(b => b.name.includes('Djama'))) {
        setData(STORAGE_KEYS.BEVERAGES, INITIAL_BEVERAGES);
    }

    if (!getData(STORAGE_KEYS.RESERVATIONS)) setData(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
    if (!getData(STORAGE_KEYS.ORDERS)) setData(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    if (!getData(STORAGE_KEYS.CART)) setData(STORAGE_KEYS.CART, []);
}

// ============ CHAMBRES ============
function getRooms() {
    return getData(STORAGE_KEYS.ROOMS) || INITIAL_ROOMS;
}

function getRoomById(id) {
    return getRooms().find(r => r.id === id);
}

function getRoomByNumber(number) { return getRooms().find(room => room.number === number); }

function updateRoom(id, updates) {
    const rooms = getRooms();
    const index = rooms.findIndex(r => r.id === id);
    if (index !== -1) {
        rooms[index] = { ...rooms[index], ...updates };
        setData(STORAGE_KEYS.ROOMS, rooms);
        return true;
    }
    return false;
}

function addRoom(room) {
    const rooms = getRooms();
    const newId = Math.max(...rooms.map(r => r.id), 0) + 1;
    const newRoom = { ...room, id: newId, image: ROOM_IMAGES[room.type] || ROOM_IMAGES.ventilated };
    rooms.push(newRoom);
    setData(STORAGE_KEYS.ROOMS, rooms);
    return newRoom;
}

// ============ RÉSERVATIONS ============
function getReservations() {
    return getData(STORAGE_KEYS.RESERVATIONS) || [];
}

function getReservationById(id) { return getReservations().find(res => res.id === id); }

function addReservation(reservation, user = null) {
    const room = getRoomById(reservation.roomId);
    if (!room || !isRoomAvailableForDates(room.id, reservation.checkIn, reservation.checkOut)) return null;

    const reservations = getReservations();
    const newId = reservations.length > 0 ? Math.max(...reservations.map(r => r.id)) + 1 : 1;
    const newRes = {
        ...reservation,
        status: reservation.status || 'requested',
        id: newId,
        createdAt: new Date().toISOString(),
        createdBy: user ? { name: user.name, role: user.role } : { name: 'Client', role: 'guest' }
    };
    reservations.push(newRes);
    setData(STORAGE_KEYS.RESERVATIONS, reservations);
    return newRes;
}

function isRoomAvailableForDates(roomId, checkIn, checkOut, excludeReservationId = null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut) || checkOut <= checkIn) return false;
    if (getLocalDateString(new Date(`${checkIn}T00:00:00`)) !== checkIn || getLocalDateString(new Date(`${checkOut}T00:00:00`)) !== checkOut) return false;

    const room = getRoomById(roomId);
    if (!room || room.status === 'maintenance') return false;

    const today = getLocalDateString(new Date());
    if (room.status === 'occupied' && checkIn <= today && checkOut > today) return false;

    return !getReservations().some(reservation =>
        reservation.roomId === roomId &&
        reservation.id !== excludeReservationId &&
        ['requested', 'active', 'checked_in'].includes(reservation.status) &&
        checkIn < reservation.checkOut && checkOut > reservation.checkIn
    );
}

function getAvailableRoomsForDates(checkIn, checkOut) {
    return getRooms().filter(room => isRoomAvailableForDates(room.id, checkIn, checkOut));
}

function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function confirmReservation(id) {
    const reservations = getReservations();
    const reservation = reservations.find(item => item.id === id && item.status === 'requested');
    if (!reservation || reservation.checkIn < getLocalDateString(new Date()) || !isRoomAvailableForDates(reservation.roomId, reservation.checkIn, reservation.checkOut, id)) return null;
    reservation.status = 'active';
    setData(STORAGE_KEYS.RESERVATIONS, reservations);
    return reservation;
}

function checkInReservation(id) {
    const reservations = getReservations();
    const reservation = reservations.find(item => item.id === id && item.status === 'active');
    const today = getLocalDateString(new Date());
    const room = reservation && getRoomById(reservation.roomId);
    if (!reservation || reservation.checkIn > today || reservation.checkOut <= today || !room || room.status !== 'available' || !isRoomAvailableForDates(reservation.roomId, reservation.checkIn, reservation.checkOut, id)) return null;
    reservation.status = 'checked_in';
    setData(STORAGE_KEYS.RESERVATIONS, reservations);
    updateRoom(reservation.roomId, { status: 'occupied' });
    return reservation;
}

function cancelReservation(id) {
    const reservations = getReservations();
    const res = reservations.find(r => r.id === id && ['requested', 'active', 'checked_in'].includes(r.status));
    if (res) {
        res.status = 'cancelled';
        setData(STORAGE_KEYS.RESERVATIONS, reservations);
        const room = getRoomById(res.roomId);
        if (res.checkIn <= getLocalDateString(new Date()) && res.checkOut > getLocalDateString(new Date()) && room && room.status === 'occupied') {
            updateRoom(res.roomId, { status: 'available' });
        }
        return true;
    }
    return false;
}

function completeReservation(id) {
    const reservations = getReservations();
    const res = reservations.find(r => r.id === id && r.status === 'checked_in');
    if (res) {
        res.status = 'completed';
        setData(STORAGE_KEYS.RESERVATIONS, reservations);
        const room = getRoomById(res.roomId);
        if (room && room.status === 'occupied') updateRoom(res.roomId, { status: 'available' });
        return true;
    }
    return false;
}

// ============ BOISSONS ============
function getBeverages() {
    return getData(STORAGE_KEYS.BEVERAGES) || INITIAL_BEVERAGES;
}

function getBeverageById(id) {
    return getBeverages().find(b => b.id === id);
}

function updateBeverage(id, updates) {
    const beverages = getBeverages();
    const index = beverages.findIndex(b => b.id === id);
    if (index !== -1) {
        beverages[index] = { ...beverages[index], ...updates };
        setData(STORAGE_KEYS.BEVERAGES, beverages);
        return true;
    }
    return false;
}

function addBeverage(beverage) {
    const beverages = getBeverages();
    const newId = Math.max(...beverages.map(b => b.id), 0) + 1;
    beverages.push({ ...beverage, id: newId, image: BEVERAGE_IMAGES[beverage.category] });
    setData(STORAGE_KEYS.BEVERAGES, beverages);
    return beverage;
}

// ============ PANIER ============
function getCart() {
    return getData(STORAGE_KEYS.CART) || [];
}

function addToCart(beverage, quantity = 1) {
    const cart = getCart();
    const existing = cart.find(item => item.beverageId === beverage.id);

    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({
            beverageId: beverage.id,
            name: beverage.name,
            quantity: quantity,
            price: beverage.price,
            image: beverage.image
        });
    }

    setData(STORAGE_KEYS.CART, cart);
    return cart;
}

function updateCartItem(beverageId, quantity) {
    const cart = getCart();
    const idx = cart.findIndex(i => i.beverageId === beverageId);
    if (idx !== -1) {
        if (quantity <= 0) cart.splice(idx, 1);
        else cart[idx].quantity = quantity;
        setData(STORAGE_KEYS.CART, cart);
    }
    return cart;
}

function removeFromCart(beverageId) {
    const cart = getCart();
    const filtered = cart.filter(item => item.beverageId !== beverageId);
    setData(STORAGE_KEYS.CART, filtered);
    return filtered;
}

function clearCart() {
    setData(STORAGE_KEYS.CART, []);
}

function getCartTotal() { return getCart().reduce((t, i) => t + (i.price * i.quantity), 0); }
function getCartItemCount() { return getCart().reduce((c, i) => c + i.quantity, 0); }

// ============ COMMANDES ============
function getOrders() {
    return getData(STORAGE_KEYS.ORDERS) || [];
}

function createOrder(roomNumber, user = null) {
    const cart = getCart();
    if (cart.length === 0) return null;
    const orders = getOrders();
    const newId = Math.max(...orders.map(o => o.id), 0) + 1;
    const newOrder = {
        id: newId,
        items: cart.map(i => ({ beverageId: i.beverageId, name: i.name, quantity: i.quantity, price: i.price })),
        roomNumber,
        totalPrice: getCartTotal(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: user ? { name: user.name, role: user.role } : { name: 'Client', role: 'client' }
    };
    orders.push(newOrder);
    setData(STORAGE_KEYS.ORDERS, orders);

    // Diminuer le stock
    cart.forEach(i => {
        const b = getBeverageById(i.beverageId);
        if (b) updateBeverage(i.beverageId, { stock: Math.max(0, b.stock - i.quantity) });
    });
    clearCart();
    return newOrder;
}

function updateOrderStatus(id, status, user = null) {
    const orders = getOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx !== -1) {
        orders[idx].status = status;
        if (user) {
            orders[idx].processedBy = { name: user.name, role: user.role };
            orders[idx].processedAt = new Date().toISOString();
        }
        setData(STORAGE_KEYS.ORDERS, orders);
        return orders[idx];
    }
    return null;
}

// ============ STATISTIQUES ============
function getStats() {
    const rooms = getRooms();
    const reservations = getReservations();
    const orders = getOrders();
    const beverages = getBeverages();
    const occupied = rooms.filter(r => r.status === 'occupied').length;

    return {
        rooms: {
            total: rooms.length,
            occupied,
            available: getAvailableRoomsForDates(getLocalDateString(new Date()), getLocalDateString(new Date(Date.now() + 86400000))).length,
            maintenance: rooms.filter(r => r.status === 'maintenance').length,
            occupancyRate: rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0
        },
        reservations: {
            total: reservations.length,
            active: reservations.filter(r => ['active', 'checked_in'].includes(r.status)).length,
            revenue: reservations.filter(r => r.status === 'active' || r.status === 'completed').reduce((s, r) => s + r.totalPrice, 0)
        },
        orders: {
            total: orders.length,
            pending: orders.filter(o => o.status === 'pending').length,
            today: orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length,
            revenue: orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.totalPrice, 0)
        },
        beverages: {
            total: beverages.length,
            lowStock: beverages.filter(b => b.stock < 20).length
        }
    };
}

// ============ UTILITAIRES ============
const STATUS_LABELS = {
    available: 'Disponible',
    occupied: 'Occupée',
    maintenance: 'Indisponible',
    active: 'Active',
    requested: 'À confirmer',
    checked_in: 'En séjour',
    pending: 'En attente',
    completed: 'Terminée',
    cancelled: 'Annulée'
};

const TYPE_LABELS = {
    ventilated: 'Ventilée',
    air_conditioned: 'Climatisée',
    apartment: 'Appartement'
};

const CATEGORY_LABELS = {
    beer: 'Bière',
    soda: 'Boisson sans alcool',
    water: 'Eau',
    spirit: 'Spiritueux'
};

function getStatusLabel(status) { return STATUS_LABELS[status] || status; }
function getTypeLabel(type) { return TYPE_LABELS[type] || type; }
function getCategoryLabel(category) { return CATEGORY_LABELS[category] || category; }

function formatPrice(price) { return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA'; }
function formatDate(d) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); }
function formatDateTime(d) { return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function formatShortDate(d) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); }

function initializeData() {
    // Forcer la réinitialisation si les chambres ne correspondent pas au nouveau format ou aux nouvelles capacités
    const existingRooms = getData(STORAGE_KEYS.ROOMS);
    const hasAptWithOldCapacity = existingRooms && existingRooms.some(r => r.type === 'apartment' && r.capacity !== 6);
    const hasRoomWithOldCapacity = existingRooms && existingRooms.some(r => r.type !== 'apartment' && r.capacity > 2);

    if (!existingRooms || !existingRooms[0] || existingRooms[0].type === 'standard' || hasAptWithOldCapacity || hasRoomWithOldCapacity) {
        setData(STORAGE_KEYS.ROOMS, INITIAL_ROOMS);
    }

    // Forcer la réinitialisation si les boissons ne contiennent pas les bières SNB (Djama)
    const existingBeverages = getData(STORAGE_KEYS.BEVERAGES);
    if (!existingBeverages || !existingBeverages.some(b => b.name.includes('Djama'))) {
        setData(STORAGE_KEYS.BEVERAGES, INITIAL_BEVERAGES);
    }

    const reservations = getData(STORAGE_KEYS.RESERVATIONS);
    if (!reservations) {
        setData(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
    } else {
        const cleanedReservations = reservations.filter(reservation =>
            !(reservation.id === 1 && reservation.guestName === 'Kouassi Yao' && reservation.createdAt === '2026-02-05T10:00:00Z')
        );
        if (cleanedReservations.length !== reservations.length) {
            setData(STORAGE_KEYS.RESERVATIONS, cleanedReservations);
            const rooms = getRooms();
            const demoRoom = rooms.find(room => room.id === 2);
            if (demoRoom && demoRoom.status === 'occupied') updateRoom(demoRoom.id, { status: 'available' });
        }
    }

    const orders = getData(STORAGE_KEYS.ORDERS);
    if (!orders) {
        setData(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    } else {
        const cleanedOrders = orders.filter(order =>
            !(order.id === 1 && order.roomNumber === '102' && order.createdAt === '2026-02-07T08:30:00Z')
        );
        if (cleanedOrders.length !== orders.length) setData(STORAGE_KEYS.ORDERS, cleanedOrders);
    }
    if (!getData(STORAGE_KEYS.CART)) setData(STORAGE_KEYS.CART, []);
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    initSheerTech();
});

// ===========================================
// INTEGRATION SHEER TECH (Modal & Footer)
// ===========================================
function initSheerTech() {
    const modalHTML = `
    <div class="modal-sheer" id="sheerModal" aria-hidden="true">
      <div class="modal-backdrop-sheer" id="sheerBackdrop"></div>
      <div class="modal-content sheer-modal">
        <button class="modal-close-sheer" id="sheerClose" aria-label="Fermer">&times;</button>
        <div class="sheer-logo">
          <img src="assets/img/logo_sheer.jpg" alt="Logo Sheer Tech">
        </div>
        <div class="sheer-body">
          <h2>Sheer Tech™</h2>
          <p class="sheer-tagline">Architecture numérique & Infrastructure IT de précision.</p>
          <div class="sheer-actions">
            <a href="https://wa.me/22898983377" target="_blank" class="action-btn-sheer" aria-label="WhatsApp">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 20.16C10.58 20.16 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.71 20.28 11.92C20.28 16.46 16.58 20.16 12.05 20.16ZM16.61 14.39C16.36 14.27 15.14 13.67 14.91 13.58C14.68 13.5 14.52 13.5 14.36 13.73C14.19 13.97 13.72 14.53 13.57 14.7C13.42 14.87 13.29 14.89 13.04 14.77C12.79 14.64 11.99 14.38 11.04 13.54C10.29 12.87 9.79 12.05 9.66 11.83C9.53 11.61 9.65 11.49 9.78 11.36C9.89 11.25 10.02 11.08 10.14 10.93C10.27 10.79 10.31 10.68 10.39 10.52C10.48 10.35 10.43 10.21 10.37 10.09C10.31 9.96 9.83 8.79 9.63 8.31C9.43 7.84 9.24 7.91 9.09 7.91C8.95 7.91 8.79 7.91 8.62 7.91C8.46 7.91 8.19 7.97 7.96 8.22C7.72 8.47 7.07 9.08 7.07 10.32C7.07 11.56 7.97 12.76 8.11 12.94C8.24 13.12 9.9 15.68 12.44 16.77C13.04 17.03 13.51 17.19 13.88 17.31C14.49 17.5 15.06 17.47 15.51 17.4C16.02 17.33 17.08 16.76 17.3 16.14C17.52 15.51 17.52 14.98 17.45 14.87C17.39 14.75 17.21 14.69 16.96 14.57H16.61V14.39Z"/></svg>
              <span class="sheer-btn-tooltip">WhatsApp</span>
            </a>
            <a href="tel:+22891983377" class="action-btn-sheer" aria-label="Appeler">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38C18.78 15.38 17.59 15.18 16.48 14.82C16.13 14.7 15.74 14.79 15.47 15.06L13.9 17.03C11.07 15.68 8.42 13.13 7.01 10.2L8.96 8.54C9.23 8.26 9.31 7.87 9.2 7.52C8.83 6.41 8.64 5.22 8.64 3.99C8.64 3.44 8.19 3 7.64 3H4.19C3.65 3 3 3.24 3 3.99C3 13.28 10.73 21 20.01 21C20.72 21 21 20.37 21 19.82V16.37C21 15.83 20.55 15.38 20.01 15.38Z"/></svg>
              <span class="sheer-btn-tooltip">Appel</span>
            </a>
            <a href="https://linkedin.com/in/john-sheer" target="_blank" class="action-btn-sheer" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              <span class="sheer-btn-tooltip">LinkedIn</span>
            </a>
            <a href="https://github.com/John-Sheer" target="_blank" class="action-btn-sheer" aria-label="GitHub">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              <span class="sheer-btn-tooltip">GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const sheerModal = document.getElementById('sheerModal');
    const sheerClose = document.getElementById('sheerClose');
    const sheerBackdrop = document.getElementById('sheerBackdrop');

    // Délégation d'événement pour le lien sheerLink
    document.addEventListener('click', (e) => {
        const link = e.target.closest('#sheerLink');
        if (link) {
            e.preventDefault();
            if (sheerModal) {
                sheerModal.classList.add('open');
                sheerModal.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden';
            }
        }
    });

    const closeSheerModal = () => {
        if (sheerModal) {
            sheerModal.classList.remove('open');
            sheerModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    };

    if (sheerClose) sheerClose.addEventListener('click', closeSheerModal);
    if (sheerBackdrop) sheerBackdrop.addEventListener('click', closeSheerModal);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheerModal(); });
}
