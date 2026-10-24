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
});
