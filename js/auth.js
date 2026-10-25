// ===========================================
// Module d'Authentification
// ===========================================

const AUTH_KEY = 'hotel_auth';
const DASHBOARD_EXIT_WARNING = 'Vous allez quitter le tableau de bord. Vos identifiants seront demandés à nouveau avant d’y accéder.';

function getSupabaseClient() {
    if (!window.hotelSupabaseClient) {
        throw new Error(window.hotelSupabaseConfigurationError || 'Supabase n’est pas configuré.');
    }
    return window.hotelSupabaseClient;
}

async function getAuthenticatedProfile() {
    const client = getSupabaseClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError?.name === 'AuthSessionMissingError') return null;
    if (authError) throw authError;
    if (!user) return null;

    const { data: profile, error } = await client
        .from('staff_profiles')
        .select('id, full_name, role, active')
        .eq('id', user.id)
        .maybeSingle();
    if (error) throw error;
    if (!profile || !profile.active) return null;

    return {
        userId: profile.id,
        id: profile.id,
        username: user.email,
        email: user.email,
        name: profile.full_name,
        role: profile.role
    };
}

async function login(email, password) {
    const client = getSupabaseClient();
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) return { success: false, message: 'Adresse e-mail ou mot de passe incorrect.' };

    try {
        const user = await getAuthenticatedProfile();
        if (!user) {
            await client.auth.signOut();
            return { success: false, message: 'Ce compte n’est pas activé pour accéder au tableau de bord.' };
        }
        sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
        logAction('LOGIN', 'Connexion réussie', { role: getRoleLabel(user.role) }, user);
        return { success: true, user };
    } catch (error) {
        await client.auth.signOut();
        throw error;
    }
}

// Déconnexion
async function logout() {
    const confirmed = await showAppConfirm(DASHBOARD_EXIT_WARNING, {
        title: 'Quitter le tableau de bord ?',
        confirmLabel: 'Quitter',
        cancelLabel: 'Rester'
    });
    if (!confirmed) return false;

    try {
        await clearAuthSession();
    } catch (error) {
        console.error('Échec de déconnexion Supabase :', error);
        await showAppAlert('La déconnexion sécurisée a échoué. Vérifiez votre connexion et réessayez.');
        return false;
    }
    window.dashboardExitConfirmed = true;
    window.location.replace('login.html');
    return true;
}

async function clearAuthSession() {
    const session = getCurrentUser();
    if (session) {
        logAction('LOGOUT', 'Déconnexion', { role: getRoleLabel(session.role) });
    }
    if (window.hotelSupabaseClient) {
        const { error } = await window.hotelSupabaseClient.auth.signOut();
        if (error) throw error;
    }
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_KEY);
}

function protectDashboardExit() {
    document.addEventListener('click', async (event) => {
        const link = event.target.closest('a[href]');
        if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;

        const destination = new URL(link.href, window.location.href);
        if (destination.origin === window.location.origin
            && destination.pathname === window.location.pathname
            && destination.search === window.location.search) return;

        event.preventDefault();
        const confirmed = await showAppConfirm(DASHBOARD_EXIT_WARNING, {
            title: 'Quitter le tableau de bord ?',
            confirmLabel: 'Quitter',
            cancelLabel: 'Rester'
        });
        if (!confirmed) return;

        try {
            await clearAuthSession();
        } catch (error) {
            console.error('Échec de déconnexion Supabase :', error);
            await showAppAlert('La déconnexion sécurisée a échoué. Vérifiez votre connexion et réessayez.');
            return;
        }
        window.dashboardExitConfirmed = true;
        window.location.assign(destination.href);
    });

    window.addEventListener('beforeunload', (event) => {
        if (window.dashboardExitConfirmed) return;
        event.preventDefault();
        event.returnValue = '';
    });

    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            getAuthenticatedProfile().then(profile => {
                if (!profile) window.location.replace('login.html');
            }).catch(error => {
                console.error('Échec de vérification de session :', error);
                window.location.replace('login.html');
            });
        }
    });
}

// Obtenir l'utilisateur connecté
function getCurrentUser() {
    const session = sessionStorage.getItem(AUTH_KEY);
    return session ? JSON.parse(session) : null;
}

// Vérifier si connecté
function isAuthenticated() {
    return getAuthenticatedProfile();
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
        owner: ['view_stats', 'view_rooms', 'view_reservations'],

        // Gérant Hôtel: accès complet (chambres + bar)
        hotel_manager: [
            'view_stats', 'view_rooms', 'view_reservations', 'view_orders',
            'create_reservation', 'confirm_reservation', 'cancel_reservation', 'checkin', 'checkout',
            'create_order', 'validate_order', 'cancel_order', 'update_room_status',
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
async function requireAuth(allowedRoles = ['owner', 'hotel_manager', 'bar_manager']) {
    let user;
    try {
        user = await getAuthenticatedProfile();
    } catch (error) {
        console.error('Échec de vérification du compte Supabase :', error);
        await showAppAlert(error.message || 'Impossible de vérifier le compte.');
        window.location.replace('login.html');
        return false;
    }

    if (!user) {
        sessionStorage.removeItem(AUTH_KEY);
        window.location.href = 'login.html';
        return false;
    }

    sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
    if (!allowedRoles.includes(user.role)) {
        showAppAlert('Accès non autorisé').then(async () => {
            try {
                await clearAuthSession();
            } catch (error) {
                console.error('Échec de déconnexion :', error);
            }
            window.dashboardExitConfirmed = true;
            window.location.replace('login.html');
        });
        return false;
    }

    window.hotelCurrentUser = user;
    return true;
}

// ===========================================
// Système de Log des Actions
// ===========================================

// Labels pour les types d'actions
function getActionTypeLabel(type) {
    const labels = {
        'LOGIN': 'Connexion',
        'LOGOUT': 'Déconnexion',
        'RESERVATION_CREATE': 'Réservation créée',
        'RESERVATION_CONFIRM': 'Réservation confirmée',
        'CHECKIN': 'Arrivée enregistrée',
        'CHECKIN_WALK_IN': 'Arrivée sans réservation',
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
        'guest': 'Client',
        'client': 'Client',
        'system': 'Système'
    };
    return labels[role] || role;
}

// Initialisation
