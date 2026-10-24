// ===========================================
// Module d'Authentification
// ===========================================

const AUTH_KEY = 'hotel_auth';
const USERS_KEY = 'hotel_users';
const ACTIONS_LOG_KEY = 'hotel_actions';

// Utilisateurs par défaut
// Rôles: owner (propriétaire, lecture seule), hotel_manager (gérant hôtel, tout), bar_manager (gérant bar, boissons seulement)
const defaultUsers = [
    {
        id: 1,
        username: 'proprietaire',
        password: 'admin2026',
        role: 'owner',
        name: 'Administrateur',
        createdAt: new Date().toISOString()
    },
    {
        id: 2,
        username: 'gerant_hotel',
        password: 'hotel2026',
        role: 'hotel_manager',
        name: 'Kouassi Ameyo',
        createdAt: new Date().toISOString()
    },
    {
        id: 3,
        username: 'gerant_bar',
        password: 'bar2026',
        role: 'bar_manager',
        name: 'Mensah Kodjo',
        createdAt: new Date().toISOString()
    }
];

// Initialiser les utilisateurs
function initUsers() {
    // Forcer la réinitialisation pour les nouveaux rôles
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
}

// Obtenir tous les utilisateurs
function getUsers() {
    initUsers();
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

// Authentification
function login(username, password) {
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        const session = {
            userId: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify(session));
        logAction('LOGIN', `Connexion réussie`);
        return { success: true, user: session };
    }

    return { success: false, message: 'Identifiants incorrects' };
}

// Déconnexion
function logout() {
    const session = getCurrentUser();
    if (session) {
        logAction('LOGOUT', `Déconnexion`);
    }
    localStorage.removeItem(AUTH_KEY);
    window.location.href = 'login.html';
}

// Obtenir l'utilisateur connecté
function getCurrentUser() {
    const session = localStorage.getItem(AUTH_KEY);
    return session ? JSON.parse(session) : null;
}

// Vérifier si connecté
function isAuthenticated() {
    return getCurrentUser() !== null;
}

// Vérifier le rôle
function hasRole(role) {
    const user = getCurrentUser();
    return user && user.role === role;
}

// Vérifier si l'utilisateur peut effectuer une action
function canPerformAction(action) {
    const user = getCurrentUser();
    if (!user) return false;

    // Définition des permissions par rôle
    const permissions = {
        // Propriétaire: lecture seule + modification statut chambres
        owner: ['view_stats', 'view_rooms', 'view_reservations', 'view_orders', 'update_room_status'],

        // Gérant Hôtel: accès complet (chambres + bar)
        hotel_manager: [
            'view_stats', 'view_rooms', 'view_reservations', 'view_orders',
            'create_reservation', 'cancel_reservation', 'checkout',
            'create_order', 'validate_order', 'cancel_order',
            'restock'
        ],

        // Gérant Bar: vente boissons uniquement
        bar_manager: [
            'view_stats', 'view_orders',
            'create_order', 'validate_order', 'cancel_order',
            'restock'
        ]
    };

    const userPermissions = permissions[user.role] || [];
    return userPermissions.includes(action);
}

// Protéger une page (rediriger si non connecté)
function requireAuth(allowedRoles = ['owner', 'staff']) {
    const user = getCurrentUser();

    if (!user) {
        window.location.href = 'login.html';
        return false;
    }

    if (!allowedRoles.includes(user.role)) {
        alert('Accès non autorisé');
        logout();
        return false;
    }

    return true;
}

// ===========================================
// Système de Log des Actions
// ===========================================

function logAction(type, description, details = {}) {
    const user = getCurrentUser();
    const logs = JSON.parse(localStorage.getItem(ACTIONS_LOG_KEY) || '[]');

    const logEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: type,
        description: description,
        details: details,
        user: user ? {
            id: user.userId,
            name: user.name,
            role: user.role
        } : { name: 'Système', role: 'system' }
    };

    logs.unshift(logEntry); // Ajouter au début

    // Garder seulement les 500 derniers logs
    if (logs.length > 500) {
        logs.splice(500);
    }

    localStorage.setItem(ACTIONS_LOG_KEY, JSON.stringify(logs));
    return logEntry;
}

function getActionLogs(limit = 50) {
    const logs = JSON.parse(localStorage.getItem(ACTIONS_LOG_KEY) || '[]');
    return logs.slice(0, limit);
}

function getActionLogsByUser(userId, limit = 50) {
    const logs = JSON.parse(localStorage.getItem(ACTIONS_LOG_KEY) || '[]');
    return logs.filter(log => log.user && log.user.id === userId).slice(0, limit);
}

function getActionLogsByType(type, limit = 50) {
    const logs = JSON.parse(localStorage.getItem(ACTIONS_LOG_KEY) || '[]');
    return logs.filter(log => log.type === type).slice(0, limit);
}

// Labels pour les types d'actions
function getActionTypeLabel(type) {
    const labels = {
        'LOGIN': 'Connexion',
        'LOGOUT': 'Déconnexion',
        'RESERVATION_CREATE': 'Réservation créée',
        'RESERVATION_CANCEL': 'Réservation annulée',
        'CHECKOUT': 'Check-out',
        'ORDER_CREATE': 'Commande créée',
        'ORDER_VALIDATE': 'Commande validée',
        'ORDER_CANCEL': 'Commande annulée',
        'ROOM_STATUS': 'Statut chambre modifié',
        'STOCK_UPDATE': 'Stock mis à jour'
    };
    return labels[type] || type;
}

// Labels pour les rôles
function getRoleLabel(role) {
    const labels = {
        'owner': 'Propriétaire',
        'hotel_manager': 'Gérant Hôtel',
        'bar_manager': 'Gérant Bar',
        'system': 'Système'
    };
    return labels[role] || role;
}

// Initialisation
initUsers();
