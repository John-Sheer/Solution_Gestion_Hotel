// ===========================================
// Chambres
// ===========================================

let currentTypeFilter = 'all';
let currentStatusFilter = 'all';

function toggleMenu() {
    document.getElementById('navMenu').classList.toggle('open');
}

function renderRooms() {
    const rooms = getRooms();
    const grid = document.getElementById('roomsGrid');
    const availableCount = rooms.filter(room => room.status === 'available').length;

    ['heroAvailable', 'availableRooms'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = availableCount;
    });

    let filtered = rooms;

    if (currentTypeFilter !== 'all') {
        filtered = filtered.filter(r => r.type === currentTypeFilter);
    }

    if (currentStatusFilter !== 'all') {
        filtered = filtered.filter(r => r.status === currentStatusFilter);
    }

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
                <span class="room-status ${room.status}">${getStatusLabel(room.status)}</span>
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
                    <button class="btn btn-primary" onclick="openReservationModal(${room.id})" style="width: 100%;">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                        Réserver cette chambre
                    </button>
                ` : `
                    <button class="btn btn-secondary" disabled style="width: 100%;">
                        ${room.status === 'occupied' ? 'Occupée' : 'Indisponible'}
                    </button>
                `}
            </div>
        </div>
    `).join('');
}

function filterRooms(type) {
    currentTypeFilter = type;
    document.querySelectorAll('.filter-group:first-child .filter-tab').forEach((btn, idx) => {
        const categories = ['all', 'ventilated', 'air_conditioned', 'apartment'];
        btn.classList.toggle('active', categories[idx] === type);
    });
    renderRooms();
}

function filterStatus(status) {
    currentStatusFilter = status;
    document.querySelectorAll('.filter-group:last-child .filter-tab').forEach((btn, idx) => {
        btn.classList.toggle('active',
            (status === 'all' && idx === 0) ||
            (status === 'available' && idx === 1)
        );
    });
    renderRooms();
}

function openReservationModal(roomId) {
    const room = getRoomById(roomId);
    if (!room) return;

    document.getElementById('selectedRoomId').value = roomId;
    document.getElementById('modalRoomName').textContent = `Chambre ${room.number} - ${getTypeLabel(room.type)}`;
    document.getElementById('modalRoomPrice').textContent = formatPrice(room.price);

    // Set default dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    document.getElementById('checkIn').value = today.toISOString().split('T')[0];
    document.getElementById('checkIn').min = today.toISOString().split('T')[0];
    document.getElementById('checkOut').value = tomorrow.toISOString().split('T')[0];
    document.getElementById('checkOut').min = tomorrow.toISOString().split('T')[0];

    calculateTotal();

    document.getElementById('reservationModal').classList.add('open');
}

function closeModal() {
    document.getElementById('reservationModal').classList.remove('open');
    document.getElementById('reservationForm').reset();
}

function calculateTotal() {
    const roomId = parseInt(document.getElementById('selectedRoomId').value);
    const room = getRoomById(roomId);
    if (!room) return;

    const checkIn = new Date(document.getElementById('checkIn').value);
    const checkOut = new Date(document.getElementById('checkOut').value);

    if (checkIn && checkOut && checkOut > checkIn) {
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const total = nights * room.price;

        document.getElementById('nightCount').textContent = nights;
        document.getElementById('totalPrice').textContent = formatPrice(total);
    }
}

function submitReservation(event) {
    event.preventDefault();

    const roomId = parseInt(document.getElementById('selectedRoomId').value);
    const room = getRoomById(roomId);

    const checkIn = new Date(document.getElementById('checkIn').value);
    const checkOut = new Date(document.getElementById('checkOut').value);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    const reservation = {
        roomId: roomId,
        guestName: document.getElementById('guestName').value,
        guestPhone: document.getElementById('guestPhone').value,
        checkIn: document.getElementById('checkIn').value,
        checkOut: document.getElementById('checkOut').value,
        guests: parseInt(document.getElementById('guestCount').value),
        totalPrice: nights * room.price,
        status: 'active'
    };

    // For client reservations, mark as pending (will be confirmed by staff)
    addReservation(reservation, null);

    closeModal();
    renderRooms();

    alert('Votre demande de réservation a été envoyée! Un membre du personnel vous contactera pour confirmation.');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
    renderRooms();

    document.getElementById('checkIn').addEventListener('change', function () {
        const checkIn = new Date(this.value);
        const nextDay = new Date(checkIn);
        nextDay.setDate(nextDay.getDate() + 1);
        document.getElementById('checkOut').min = nextDay.toISOString().split('T')[0];
        calculateTotal();
    });

    document.getElementById('checkOut').addEventListener('change', calculateTotal);
});
