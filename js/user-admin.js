function initUserAdministration() {
    const form = document.getElementById('userInvitationForm');
    form.addEventListener('submit', event => {
        inviteStaffUser(event).catch(error => {
            console.error('Échec de l’invitation du compte :', error);
            showUserInvitationStatus(error.message || 'L’invitation a échoué.', true);
        });
    });
}

function showUserInvitationStatus(message, isError = false) {
    const status = document.getElementById('userInvitationStatus');
    status.textContent = message;
    status.classList.toggle('user-administration-status--error', isError);
}

async function inviteStaffUser(event) {
    event.preventDefault();
    if (currentUser?.role !== 'super_admin') {
        throw new Error('Seul le superuser peut inviter des utilisateurs.');
    }

    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const fullName = form.elements.fullName.value.trim();
    const email = form.elements.email.value.trim().toLowerCase();
    const role = form.elements.role.value;

    if (fullName.length < 2 || !['owner', 'hotel_manager', 'bar_manager'].includes(role)) {
        throw new Error('Vérifiez le nom et le rôle sélectionné.');
    }

    submitButton.disabled = true;
    showUserInvitationStatus('Envoi de l’invitation…');
    try {
        const { data, error } = await getSupabaseClient().functions.invoke('admin-create-user', {
            body: { fullName, email, role }
        });
        if (error) {
            const response = error.context;
            if (response && typeof response.clone === 'function') {
                const payload = await response.clone().json().catch(() => null);
                if (typeof payload?.error === 'string') throw new Error(payload.error);
            }
            throw error;
        }
        if (!data?.invited) throw new Error('Le service n’a pas confirmé la création du compte.');
        form.reset();
        showUserInvitationStatus(`Invitation envoyée à ${email}. Le compte sera actif après acceptation.`);
    } finally {
        submitButton.disabled = false;
    }
}
