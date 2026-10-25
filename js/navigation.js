function setNavigationMenu(open) {
    const menu = document.getElementById('navMenu');
    const toggle = document.querySelector('.menu-toggle');

    if (!menu || !toggle) return;

    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation');
}

function toggleMenu() {
    const menu = document.getElementById('navMenu');
    setNavigationMenu(!menu?.classList.contains('open'));
}

document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('navMenu');
    const toggle = document.querySelector('.menu-toggle');

    if (!menu || !toggle) return;

    toggle.setAttribute('aria-controls', menu.id);
    setNavigationMenu(menu.classList.contains('open'));

    menu.addEventListener('click', (event) => {
        if (event.target.closest('a')) setNavigationMenu(false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setNavigationMenu(false);
    });

    const closeDialog = dialog => {
        const closeActions = {
            reservationModal: () => closeModal(),
            orderModal: () => closeOrderModal(),
            walkInModal: () => closeWalkInModal(),
            cartSidebar: () => closeCart()
        };
        closeActions[dialog.id]?.();
    };
    let activeDialog = null;
    let returnFocus = null;
    let lastClickedElement = null;

    document.addEventListener('click', event => {
        lastClickedElement = event.target instanceof Element ? event.target.closest('button, a, [role="button"]') : null;
    }, true);

    const syncDialog = () => {
        const next = document.querySelector(
            '.modal-overlay.open [role="dialog"][aria-modal="true"], .cart-sidebar.open[role="dialog"][aria-modal="true"]'
        );
        if (next === activeDialog) return;
        if (activeDialog && !next) {
            if (returnFocus?.isConnected) returnFocus.focus();
            activeDialog = null;
        }
        if (next) {
            activeDialog = next;
            returnFocus = lastClickedElement;
            next.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')?.focus();
        }
    };

    new MutationObserver(syncDialog).observe(document.body, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
    document.addEventListener('keydown', event => {
        if (!activeDialog) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeDialog(activeDialog.closest('.modal-overlay') || activeDialog);
            return;
        }
        if (event.key !== 'Tab') return;
        const focusable = [...activeDialog.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )].filter(element => element.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeDialog(overlay.querySelector('[role="dialog"]'));
        });
    });
});
