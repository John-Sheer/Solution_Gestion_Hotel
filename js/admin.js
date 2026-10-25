// ===========================================
// Admin Dashboard
// ===========================================

let currentUser = null;
let walkInAvailabilityRequestId = 0;
let walkInAvailableRooms = [];

function toggleMenu() {
    document.getElementById('navMenu').classList.toggle('open');
}

// Check authentication on load
async function checkAuth() {
    if (!await requireAuth(['owner', 'hotel_manager', 'bar_manager', 'super_admin'])) {
        return false;
    }

    protectDashboardExit();
    currentUser = window.hotelCurrentUser;

    // Update UI based on role
    const isOwner = currentUser.role === 'owner';
    const isBarManager = currentUser.role === 'bar_manager';
    const isHotelManager = currentUser.role === 'hotel_manager';
    const isSuperAdmin = currentUser.role === 'super_admin';
    if (isHotelManager || isBarManager) {
        const container = document.querySelector('.main-content > .container');
        const accountingSection = document.getElementById('accountingSection');
        const activitySection = document.getElementById('activitySection');
        container.insertBefore(accountingSection, activitySection.nextSibling);
    }
    document.getElementById('walkInButton').style.display = isHotelManager ? '' : 'none';

    // Show user badge
    document.getElementById('userBadgeContainer').innerHTML = `
        <div class="user-badge">
            <div class="avatar">${currentUser.name.charAt(0)}</div>
            <span>${currentUser.name}</span>
            <button onclick="logout()" style="background: none; border: none; cursor: pointer; margin-left: 8px;" title="Déconnexion" aria-label="Se déconnecter">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
            </button>
        </div>
    `;

    // Update subtitle
    let subtitle = '';
    if (isSuperAdmin) subtitle = 'Administration des comptes';
    else if (isOwner) subtitle = 'Vue propriétaire (lecture seule)';
    else if (isHotelManager) subtitle = 'Gérant Hôtel - Accès complet';
    else if (isBarManager) subtitle = 'Gérant Bar - Boissons uniquement';
    document.getElementById('dashboardSubtitle').textContent = subtitle;

    // Show owner notice
    if (isOwner) {
        document.getElementById('ownerNotice').style.display = 'flex';
        document.getElementById('reservationsSection').style.display = 'block';
        document.getElementById('roomStatusSection').style.display = 'none';
        document.getElementById('ordersSection').style.display = 'none';
        document.getElementById('stockSection').style.display = 'none';
    }

    // Adjust visibility based on role
    if (isBarManager) {
        document.getElementById('reservationsSection').style.display = 'none';
        document.getElementById('roomStatusSection').style.display = 'none';
        document.getElementById('ordersSection').style.display = 'block';
        document.getElementById('stockSection').style.display = 'block';
        document.getElementById('activitySection').style.display = 'none';
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
    document.querySelectorAll('.dashboard-jump-links a').forEach(link => {
        const target = document.querySelector(link.getAttribute('href'));
        link.hidden = !target || target.hidden || target.style.display === 'none';
    });

    document.body.classList.remove('auth-pending');
    if (isSuperAdmin) {
        document.getElementById('userAdministrationSection').hidden = false;
        document.querySelectorAll('.main-content > .container > :not(#userAdministrationSection)')
            .forEach(element => { element.hidden = true; });
        return true;
    }
    return true;
}

function renderStats() {
    const stats = getStats();
    const grid = document.getElementById('statsGrid');
    const note = document.getElementById('dashboardOverviewNote');
    const ownerRoomSnapshot = document.getElementById('ownerRoomSnapshot');
    const role = currentUser.role;
    const icons = {
        rooms: '<path d="M3 10.5 12 4l9 6.5V21H3V10.5Z"/><path d="M8 21v-6h8v6M7 11h.01M17 11h.01"/>',
        available: '<path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/>',
        occupied: '<path d="M3 11h18v9H3zM5 11V7h14v4M7 20v1m10-1v1"/>',
        maintenance: '<path d="M14.7 6.3a5 5 0 0 0-6.6 6.6L3 18l3 3 5.1-5.1a5 5 0 0 0 6.6-6.6L14 13l-3-3 3.7-3.7Z"/>',
        roomRevenue: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M8 15h3"/>',
        barRevenue: '<path d="M5 3h14l-1.5 8a5.5 5.5 0 0 1-11 0L5 3ZM12 16.5V21m-4 0h8M8 7h8"/>',
        totalRevenue: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H20v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z"/><path d="M4 8h13m3 4h-4a2 2 0 0 0 0 4h4m-4-2h.01"/>',
        monthRevenue: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m-13 4h2m3 0h2m-7 3h2"/>',
        pending: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        stays: '<path d="M3 11h18v9H3zM5 11V7h14v4M7 20v1m10-1v1"/>',
        orders: '<path d="M4 5h16v15H4zM8 9h8m-8 4h8m-8 4h4"/>',
        todayOrders: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h2M8 17h2"/>',
        todayRevenue: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18m-13 5h3"/>',
        lowStock: '<path d="m12 3 9 16H3l9-16Z"/><path d="M12 9v4m0 3h.01"/>'
    };
    const cards = role === 'owner' ? [
        ['rooms', stats.rooms.total, 'Chambres au total', `${stats.rooms.occupancyRate}% d’occupation`],
        ['available', stats.rooms.available, 'Libres cette nuit', 'Réservations prises en compte'],
        ['occupied', stats.rooms.occupied, 'Chambres occupées', 'État actuel'],
        ['maintenance', stats.rooms.maintenance, 'Indisponibles', 'En maintenance'],
        ['roomRevenue', '—', 'Recettes chambres', 'Encaissements inscrits au registre'],
        ['barRevenue', '—', 'Recettes du bar', 'Encaissements inscrits au registre'],
        ['totalRevenue', '—', 'Encaissements nets', 'Chambres + bar, après contre-écritures'],
        ['monthRevenue', '—', 'Encaissé ce mois', 'Registre comptable central']
    ] : role === 'hotel_manager' ? [
        ['available', stats.rooms.available, 'Chambres libres', 'Disponibles cette nuit'],
        ['pending', stats.reservations.pending, 'Demandes à confirmer', 'Réservations clients'],
        ['stays', stats.reservations.checkedIn, 'Clients en séjour', 'Départs enregistrés au check-out'],
        ['orders', stats.orders.pending, 'Commandes à traiter', 'Commandes bar en attente'],
        ['roomTodayRevenue', '—', 'Encaissements chambres aujourd’hui', 'Écritures du registre']
    ] : [
        ['pending', stats.orders.pending, 'Commandes en attente', 'À préparer ou valider'],
        ['todayOrders', stats.orders.today, 'Commandes du jour', 'Toutes commandes reçues'],
        ['todayRevenue', '—', 'Encaissements bar aujourd’hui', 'Écritures du registre'],
        ['lowStock', stats.beverages.lowStock, 'Alertes de stock', 'Produits sous le seuil']
    ];

    const titles = {
        owner: ['Vue propriétaire', 'Occupation et encaissements réellement inscrits au registre central.'],
        hotel_manager: ['Pilotage de l’hôtel', 'Arrivées à traiter, séjours en cours et chambres disponibles.'],
        bar_manager: ['Pilotage du bar', 'Commandes, ventes validées du jour et alertes de stock.']
    };
    document.getElementById('dashboardOverviewTitle').textContent = titles[role][0];
    note.textContent = titles[role][1];
    grid.className = `stats-grid stats-grid--${role.replace('_', '-')}`;
    grid.innerHTML = cards.map(([key, value, label, detail]) => `
        <article class="stat-card stat-card--${key}">
            <span class="stat-card__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[key]}</svg>
            </span>
            <div class="stat-content">
                <p class="stat-label">${label}</p>
                <h3>${value}</h3>
                <p class="stat-detail">${detail}</p>
            </div>
        </article>
    `).join('');

    ownerRoomSnapshot.hidden = role !== 'owner';
    if (role === 'owner') renderOwnerRoomSnapshot();
}

function renderOwnerRoomSnapshot() {
    const rooms = getRooms();
    const reservations = getReservations();
    const today = getLocalDateString(new Date());
    const grid = document.getElementById('ownerRoomGrid');
    document.getElementById('ownerRoomCount').textContent = `${rooms.length} chambres`;

    grid.innerHTML = rooms.map(room => {
        const currentReservation = reservations.find(reservation =>
            reservation.roomId === room.id &&
            ['requested', 'active', 'checked_in'].includes(reservation.status) &&
            reservation.checkIn <= today && reservation.checkOut > today
        );
        const status = room.status === 'maintenance' ? 'maintenance'
            : currentReservation && currentReservation.status === 'checked_in' ? 'checked_in'
                : room.status === 'occupied' ? 'occupied'
                    : currentReservation ? currentReservation.status : 'available';
        const statusLabel = status === 'checked_in' ? 'En séjour'
            : status === 'requested' ? 'Demande en attente'
                : status === 'active' ? 'Arrivée prévue'
                    : getStatusLabel(status);
        const statusClass = status === 'available' ? 'available'
            : status === 'checked_in' || status === 'occupied' ? 'occupied'
                : status === 'maintenance' ? 'maintenance' : 'reserved';

        return `
            <article class="owner-room-card owner-room-card--${statusClass}">
                <div class="owner-room-card__top">
                    <strong>Chambre ${escapeHtml(room.number)}</strong>
                    <span class="owner-room-status">${escapeHtml(statusLabel)}</span>
                </div>
                <p>${escapeHtml(getTypeLabel(room.type))} · ${room.capacity} pers.</p>
                <div class="owner-room-card__bottom">
                    <span>${formatPrice(room.price)}<small> / nuit</small></span>
                    ${currentReservation ? `<span class="owner-room-guest">${escapeHtml(currentReservation.guestName)}</span>` : ''}
                </div>
            </article>
        `;
    }).join('');
}

function renderReservations() {
    const reservations = getReservations()
        .filter(r => ['requested', 'active', 'checked_in'].includes(r.status))
        .sort((a, b) => {
            const priority = { requested: 0, active: 1, checked_in: 2 };
            return priority[a.status] - priority[b.status] || a.checkIn.localeCompare(b.checkIn);
        });
    const tbody = document.getElementById('reservationsTable');
    const isOwner = currentUser && currentUser.role === 'owner';
    document.getElementById('pendingReservationsCount').textContent = `${reservations.filter(r => r.status === 'requested').length} à confirmer`;

    if (reservations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isOwner ? 4 : 5}" style="text-align: center; padding: 24px; color: var(--text-secondary);">Aucune demande ou réservation en cours</td></tr>`;
        return;
    }

    tbody.innerHTML = reservations.map(res => {
        const room = getRoomById(res.roomId);
        return `
        <tr>
            <td>
                <strong>${escapeHtml(res.guestName)}</strong><br>
                <small style="color: var(--text-secondary);">${escapeHtml(res.guestPhone)}</small>
            </td>
            <td>${room ? room.number : 'N/A'}</td>
            <td>${formatShortDate(res.checkIn)} → ${formatShortDate(res.checkOut)}</td>
            <td><span class="badge ${res.status === 'requested' ? 'badge-warning' : res.status === 'checked_in' ? 'badge-success' : 'badge-info'}">${getStatusLabel(res.status)}</span></td>
            ${!isOwner ? `
            <td>
                <div class="reservation-actions">
                    ${res.status === 'requested' ? `<button class="btn reservation-action reservation-action--confirm" onclick="doConfirmReservation(${res.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7" />
                        </svg>
                        Confirmer
                    </button>` : res.status === 'active' ? `<button class="btn reservation-action reservation-action--checkin" onclick="doCheckin(${res.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 8.25 17.25 12l-3.75 3.75M17.25 12H3m9-8.25h6A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25h-6" />
                        </svg>
                        Check-in
                    </button>` : `<button class="btn reservation-action reservation-action--checkout" onclick="doCheckout(${res.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12.5 9.5 17 19 7" />
                        </svg>
                        Check-out
                    </button>`}
                    <button class="btn reservation-action reservation-action--cancel" onclick="doCancelReservation(${res.id})" aria-label="Annuler la réservation" title="Annuler">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
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

    const recent = [...orders].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

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
    const canUpdateRoomStatus = canPerformAction('update_room_status');

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
            ${canUpdateRoomStatus ? `
            <td>
                <select onchange="doChangeRoomStatus(${room.id}, this.value)" class="form-select" aria-label="Disponibilité de la chambre ${escapeHtml(room.number)}" style="padding: 6px 10px; font-size: 0.8rem; width: auto;">
                    ${room.status === 'occupied' ? '<option value="occupied" selected disabled>Occupée</option>' : ''}
                    <option value="available" ${room.status === 'available' ? 'selected' : ''} ${room.status === 'occupied' ? 'disabled' : ''}>Disponible</option>
                    <option value="maintenance" ${room.status === 'maintenance' ? 'selected' : ''} ${room.status === 'occupied' ? 'disabled' : ''}>Indisponible</option>
                </select>
            </td>
            ` : '<td>-</td>'}
        </tr>
    `).join('');
}

function renderStock() {
    const beverages = getBeverages().filter(b => b.stock < 20);
    const tbody = document.getElementById('stockTable');

    document.getElementById('lowStockCount').textContent = `${beverages.length} alertes`;

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
    const logs = getActionLogs(50);
    const tbody = document.getElementById('activityTable');
    const count = document.getElementById('activityCount');
    count.textContent = `${logs.length} ${logs.length > 1 ? 'actions récentes' : 'action récente'}`;

    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-secondary);">Aucune activité enregistrée</td></tr>`;
        return;
    }

    tbody.innerHTML = logs.map(log => `
        <tr>
            <td style="white-space: nowrap;">
                <strong>${escapeHtml(formatDateTime(log.timestamp))}</strong>
            </td>
            <td><span class="badge badge-neutral">${escapeHtml(getActionTypeLabel(log.type))}</span></td>
            <td>
                <strong>${escapeHtml(log.description || getActionTypeLabel(log.type))}</strong>
                ${renderActivityDetails(log.details)}
            </td>
            <td>
                <strong>${escapeHtml(log.user && log.user.name || 'Utilisateur inconnu')}</strong><br>
                <small style="color: var(--text-secondary);">${escapeHtml(getRoleLabel(log.user && log.user.role || 'system'))}</small>
            </td>
        </tr>
    `).join('');
}

function renderActivityDetails(details = {}) {
    if (!details || typeof details !== 'object' || Array.isArray(details)) return '';

    const labels = {
        guestName: 'Client',
        guestPhone: 'Téléphone',
        roomNumber: 'Chambre',
        roomType: 'Type',
        checkIn: 'Arrivée',
        checkOut: 'Départ prévu',
        guests: 'Personnes',
        totalPrice: 'Montant estimé',
        nightlyRate: 'Tarif par nuit',
        fromStatus: 'État précédent',
        toStatus: 'Nouvel état',
        reservationId: 'Réservation',
        orderId: 'Commande',
        roomPrice: 'Tarif par nuit',
        itemCount: 'Articles',
        itemsSummary: 'Contenu',
        beverageName: 'Produit',
        category: 'Catégorie',
        previousStock: 'Stock précédent',
        addedStock: 'Ajout',
        newStock: 'Nouveau stock',
        role: 'Profil'
    };
    const entries = Object.entries(details).filter(([key, value]) =>
        labels[key] && value !== null && value !== undefined && value !== ''
    );
    if (entries.length === 0) return '';

    return `<dl class="activity-details">${entries.map(([key, value]) => {
        let displayValue = value;
        if (key === 'checkIn' || key === 'checkOut') displayValue = formatActivityDate(value);
        else if (key === 'totalPrice' || key === 'nightlyRate' || key === 'roomPrice') displayValue = formatPrice(Number(value));
        else if (key === 'fromStatus' || key === 'toStatus') displayValue = getStatusLabel(value);
        else if (key === 'guests') displayValue = `${value} ${Number(value) === 1 ? 'personne' : 'personnes'}`;
        else if (key === 'itemCount') displayValue = `${value} ${Number(value) === 1 ? 'article' : 'articles'}`;

        return `<div class="activity-detail"><dt>${labels[key]}</dt><dd>${escapeHtml(displayValue)}</dd></div>`;
    }).join('')}</dl>`;
}

function formatActivityDate(value) {
    if (typeof value !== 'string') return value;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value;
    return formatShortDate(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function openWalkInModal() {
    if (!canPerformAction('create_reservation') || currentUser.role !== 'hotel_manager') {
        showAppAlert('Action non autorisée');
        return;
    }

    const form = document.getElementById('walkInForm');
    const today = getLocalDateString(new Date());
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = getLocalDateString(tomorrowDate);

    form.reset();
    document.getElementById('walkInCheckIn').value = today;
    document.getElementById('walkInCheckOut').min = tomorrow;
    document.getElementById('walkInCheckOut').value = tomorrow;
    refreshWalkInRooms();
    document.getElementById('walkInModal').classList.add('open');
    requestAnimationFrame(() => document.getElementById('walkInGuestName').focus());
}

async function refreshWalkInRooms(selectedRoomId = '') {
    const roomSelect = document.getElementById('walkInRoom');
    const today = getLocalDateString(new Date());
    const checkOut = document.getElementById('walkInCheckOut').value;
    const requestId = ++walkInAvailabilityRequestId;
    const submitButton = document.getElementById('walkInSubmit');
    const status = document.getElementById('walkInAvailabilityStatus');

    submitButton.disabled = true;
    status.textContent = 'Vérification des disponibilités…';
    roomSelect.replaceChildren(new Option('Chargement des chambres…', ''));
    walkInAvailableRooms = [];
    updateWalkInEstimate();

    try {
        const remoteRooms = await getSharedRoomAvailability(today, checkOut);
        if (requestId !== walkInAvailabilityRequestId) return;
        walkInAvailableRooms = remoteRooms.filter(room => room.available).map(remoteRoom => {
            const localRoom = getRoomByNumber(remoteRoom.room_number);
            if (!localRoom) throw new Error(`La chambre ${remoteRoom.room_number} manque dans le catalogue local.`);
            return { ...localRoom, price: Number(remoteRoom.nightly_rate), capacity: remoteRoom.capacity };
        });
    } catch (error) {
        if (requestId !== walkInAvailabilityRequestId) return;
        console.error('Impossible de vérifier les chambres disponibles :', error);
        status.textContent = error.message || 'Les disponibilités ne peuvent pas être vérifiées. Réessayez.';
        roomSelect.replaceChildren(new Option('Disponibilités indisponibles', ''));
        updateWalkInEstimate();
        return;
    }

    roomSelect.replaceChildren(new Option(
        walkInAvailableRooms.length ? 'Choisir une chambre' : 'Aucune chambre disponible sur ces dates',
        ''
    ));
    walkInAvailableRooms.forEach(room => {
        roomSelect.add(new Option(
            `Chambre ${room.number} · ${getTypeLabel(room.type)} · ${formatPrice(room.price)}/nuit`,
            room.id
        ));
    });
    if (walkInAvailableRooms.some(room => String(room.id) === String(selectedRoomId))) {
        roomSelect.value = String(selectedRoomId);
    }

    submitButton.disabled = walkInAvailableRooms.length === 0;
    status.textContent = walkInAvailableRooms.length
        ? `${walkInAvailableRooms.length} chambre(s) disponible(s) pour la période.`
        : 'Aucune chambre disponible sur ces dates.';
    updateWalkInEstimate();
}

function closeWalkInModal() {
    document.getElementById('walkInModal').classList.remove('open');
    document.getElementById('walkInForm').reset();
}

function updateWalkInEstimate() {
    const room = walkInAvailableRooms.find(item => item.id === Number(document.getElementById('walkInRoom').value));
    const checkOut = document.getElementById('walkInCheckOut').value;
    const guests = document.getElementById('walkInGuests');
    const estimate = document.getElementById('walkInEstimate');

    [...guests.options].forEach(option => {
        option.disabled = room ? Number(option.value) > room.capacity : false;
    });
    if (room && Number(guests.value) > room.capacity) guests.value = String(room.capacity);

    if (!room || !checkOut || checkOut <= getLocalDateString(new Date())) {
        estimate.hidden = true;
        return;
    }

    const today = getLocalDateString(new Date());
    const nights = Math.round((Date.parse(`${checkOut}T00:00:00`) - Date.parse(`${today}T00:00:00`)) / 86400000);
    if (nights < 1) {
        estimate.hidden = true;
        return;
    }

    document.getElementById('walkInNights').textContent = nights;
    document.getElementById('walkInTotal').textContent = formatPrice(nights * room.price);
    estimate.hidden = false;
}

async function submitWalkIn(event) {
    event.preventDefault();
    if (!canPerformAction('create_reservation') || currentUser.role !== 'hotel_manager') {
        showAppAlert('Action non autorisée');
        return;
    }

    const form = document.getElementById('walkInForm');
    const button = document.getElementById('walkInSubmit');
    button.disabled = true;
    try {
        const result = await createSharedWalkInReservation({
            roomNumber: getRoomById(Number(form.elements.roomId.value))?.number,
            guestName: form.elements.guestName.value.trim(),
            guestPhone: form.elements.guestPhone.value.trim(),
            checkOut: form.elements.checkOut.value,
            guests: Number(form.elements.guests.value)
        });
        const reservation = getReservationById(Number(result.reservation_id));
        const room = reservation && getRoomById(reservation.roomId);
        closeWalkInModal();
        renderAll();
        await showAppAlert(`Arrivée enregistrée${room ? ` pour la chambre ${room.number}` : ''}.`, { title: 'Arrivée enregistrée' });
    } catch (error) {
        console.error('Échec de création de l’arrivée partagée :', error);
        await showAppAlert(error.message || 'Impossible d’attribuer cette chambre. Vérifiez la disponibilité et réessayez.');
        await loadSharedReservations().then(renderAll).catch(refreshError => {
            console.error('Impossible d’actualiser les réservations après échec :', refreshError);
        });
    } finally {
        button.disabled = walkInAvailableRooms.length === 0;
    }
}

// Staff actions
async function doCheckout(reservationId) {
    if (!canPerformAction('checkout')) {
        showAppAlert('Action non autorisée');
        return;
    }

    if (await showAppConfirm('Confirmer le check-out ?', { title: 'Enregistrer le départ' })) {
        const reservation = getReservationById(reservationId);
        if (!reservation) {
            await showAppAlert('Impossible d’enregistrer le départ : le séjour est introuvable ou déjà terminé.');
            renderAll();
            return;
        }
        try {
            await manageSharedReservation(reservationId, 'completed');
        } catch (error) {
            console.error('Échec du check-out partagé :', error);
            await showAppAlert(error.message || 'Le départ n’a pas été enregistré. Réessayez.');
            return;
        }
        const room = getRoomById(reservation.roomId);
        logAction('CHECKOUT', `Départ de ${reservation.guestName}`, {
            guestName: reservation.guestName,
            guestPhone: reservation.guestPhone,
            roomNumber: room ? room.number : 'N/A',
            roomType: room ? getTypeLabel(room.type) : '',
            nightlyRate: room ? room.price : null,
            checkIn: reservation.checkIn,
            checkOut: reservation.checkOut,
            guests: reservation.guests,
            totalPrice: reservation.totalPrice,
            reservationId: reservation.id,
            fromStatus: 'checked_in',
            toStatus: 'completed'
        });
        renderAll();
    }
}

async function doCheckin(reservationId) {
    if (!canPerformAction('checkin')) {
        showAppAlert('Action non autorisée');
        return;
    }

    const reservation = getReservationById(reservationId);
    if (!reservation) {
        showAppAlert('Le check-in est impossible : réservation introuvable.');
        return;
    }
    try {
        await manageSharedReservation(reservationId, 'checked_in');
    } catch (error) {
        console.error('Échec du check-in partagé :', error);
        await showAppAlert(error.message || 'Le check-in n’a pas été enregistré.');
        return;
    }

    const room = getRoomById(reservation.roomId);
    logAction('CHECKIN', `Arrivée de ${reservation.guestName}`, {
        guestName: reservation.guestName,
        guestPhone: reservation.guestPhone,
        roomNumber: room ? room.number : 'N/A',
        roomType: room ? getTypeLabel(room.type) : '',
        nightlyRate: room ? room.price : null,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        guests: reservation.guests,
        totalPrice: reservation.totalPrice,
        reservationId: reservation.id,
        fromStatus: 'active',
        toStatus: 'checked_in'
    });
    renderAll();
}

async function doConfirmReservation(reservationId) {
    if (!canPerformAction('confirm_reservation')) {
        showAppAlert('Action non autorisée');
        return;
    }

    const reservation = getReservationById(reservationId);
    if (!reservation) {
        showAppAlert('Réservation introuvable.');
        return;
    }
    try {
        await manageSharedReservation(reservationId, 'active');
    } catch (error) {
        console.error('Échec de confirmation partagée :', error);
        await showAppAlert(error.message || 'Impossible de confirmer cette réservation.');
        await loadSharedReservations().then(renderAll);
        return;
    }

    const room = getRoomById(reservation.roomId);
    logAction('RESERVATION_CONFIRM', `Réservation de ${reservation.guestName} confirmée`, {
        guestName: reservation.guestName,
        guestPhone: reservation.guestPhone,
        roomNumber: room ? room.number : 'N/A',
        roomType: room ? getTypeLabel(room.type) : '',
        nightlyRate: room ? room.price : null,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        guests: reservation.guests,
        totalPrice: reservation.totalPrice,
        reservationId: reservation.id,
        fromStatus: 'requested',
        toStatus: reservation.status
    });
    renderAll();
}

async function doCancelReservation(reservationId) {
    if (!canPerformAction('cancel_reservation')) {
        showAppAlert('Action non autorisée');
        return;
    }

    if (await showAppConfirm('Annuler cette réservation ?', { title: 'Annuler la réservation' })) {
        const reservation = getReservationById(reservationId);
        if (!reservation) {
            showAppAlert('Impossible d’annuler : la réservation est introuvable ou déjà terminée.');
            renderAll();
            return;
        }
        try {
            await manageSharedReservation(reservationId, 'cancelled');
        } catch (error) {
            console.error('Échec de l’annulation partagée :', error);
            await showAppAlert(error.message || 'Impossible d’annuler cette réservation.');
            return;
        }
        const room = getRoomById(reservation.roomId);
        logAction('RESERVATION_CANCEL', `Réservation de ${reservation.guestName} annulée`, {
            guestName: reservation.guestName,
            guestPhone: reservation.guestPhone,
            roomNumber: room ? room.number : 'N/A',
            roomType: room ? getTypeLabel(room.type) : '',
            nightlyRate: room ? room.price : null,
            checkIn: reservation.checkIn,
            checkOut: reservation.checkOut,
            totalPrice: reservation.totalPrice,
            reservationId: reservation.id,
            fromStatus: reservation.status,
            toStatus: 'cancelled'
        });
        renderAll();
    }
}

async function doValidateOrder(orderId) {
    if (!canPerformAction('validate_order')) {
        showAppAlert('Action non autorisée');
        return;
    }

    const order = getOrders().find(item => item.id === orderId);
    if (!order) {
        showAppAlert('Commande introuvable.');
        return;
    }
    try {
        await manageSharedOrder(orderId, 'completed');
    } catch (error) {
        console.error('Échec de validation de commande :', error);
        await showAppAlert(error.message || 'La commande n’a pas pu être validée.');
        return;
    }
    logAction('ORDER_VALIDATE', `Commande #${orderId} validée`, getOrderActivityDetails(order));
    renderAll();
}

async function doCancelOrder(orderId) {
    if (!canPerformAction('cancel_order')) {
        showAppAlert('Action non autorisée');
        return;
    }

    if (await showAppConfirm('Annuler cette commande ?', { title: 'Annuler la commande' })) {
        const order = getOrders().find(item => item.id === orderId);
        if (!order) {
            showAppAlert('Commande introuvable.');
            return;
        }
        try {
            await manageSharedOrder(orderId, 'cancelled');
        } catch (error) {
            console.error('Échec de l’annulation de commande :', error);
            await showAppAlert(error.message || 'La commande n’a pas pu être annulée.');
            return;
        }
        logAction('ORDER_CANCEL', `Commande #${orderId} annulée`, getOrderActivityDetails(order));
        renderAll();
    }
}

async function doChangeRoomStatus(roomId, status) {
    if (!canPerformAction('update_room_status')) {
        showAppAlert('Action non autorisée');
        renderAll();
        return;
    }

    const room = getRoomById(roomId);
    if (!room || !['available', 'maintenance'].includes(status)) {
        showAppAlert('Impossible de modifier l’état de cette chambre.');
        renderAll();
        return;
    }
    const maintenance = status === 'maintenance';
    const previousStatus = room.status;
    if ((previousStatus === 'maintenance') === maintenance) return;
    try {
        await setSharedRoomMaintenance(room.number, maintenance);
        logAction('ROOM_STATUS', `État de la chambre ${room.number} modifié`, {
            roomNumber: room.number,
            roomType: getTypeLabel(room.type),
            fromStatus: previousStatus,
            toStatus: maintenance ? 'maintenance' : 'available'
        });
        renderAll();
    } catch (error) {
        console.error('Échec de mise à jour de la disponibilité de la chambre :', error);
        await showAppAlert(error.message || 'La disponibilité de la chambre n’a pas été modifiée.');
        await loadSharedRoomStatuses().then(renderAll).catch(refreshError => {
            console.error('Impossible de recharger les états des chambres :', refreshError);
        });
    }
}

async function doRestock(beverageId) {
    if (!canPerformAction('restock')) {
        showAppAlert('Action non autorisée');
        return;
    }

    const bev = getBeverageById(beverageId);
    if (bev) {
        try {
            await restockSharedBeverage(beverageId, 10);
            logAction('STOCK_UPDATE', `Stock de ${bev.name} réapprovisionné`, {
            beverageName: bev.name,
            category: getCategoryLabel(bev.category),
            previousStock: bev.stock,
            addedStock: 10,
            newStock: bev.stock + 10
        });
            renderAll();
        } catch (error) {
            console.error('Échec du réapprovisionnement partagé :', error);
            await showAppAlert(error.message || 'Le stock n’a pas été mis à jour.');
        }
    }
}

function getOrderActivityDetails(order) {
    const items = Array.isArray(order.items) ? order.items : [];
    const summary = items.map(item => `${item.quantity} × ${item.name}`).join(', ');
    return {
        orderId: order.id,
        roomNumber: order.roomNumber,
        itemCount: items.reduce((total, item) => total + item.quantity, 0),
        itemsSummary: summary,
        totalPrice: order.totalPrice,
        fromStatus: 'pending',
        toStatus: order.status
    };
}

const dashboardTablePages = new Map();

function applyDashboardTableTools(tableId) {
    const tbody = document.getElementById(tableId);
    const search = document.querySelector(`[data-table-search="${tableId}"]`);
    const pagination = document.querySelector(`[data-table-pagination="${tableId}"]`);
    if (!tbody || !search || !pagination) return;

    const headers = [...tbody.closest('table').querySelectorAll('thead th')].map(header => header.textContent.trim());
    tbody.querySelectorAll('tr').forEach(row => {
        row.querySelectorAll('td').forEach((cell, index) => {
            if (headers[index]) cell.dataset.label = headers[index];
        });
    });
    const query = search.value.trim().toLocaleLowerCase('fr');
    const rows = [...tbody.querySelectorAll('tr')];
    const filtered = rows.filter(row => row.textContent.toLocaleLowerCase('fr').includes(query));
    const pageSize = 10;
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const page = Math.min(dashboardTablePages.get(tableId) || 1, pageCount);
    dashboardTablePages.set(tableId, page);
    rows.forEach(row => { row.hidden = true; });
    filtered.slice((page - 1) * pageSize, page * pageSize).forEach(row => { row.hidden = false; });

    const rangeStart = filtered.length ? (page - 1) * pageSize + 1 : 0;
    const rangeEnd = Math.min(page * pageSize, filtered.length);
    pagination.innerHTML = `
        <span>${rangeStart}–${rangeEnd} sur ${filtered.length}</span>
        <button type="button" class="btn btn-secondary" data-page-step="-1" ${page <= 1 ? 'disabled' : ''} aria-label="Page précédente">Précédent</button>
        <span>Page ${page} / ${pageCount}</span>
        <button type="button" class="btn btn-secondary" data-page-step="1" ${page >= pageCount ? 'disabled' : ''} aria-label="Page suivante">Suivant</button>`;
    pagination.querySelectorAll('[data-page-step]').forEach(button => {
        button.addEventListener('click', () => {
            dashboardTablePages.set(tableId, page + Number(button.dataset.pageStep));
            applyDashboardTableTools(tableId);
        });
    });
}

function initDashboardTableTools() {
    document.querySelectorAll('[data-table-search]').forEach(input => {
        input.addEventListener('input', () => {
            dashboardTablePages.set(input.dataset.tableSearch, 1);
            applyDashboardTableTools(input.dataset.tableSearch);
        });
        applyDashboardTableTools(input.dataset.tableSearch);
    });
}

async function refreshSharedOperations() {
    const jobs = [];
    if (['owner', 'hotel_manager'].includes(currentUser.role)) {
        jobs.push(loadSharedReservations(), loadSharedRoomStatuses());
    }
    if (['hotel_manager', 'bar_manager'].includes(currentUser.role)) {
        jobs.push(loadSharedOrders(), loadSharedBeverageStock());
    }
    await Promise.all(jobs);
    renderAll();
    document.getElementById('sharedOperationsStatus').textContent =
        `Données actualisées à ${new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lome' }).format(new Date())}.`;
}

function renderAll() {
    renderStats();
    if (['owner', 'hotel_manager'].includes(currentUser.role)) renderReservations();
    else {
        document.getElementById('reservationsTable').replaceChildren();
        document.getElementById('pendingReservationsCount').textContent = '0 à confirmer';
    }
    if (currentUser.role === 'hotel_manager') renderRooms();
    if (currentUser.role !== 'bar_manager') renderActivityLog();

    // Render these for managers
    const canViewOrders = canPerformAction('view_orders');
    if (canViewOrders && currentUser.role !== 'owner') {
        renderOrders();
        renderStock();
    }
    ['reservationsTable', 'ordersTable', 'activityTable'].forEach(applyDashboardTableTools);
}

// Initialize
document.addEventListener('DOMContentLoaded', async function () {
    if (await checkAuth()) {
        if (currentUser.role === 'super_admin') {
            initUserAdministration();
            return;
        }
        document.getElementById('walkInRoom').addEventListener('change', updateWalkInEstimate);
        document.getElementById('walkInCheckOut').addEventListener('change', () => {
            refreshWalkInRooms(document.getElementById('walkInRoom').value);
        });
        document.getElementById('walkInCheckOut').addEventListener('change', updateWalkInEstimate);
        try {
            document.getElementById('refreshReservationsButton').addEventListener('click', () => {
                refreshSharedOperations().catch(error => {
                    console.error('Impossible d’actualiser les réservations :', error);
                    document.getElementById('sharedOperationsStatus').textContent = error.message || 'Échec de l’actualisation.';
                });
            });
            document.getElementById('refreshOrdersButton').addEventListener('click', () => {
                refreshSharedOperations().catch(error => {
                    console.error('Impossible d’actualiser les commandes :', error);
                    document.getElementById('sharedOperationsStatus').textContent = error.message || 'Échec de l’actualisation.';
                });
            });
            await refreshSharedOperations();
            await initAccounting();
            initDashboardTableTools();
            window.setInterval(() => {
                refreshSharedOperations().catch(error => {
                    console.error('Actualisation automatique des opérations partagées échouée :', error);
                    document.getElementById('sharedOperationsStatus').textContent =
                        error.message || 'Échec de la synchronisation automatique. Utilisez Actualiser pour réessayer.';
                });
            }, 60000);
        } catch (error) {
            console.error('Impossible de charger les données partagées du tableau de bord :', error);
            await showAppAlert(error.message || 'Les données de gestion n’ont pas pu être chargées. Vérifiez que la migration Supabase des opérations partagées est appliquée.');
        }
    }
});
