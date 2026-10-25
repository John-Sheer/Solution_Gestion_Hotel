const SHARED_OPERATION_TABLES = {
    reservations: 'hotel_reservations',
    orders: 'hotel_orders'
};

function sharedOperationClient() {
    if (typeof getSupabaseClient === 'function') return getSupabaseClient();
    if (window.hotelSupabaseClient) return window.hotelSupabaseClient;
    throw new Error(window.hotelSupabaseConfigurationError || 'Supabase n’est pas configuré.');
}

function sharedOperationRoomId(roomNumber) {
    const room = getRoomByNumber(roomNumber);
    if (!room) throw new Error(`La chambre ${roomNumber} n’existe pas dans le catalogue local.`);
    return room.id;
}

function reportSharedRefreshFailure(message, error) {
    console.error(message, error);
    const status = document.getElementById('sharedOperationsStatus');
    if (status) status.textContent = 'Modification enregistrée, mais le tableau de bord n’a pas pu se resynchroniser. Réessayez avec Actualiser.';
}

function mapSharedReservation(row) {
    return {
        id: Number(row.id),
        roomId: sharedOperationRoomId(row.room_number),
        roomNumber: row.room_number,
        guestName: row.guest_name,
        guestPhone: row.guest_phone,
        checkIn: row.check_in,
        checkOut: row.check_out,
        guests: row.guests,
        totalPrice: Number(row.total_price),
        status: row.status,
        createdAt: row.created_at,
        createdBy: { name: 'Client', role: 'client' }
    };
}

function mapSharedOrder(row) {
    return {
        id: Number(row.id),
        roomNumber: row.room_number,
        items: row.items,
        totalPrice: Number(row.total_price),
        status: row.status,
        createdAt: row.created_at,
        createdBy: { name: 'Client', role: 'client' }
    };
}

async function loadSharedReservations() {
    const { data, error } = await sharedOperationClient()
        .from(SHARED_OPERATION_TABLES.reservations)
        .select('id, room_number, guest_name, guest_phone, check_in, check_out, guests, total_price, status, created_at')
        .order('created_at', { ascending: false });
    if (error) throw error;
    window.hotelSharedReservations = data.map(mapSharedReservation);
    return window.hotelSharedReservations;
}

async function loadSharedOrders() {
    const { data, error } = await sharedOperationClient()
        .from(SHARED_OPERATION_TABLES.orders)
        .select('id, room_number, items, total_price, status, created_at')
        .order('created_at', { ascending: false });
    if (error) throw error;
    window.hotelSharedOrders = data.map(mapSharedOrder);
    return window.hotelSharedOrders;
}

async function manageSharedReservation(id, status) {
    const { error } = await sharedOperationClient().rpc('manage_hotel_reservation', {
        p_reservation_id: id,
        p_status: status
    });
    if (error) throw error;
    const reservation = getReservationById(id);
    if (reservation) reservation.status = status;
    if (reservation && ['completed', 'cancelled'].includes(status)) {
        const room = getRoomById(reservation.roomId);
        if (room?.status === 'occupied') updateRoom(room.id, { status: 'available' });
    } else if (reservation && status === 'checked_in') {
        updateRoom(reservation.roomId, { status: 'occupied' });
    }
    try {
        await Promise.all([loadSharedReservations(), loadSharedRoomStatuses()]);
    } catch (refreshError) {
        reportSharedRefreshFailure('La modification de réservation a réussi, mais le rechargement des données a échoué :', refreshError);
    }
}

async function manageSharedOrder(id, status) {
    const { error } = await sharedOperationClient().rpc('manage_hotel_order', {
        p_order_id: id,
        p_status: status
    });
    if (error) throw error;
    const order = getOrders().find(item => item.id === id);
    if (order) order.status = status;
    try {
        await loadSharedOrders();
    } catch (refreshError) {
        reportSharedRefreshFailure('La modification de commande a réussi, mais le rechargement des données a échoué :', refreshError);
    }
}

async function loadSharedBeverageStock() {
    const { data, error } = await sharedOperationClient().rpc('get_public_beverage_menu');
    if (error) throw error;
    const remote = new Map(data.map(beverage => [beverage.beverage_id, beverage]));
    const beverages = getBeverages().map(beverage => {
        const shared = remote.get(beverage.id);
        return shared ? { ...beverage, price: Number(shared.unit_price), stock: shared.stock } : beverage;
    });
    setData(STORAGE_KEYS.BEVERAGES, beverages);
    const byId = new Map(beverages.map(beverage => [beverage.id, beverage]));
    const cart = getCart().map(item => {
        const beverage = byId.get(item.beverageId);
        return beverage ? { ...item, name: beverage.name, price: beverage.price, image: beverage.image } : item;
    });
    setData(STORAGE_KEYS.CART, cart);
    return beverages;
}

async function placeSharedHotelOrder(roomNumber, guestPhone, cart) {
    const { data, error } = await sharedOperationClient().rpc('create_public_hotel_order', {
        p_room_number: roomNumber,
        p_guest_phone: guestPhone,
        p_items: cart.map(item => ({ beverage_id: item.beverageId, quantity: item.quantity }))
    });
    if (error) throw error;
    if (!data?.[0]) throw new Error('La commande n’a pas été confirmée par le serveur.');
    return { id: Number(data[0].order_id), totalPrice: Number(data[0].total_price) };
}

async function getSharedRoomAvailability(checkIn, checkOut) {
    const { data, error } = await sharedOperationClient().rpc('get_public_room_availability', {
        p_check_in: checkIn,
        p_check_out: checkOut
    });
    if (error) throw error;
    return data;
}

async function loadSharedRoomStatuses() {
    const { data, error } = await sharedOperationClient().rpc('get_staff_room_statuses');
    if (error) throw error;
    data.forEach(status => {
        const room = getRoomByNumber(status.room_number);
        if (!room) throw new Error(`La chambre ${status.room_number} manque dans le catalogue local.`);
        updateRoom(room.id, { status: status.maintenance ? 'maintenance' : status.occupied ? 'occupied' : 'available' });
    });
}

async function setSharedRoomMaintenance(roomNumber, maintenance) {
    const { error } = await sharedOperationClient().rpc('set_hotel_room_maintenance', {
        p_room_number: roomNumber,
        p_maintenance: maintenance
    });
    if (error) throw error;
    const room = getRoomByNumber(roomNumber);
    if (room) updateRoom(room.id, { status: maintenance ? 'maintenance' : 'available' });
    try {
        await loadSharedRoomStatuses();
    } catch (refreshError) {
        reportSharedRefreshFailure('La disponibilité de la chambre a été modifiée, mais son état n’a pas pu être rechargé :', refreshError);
    }
}

async function createSharedReservation(details) {
    const { data, error } = await sharedOperationClient().rpc('create_public_reservation', {
        p_room_number: details.roomNumber,
        p_guest_name: details.guestName,
        p_guest_phone: details.guestPhone,
        p_check_in: details.checkIn,
        p_check_out: details.checkOut,
        p_guests: details.guests
    });
    if (error) throw error;
    if (!data?.[0]) throw new Error('La demande de réservation n’a pas été confirmée par le serveur.');
    return data[0];
}

async function createSharedWalkInReservation(details) {
    const { data, error } = await sharedOperationClient().rpc('create_staff_walk_in_reservation', {
        p_room_number: details.roomNumber,
        p_guest_name: details.guestName,
        p_guest_phone: details.guestPhone,
        p_check_out: details.checkOut,
        p_guests: details.guests
    });
    if (error) throw error;
    if (!data?.[0]) throw new Error('L’arrivée n’a pas été confirmée par le serveur.');
    const room = getRoomByNumber(details.roomNumber);
    const reservation = {
        id: Number(data[0].reservation_id),
        roomId: room?.id,
        roomNumber: details.roomNumber,
        guestName: details.guestName,
        guestPhone: details.guestPhone,
        checkIn: getLocalDateString(new Date()),
        checkOut: details.checkOut,
        guests: details.guests,
        totalPrice: Number(data[0].total_price),
        status: 'checked_in',
        createdAt: new Date().toISOString(),
        createdBy: { name: 'Personnel', role: 'hotel_manager' }
    };
    if (room) updateRoom(room.id, { status: 'occupied' });
    if (Array.isArray(window.hotelSharedReservations)) window.hotelSharedReservations.unshift(reservation);
    try {
        await Promise.all([loadSharedReservations(), loadSharedRoomStatuses()]);
    } catch (refreshError) {
        reportSharedRefreshFailure('L’arrivée a été enregistrée, mais le tableau de bord n’a pas pu se resynchroniser :', refreshError);
    }
    return data[0];
}

async function restockSharedBeverage(id, quantity = 10) {
    const { error } = await sharedOperationClient().rpc('restock_hotel_beverage', {
        p_beverage_id: id,
        p_quantity: quantity
    });
    if (error) throw error;
    const beverage = getBeverageById(id);
    if (beverage) updateBeverage(id, { stock: beverage.stock + quantity });
    try {
        await loadSharedBeverageStock();
    } catch (refreshError) {
        reportSharedRefreshFailure('Le réapprovisionnement a été enregistré, mais le stock n’a pas pu être rechargé :', refreshError);
    }
}
