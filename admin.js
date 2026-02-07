// ===========================================
// HOTEL LE PRINCE - Admin Dashboard
// ===========================================

let currentUser = null;

function toggleMenu() {
    document.getElementById('navMenu').classList.toggle('open');
}

// Check authentication on load
function checkAuth() {
    if (!requireAuth(['owner', 'hotel_manager', 'bar_manager'])) {
        return false;
    }

    currentUser = getCurrentUser();

    // Update UI based on role
    const isOwner = currentUser.role === 'owner';
    const isBarManager = currentUser.role === 'bar_manager';
    const isHotelManager = currentUser.role === 'hotel_manager';

    // Show user badge
    document.getElementById('userBadgeContainer').innerHTML = `
        <div class="user-badge">
            <div class="avatar">${currentUser.name.charAt(0)}</div>
            <span>${currentUser.name}</span>
            <button onclick="logout()" style="background: none; border: none; cursor: pointer; margin-left: 8px;" title="Déconnexion">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
            </button>
        </div>
    `;

    // Update subtitle
    let subtitle = '';
    if (isOwner) subtitle = 'Vue propriétaire (lecture seule)';
    else if (isHotelManager) subtitle = 'Gérant Hôtel - Accès complet';
    else if (isBarManager) subtitle = 'Gérant Bar - Boissons uniquement';
    document.getElementById('dashboardSubtitle').textContent = subtitle;

    // Show owner notice
    if (isOwner) {
        document.getElementById('ownerNotice').style.display = 'flex';
        document.getElementById('reservationsSection').style.display = 'block';
        document.getElementById('ordersSection').style.display = 'none';
        document.getElementById('stockSection').style.display = 'none';
    }

    // Adjust visibility based on role
    if (isBarManager) {
        document.getElementById('reservationsSection').style.display = 'none';
        document.getElementById('roomsTable').closest('.table-container').style.display = 'none';
        document.getElementById('ordersSection').style.display = 'block';
        document.getElementById('stockSection').style.display = 'block';
    }

    if (isHotelManager) {
        document.getElementById('reservationsSection').style.display = 'block';
        document.getElementById('ordersSection').style.display = 'block';
        document.getElementById('stockSection').style.display = 'block';
    }

    // Hide action columns for owner
    document.querySelectorAll('.staff-only').forEach(el => {
        el.style.display = isOwner ? 'none' : '';
    });

    return true;
}

function renderStats() {
    const stats = getStats();
    const grid = document.getElementById('statsGrid');

    grid.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
                </svg>
            </div>
            <div class="stat-content">
                <h3>${stats.rooms.occupancyRate}%</h3>
                <p>Taux d'occupation</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
            </div>
            <div class="stat-content">
                <h3>${stats.reservations.active}</h3>
                <p>Réservations actives</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
            </div>
            <div class="stat-content">
                <h3>${formatPrice(stats.reservations.revenue)}</h3>
                <p>Revenus chambres</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23.693L5 15.5m14.8-.2l.447 2.578a1.125 1.125 0 0 1-1.147 1.306H4.9a1.125 1.125 0 0 1-1.147-1.306l.478-2.778" />
                </svg>
            </div>
            <div class="stat-content">
                <h3>${formatPrice(stats.orders.revenue)}</h3>
                <p>Revenus bar</p>
            </div>
        </div>
    `;
}

function renderReservations() {
    const reservations = getReservations().filter(r => r.status === 'active');
    const tbody = document.getElementById('reservationsTable');
    const isOwner = currentUser && currentUser.role === 'owner';

    if (reservations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isOwner ? 4 : 5}" style="text-align: center; padding: 24px; color: var(--text-secondary);">Aucune réservation en cours</td></tr>`;
        return;
    }

    tbody.innerHTML = reservations.map(res => {
        const room = getRoomById(res.roomId);
        return `
        <tr>
            <td>
                <strong>${res.guestName}</strong><br>
                <small style="color: var(--text-secondary);">${res.guestPhone}</small>
            </td>
            <td>${room ? room.number : 'N/A'}</td>
            <td>${formatShortDate(res.checkIn)} → ${formatShortDate(res.checkOut)}</td>
            <td><span class="badge badge-info">${getStatusLabel(res.status)}</span></td>
            ${!isOwner ? `
            <td>
                <button class="btn btn-sm btn-success" onclick="doCheckout(${res.id})" title="Check-out">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                </button>
                <button class="btn btn-sm btn-danger" onclick="doCancelReservation(${res.id})" title="Annuler">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
            </td>
            ` : ''}
        </tr>
    `;
    }).join('');
}

function renderOrders() {
    const orders = getOrders();
    const tbody = document.getElementById('ordersTable');

    const pendingCount = orders.filter(o => o.status === 'pending').length;
    document.getElementById('pendingOrdersCount').textContent = `${pendingCount} en attente`;

    // Show only recent orders (last 10)
    const recent = orders.slice(-10).reverse();

    if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-secondary);">Aucune commande</td></tr>`;
        return;
    }

    tbody.innerHTML = recent.map(order => `
        <tr>
            <td>#${order.id}</td>
            <td>${order.roomNumber}</td>
            <td>${formatPrice(order.totalPrice)}</td>
            <td>
                <span class="badge ${order.status === 'pending' ? 'badge-warning' : order.status === 'completed' ? 'badge-success' : 'badge-danger'}">
                    ${getStatusLabel(order.status)}
                </span>
            </td>
            <td>
                ${order.status === 'pending' ? `
                    <button class="btn btn-sm btn-success" onclick="doValidateOrder(${order.id})" title="Valider">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="doCancelOrder(${order.id})" title="Annuler">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

function renderRooms() {
    const rooms = getRooms();
    const tbody = document.getElementById('roomsTable');
    const isOwner = currentUser && currentUser.role === 'owner';

    tbody.innerHTML = rooms.map(room => `
        <tr>
            <td><strong>${room.number}</strong></td>
            <td>${getTypeLabel(room.type)}</td>
            <td>${formatPrice(room.price)}</td>
            <td>${room.capacity} pers.</td>
            <td>
                <span class="badge ${room.status === 'available' ? 'badge-success' : room.status === 'occupied' ? 'badge-danger' : 'badge-warning'}">
                    ${getStatusLabel(room.status)}
                </span>
            </td>
            ${isOwner ? `
            <td>
                <select onchange="doChangeRoomStatus(${room.id}, this.value)" class="form-select" style="padding: 6px 10px; font-size: 0.8rem; width: auto;">
                    <option value="available" ${room.status === 'available' ? 'selected' : ''}>Disponible</option>
                    <option value="occupied" ${room.status === 'occupied' ? 'selected' : ''}>Occupée</option>
                    <option value="maintenance" ${room.status === 'maintenance' ? 'selected' : ''}>Indisponible</option>
                </select>
            </td>
            ` : '<td>-</td>'}
        </tr>
    `).join('');
}

function renderStock() {
    const beverages = getBeverages().filter(b => b.stock < 30);
    const tbody = document.getElementById('stockTable');

    document.getElementById('lowStockCount').textContent = `${beverages.filter(b => b.stock < 20).length} alertes`;

    if (beverages.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-secondary);">Tous les stocks sont suffisants</td></tr>`;
        return;
    }

    tbody.innerHTML = beverages.map(bev => `
        <tr>
            <td><strong>${bev.name}</strong></td>
            <td>${getCategoryLabel(bev.category)}</td>
            <td>
                <span class="badge ${bev.stock < 10 ? 'badge-danger' : bev.stock < 20 ? 'badge-warning' : 'badge-info'}">
                    ${bev.stock} unités
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="doRestock(${bev.id})" title="Réapprovisionner">
                    +10
                </button>
            </td>
        </tr>
    `).join('');
}

function renderActivityLog() {
    const logs = getActionLogs(15);
    const tbody = document.getElementById('activityTable');

    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-secondary);">Aucune activité enregistrée</td></tr>`;
        return;
    }

    tbody.innerHTML = logs.map(log => `
        <tr>
            <td style="white-space: nowrap;">${formatDateTime(log.timestamp)}</td>
            <td><span class="badge badge-neutral">${getActionTypeLabel(log.type)}</span></td>
            <td>${log.description}</td>
            <td>
                <strong>${log.user.name}</strong><br>
                <small style="color: var(--text-secondary);">${getRoleLabel(log.user.role)}</small>
            </td>
        </tr>
    `).join('');
}

// Staff actions
function doCheckout(reservationId) {
    if (!canPerformAction('checkout')) {
        alert('Action non autorisée');
        return;
    }

    if (confirm('Confirmer le check-out ?')) {
        completeReservation(reservationId);
        logAction('CHECKOUT', `Check-out réservation #${reservationId}`);
        renderAll();
    }
}

function doCancelReservation(reservationId) {
    if (!canPerformAction('cancel_reservation')) {
        alert('Action non autorisée');
        return;
    }

    if (confirm('Annuler cette réservation ?')) {
        cancelReservation(reservationId);
        logAction('RESERVATION_CANCEL', `Réservation #${reservationId} annulée`);
        renderAll();
    }
}

function doValidateOrder(orderId) {
    if (!canPerformAction('validate_order')) {
        alert('Action non autorisée');
        return;
    }

    updateOrderStatus(orderId, 'completed', currentUser);
    logAction('ORDER_VALIDATE', `Commande #${orderId} validée`);
    renderAll();
}

function doCancelOrder(orderId) {
    if (!canPerformAction('cancel_order')) {
        alert('Action non autorisée');
        return;
    }

    if (confirm('Annuler cette commande ?')) {
        updateOrderStatus(orderId, 'cancelled', currentUser);
        logAction('ORDER_CANCEL', `Commande #${orderId} annulée`);
        renderAll();
    }
}

function doChangeRoomStatus(roomId, status) {
    if (!canPerformAction('update_room_status')) {
        alert('Action non autorisée');
        return;
    }

    updateRoom(roomId, { status });
    logAction('ROOM_STATUS', `Chambre #${roomId} → ${getStatusLabel(status)}`);
    renderAll();
}

function doRestock(beverageId) {
    if (!canPerformAction('restock')) {
        alert('Action non autorisée');
        return;
    }

    const bev = getBeverageById(beverageId);
    if (bev) {
        updateBeverage(beverageId, { stock: bev.stock + 10 });
        logAction('STOCK_UPDATE', `${bev.name}: +10 unités`);
        renderAll();
    }
}

function renderAll() {
    renderStats();
    renderReservations();
    renderRooms();
    renderActivityLog();

    // Render these for managers
    const canViewOrders = canPerformAction('view_orders');
    if (canViewOrders && currentUser.role !== 'owner') {
        renderOrders();
        renderStock();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    if (checkAuth()) {
        renderAll();
    }
});
