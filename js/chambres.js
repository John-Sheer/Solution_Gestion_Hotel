// ===========================================
// Chambres
// ===========================================

let currentTypeFilter = 'all';
let currentStatusFilter = 'all';
let roomAvailability = [];
let roomAvailabilityRequestId = 0;
let selectedGuestCount = 2;
let searchCheckIn;
let searchCheckOut;

function toggleMenu() {
    document.getElementById('navMenu').classList.toggle('open');
}

async function renderRooms() {
    const rooms = getRooms();
    const grid = document.getElementById('roomsGrid');
    const status = document.getElementById('roomSearchStatus');
    const searchButton = document.querySelector('#roomSearchForm button[type="submit"]');
    const requestId = ++roomAvailabilityRequestId;
    searchButton.disabled = true;
    status.textContent = 'Vérification des disponibilités…';
    try {
        const availability = await getSharedRoomAvailability(searchCheckIn, searchCheckOut);
        if (requestId !== roomAvailabilityRequestId) return;
        roomAvailability = availability;
    } catch (error) {
        if (requestId !== roomAvailabilityRequestId) return;
        console.error('Impossible de vérifier les disponibilités partagées :', error);
        status.textContent = error.message || 'Impossible de vérifier les disponibilités. Réessayez ou appelez la réception.';
        roomAvailability = [];
        grid.replaceChildren();
        ['heroAvailable', 'availableRooms'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '--';
        });
        searchButton.disabled = false;
        return;
    }
    if (requestId !== roomAvailabilityRequestId) return;
    searchButton.disabled = false;
    const availableCount = roomAvailability.filter(room => room.available && room.capacity >= selectedGuestCount).length;
    const availabilityByNumber = new Map(roomAvailability.map(room => [room.room_number, room]));
    status.textContent = `${availableCount} chambre(s) disponible(s) pour ${selectedGuestCount} personne(s), du ${formatDate(searchCheckIn)} au ${formatDate(searchCheckOut)}.`;

    ['heroAvailable', 'availableRooms'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = availableCount;
    });

    let filtered = rooms.map(room => {
        const shared = availabilityByNumber.get(room.number);
        return shared ? {
            ...room,
            price: Number(shared.nightly_rate),
            capacity: shared.capacity,
            status: shared.available ? 'available' : 'occupied'
        } : { ...room, status: 'maintenance' };
    });

    if (currentTypeFilter !== 'all') {
        filtered = filtered.filter(r => r.type === currentTypeFilter);
    }

    if (currentStatusFilter !== 'all') {
        filtered = filtered.filter(r =>
            (currentStatusFilter === 'available' ? r.status === 'available' && r.capacity >= selectedGuestCount : true));
    }
    filtered = filtered.filter(room => room.capacity >= selectedGuestCount);

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
                </svg>
                <h3>Aucune chambre trouvée</h3>
                <p>Essayez de modifier vos filtres</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(room => `
        <div class="room-card">
            <div class="room-card-image">
                <img src="${room.image}" alt="${room.name}" loading="lazy">
                <span class="room-status ${room.status}">${room.status === 'available' ? 'Disponible' : room.status === 'maintenance' ? 'Indisponible' : 'Complet pour ces dates'}</span>
                <span class="room-capacity">${room.capacity} personnes</span>
            </div>
            <div class="room-card-content">
                <h3>Chambre ${room.number}</h3>
                <p class="room-type">${getTypeLabel(room.type)}</p>
                <p class="room-price">${formatPrice(room.price)} <span>/ nuit</span></p>
                <div class="room-features">
                    ${room.features.slice(0, 4).map(f => `<span class="room-feature">${f}</span>`).join('')}
                </div>
                ${room.status === 'available' ? `
                    <button class="btn btn-primary" onclick="openReservationModal(${room.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                        Réserver cette chambre
                    </button>
                ` : `
                    <button class="btn btn-secondary" disabled>
                        ${room.status === 'occupied' ? 'Occupée' : 'Indisponible'}
                    </button>
                `}
            </div>
        </div>
    `).join('');
}

function getCurrentRoomData(roomId) {
    const room = getRoomById(roomId);
    const sharedRoom = room && roomAvailability.find(item => item.room_number === room.number);
    return room && sharedRoom
        ? { ...room, price: Number(sharedRoom.nightly_rate), capacity: sharedRoom.capacity }
        : null;
}

function filterRooms(type) {
    currentTypeFilter = type;
    document.querySelectorAll('.filter-group:first-child .filter-tab').forEach((btn, idx) => {
        const categories = ['all', 'ventilated', 'air_conditioned', 'apartment'];
        const active = categories[idx] === type;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
    });
    renderRooms();
}

function filterStatus(status) {
    currentStatusFilter = status;
    document.querySelectorAll('.filter-group:last-child .filter-tab').forEach((btn, idx) => {
        const active =
            (status === 'all' && idx === 0) ||
            (status === 'available' && idx === 1);
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
    });
    renderRooms();
}

function openReservationModal(roomId) {
    const room = getCurrentRoomData(roomId);
    if (!room) return;

    document.getElementById('selectedRoomId').value = roomId;
    document.getElementById('modalRoomName').textContent = `Chambre ${room.number} - ${getTypeLabel(room.type)}`;
    document.getElementById('modalRoomPrice').textContent = formatPrice(room.price);

    // Set default dates
    document.getElementById('checkIn').value = searchCheckIn;
    document.getElementById('checkOut').value = searchCheckOut;

    document.querySelectorAll('#guestCount option').forEach(option => {
        option.disabled = Number(option.value) > room.capacity;
    });
    document.getElementById('guestCount').value = Math.min(selectedGuestCount, room.capacity);

    calculateTotal();

    document.getElementById('reservationModal').classList.add('open');
}

function closeModal() {
    document.getElementById('reservationModal').classList.remove('open');
    document.getElementById('reservationForm').reset();
}

function calculateTotal() {
    const roomId = parseInt(document.getElementById('selectedRoomId').value);
    const room = getCurrentRoomData(roomId);
    if (!room) return;

    const checkIn = new Date(document.getElementById('checkIn').value);
    const checkOut = new Date(document.getElementById('checkOut').value);

    if (!Number.isNaN(checkIn.getTime()) && !Number.isNaN(checkOut.getTime()) && checkOut > checkIn) {
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const total = nights * room.price;

        document.getElementById('nightCount').textContent = nights;
        document.getElementById('totalPrice').textContent = formatPrice(total);
    }
}

async function submitReservation(event) {
    event.preventDefault();

    const roomId = parseInt(document.getElementById('selectedRoomId').value);
    const room = getCurrentRoomData(roomId);

    const checkIn = new Date(document.getElementById('checkIn').value);
    const checkOut = new Date(document.getElementById('checkOut').value);
    const guests = parseInt(document.getElementById('guestCount').value, 10);
    const checkInValue = document.getElementById('checkIn').value;
    const checkOutValue = document.getElementById('checkOut').value;

    if (!room || !checkInValue || !checkOutValue || checkOut <= checkIn) {
        showAppAlert('Veuillez sélectionner des dates de séjour valides.');
        return;
    }
    if (guests > room.capacity) {
        showAppAlert(`Cette chambre peut accueillir au maximum ${room.capacity} personne(s).`);
        return;
    }
    const submitButton = document.querySelector('#reservationForm button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Envoi de la demande…';
    try {
        const result = await createSharedReservation({
            roomNumber: room.number,
            guestName: document.getElementById('guestName').value,
            guestPhone: document.getElementById('guestPhone').value,
            checkIn: checkInValue,
            checkOut: checkOutValue,
            guests
        });
        closeModal();
        await renderRooms();
        await showAppAlert(
            `Demande n°${result.reservation_id} reçue. Estimation : ${formatPrice(Number(result.total_price))}. La réservation reste à confirmer par la réception.`,
            { title: 'Demande enregistrée' }
        );
    } catch (error) {
        console.error('Échec de création de la demande partagée :', error);
        await showAppAlert(error.message || 'La demande n’a pas pu être enregistrée. Vérifiez votre connexion et réessayez.', { title: 'Envoi impossible' });
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Envoyer la demande';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    searchCheckIn = getLocalDateString(today);
    searchCheckOut = getLocalDateString(tomorrow);
    document.getElementById('searchCheckIn').value = searchCheckIn;
    document.getElementById('searchCheckOut').value = searchCheckOut;
    document.getElementById('searchCheckIn').min = searchCheckIn;
    document.getElementById('searchCheckOut').min = searchCheckOut;

    document.getElementById('roomSearchForm').addEventListener('submit', event => {
        event.preventDefault();
        searchCheckIn = document.getElementById('searchCheckIn').value;
        searchCheckOut = document.getElementById('searchCheckOut').value;
        selectedGuestCount = Number(document.getElementById('searchGuests').value);
        if (!searchCheckIn || !searchCheckOut || searchCheckOut <= searchCheckIn) {
            document.getElementById('roomSearchStatus').textContent = 'La date de départ doit être après la date d’arrivée.';
            return;
        }
        filterStatus('all');
        renderRooms();
    });
    renderRooms();
});
