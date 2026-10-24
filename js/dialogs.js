let appDialogSequence = 0;

function showAppDialog(message, {
    title = 'Hôtel Carrefour des Retrouvailles',
    confirm = false,
    confirmLabel = confirm ? 'Confirmer' : 'Compris',
    cancelLabel = 'Annuler'
} = {}) {
    return new Promise(resolve => {
        const dialog = document.createElement('dialog');
        const dialogId = ++appDialogSequence;
        const titleId = `appDialogTitle-${dialogId}`;
        const messageId = `appDialogMessage-${dialogId}`;

        dialog.className = 'app-dialog';
        dialog.setAttribute('aria-labelledby', titleId);
        dialog.setAttribute('aria-describedby', messageId);
        dialog.innerHTML = `
            <div class="app-dialog__content">
                <span class="app-dialog__icon" aria-hidden="true">!</span>
                <h2 class="app-dialog__title" id="${titleId}"></h2>
                <p class="app-dialog__message" id="${messageId}"></p>
                <div class="app-dialog__actions">
                    ${confirm ? '<button type="button" class="app-dialog__button app-dialog__button--secondary" data-dialog-cancel></button>' : ''}
                    <button type="button" class="app-dialog__button app-dialog__button--primary" data-dialog-confirm autofocus></button>
                </div>
            </div>`;
        dialog.querySelector(`#${titleId}`).textContent = title;
        dialog.querySelector(`#${messageId}`).textContent = message;
        dialog.querySelector('[data-dialog-confirm]').textContent = confirmLabel;

        const cancelButton = dialog.querySelector('[data-dialog-cancel]');
        if (cancelButton) cancelButton.textContent = cancelLabel;

        let settled = false;
        const finish = result => {
            if (settled) return;
            settled = true;
            if (dialog.open) dialog.close();
            dialog.remove();
            resolve(result);
        };

        dialog.querySelector('[data-dialog-confirm]').addEventListener('click', () => finish(true));
        if (cancelButton) cancelButton.addEventListener('click', () => finish(false));
        dialog.addEventListener('click', event => {
            if (event.target === dialog) finish(false);
        });
        dialog.addEventListener('cancel', event => {
            event.preventDefault();
            finish(false);
        });
        dialog.addEventListener('close', () => finish(false), { once: true });

        document.body.appendChild(dialog);
        dialog.showModal();
    });
}

function showAppAlert(message, options = {}) {
    return showAppDialog(message, { title: 'Information', ...options });
}

function showAppConfirm(message, options = {}) {
    return showAppDialog(message, { title: 'Confirmer cette action', ...options, confirm: true });
}
