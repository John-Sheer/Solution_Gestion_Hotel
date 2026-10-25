const ACCOUNTING_ENTRY_LABELS = {
    room_payment: 'Règlement chambre',
    bar_sale: 'Vente du bar',
    opening_balance: 'Fonds initial',
    expense: 'Dépense',
    cash_deposit: 'Dépôt caisse',
    cash_withdrawal: 'Retrait caisse',
    reversal: 'Contre-écriture'
};

const ACCOUNTING_ROLE_LABELS = {
    owner: 'Propriétaire',
    hotel_manager: 'Gérant hôtel',
    bar_manager: 'Gérant bar'
};

let accountingEntriesCache = [];

function accountingClient() {
    return getSupabaseClient();
}

function accountingEscape(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function accountingFormatDate(value) {
    return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Africa/Lome'
    }).format(new Date(value));
}

function accountingDepartmentLabel(department) {
    return department === 'bar' ? 'Bar' : 'Hôtel';
}

function accountingMethodLabel(method) {
    return method === 'mobile_money' ? 'Mobile money' : 'Espèces';
}

function accountingFormatAmount(value) {
    return `${new Intl.NumberFormat('fr-FR').format(BigInt(value || 0))} FCFA`;
}

function accountingStatus(closure) {
    const review = (closure.cash_closure_reviews || [])
        .slice()
        .sort((a, b) => new Date(b.reviewed_at) - new Date(a.reviewed_at))[0];
    return review ? review.decision : 'pending';
}

function configureAccountingRole() {
    const isOwner = currentUser.role === 'owner';
    const entryPanel = document.getElementById('accountingEntryPanel');
    const closurePanel = document.getElementById('cashClosurePanel');
    const managerPanel = document.getElementById('managerAccountingPanel');
    const approvalPanel = document.getElementById('closureApprovalPanel');
    const openingPanel = document.getElementById('openingBalancePanel');
    const departmentSelects = [
        ...document.querySelectorAll('#accountingEntryForm select[name="department"], #cashClosureForm select[name="department"]')
    ];

    managerPanel.hidden = isOwner;
    entryPanel.hidden = isOwner;
    closurePanel.hidden = isOwner;
    approvalPanel.hidden = !isOwner;
    openingPanel.hidden = !isOwner;
    document.getElementById('accountingRoleNote').textContent = isOwner
        ? 'Consultez les écritures, définissez les fonds initiaux et approuvez ou rejetez les clôtures.'
        : 'Enregistrez chaque mouvement réel et soumettez votre clôture quotidienne au propriétaire.';

    departmentSelects.forEach(select => {
        if (currentUser.role === 'bar_manager') {
            select.value = 'bar';
            select.disabled = true;
        }
    });
    document.getElementById('openingCashier').addEventListener('change', () => {
        updateOpeningDepartmentOptions().catch(showAccountingError);
    });
    document.querySelectorAll('#openingBalanceForm select[name="department"], #openingBalanceForm select[name="paymentMethod"]')
        .forEach(select => select.addEventListener('change', () => {
            updateOpeningDepartmentOptions().catch(showAccountingError);
        }));
    document.querySelectorAll('#accountingEntryForm select[name="entryType"]').forEach(select => {
        select.addEventListener('change', updateAccountingEntryRequirements);
    });
    document.querySelectorAll('#accountingEntryForm select[name="paymentMethod"]').forEach(select => {
        select.addEventListener('change', updateAccountingEntryRequirements);
    });
    document.querySelectorAll('#cashClosureForm select[name="department"]').forEach(select => {
        select.addEventListener('change', () => loadCashPreview().catch(showAccountingError));
    });
    document.getElementById('accountingEntryForm').addEventListener('submit', event => {
        submitAccountingEntry(event).catch(showAccountingError);
    });
    document.getElementById('openingBalanceForm').addEventListener('submit', event => {
        submitOpeningBalance(event).catch(showAccountingError);
    });
    document.getElementById('cashClosureForm').addEventListener('submit', event => {
        submitCashClosure(event).catch(showAccountingError);
    });
    document.getElementById('accountingRefreshButton').addEventListener('click', () => {
        loadAccountingData().catch(showAccountingError);
    });

    updateAccountingEntryRequirements();
    if (!isOwner) loadCashPreview();
}

async function showAccountingError(error) {
    console.error('Erreur de comptabilité :', error);
    await showAppAlert(error.message || 'Une erreur comptable est survenue.');
}

function updateAccountingEntryRequirements() {
    const form = document.getElementById('accountingEntryForm');
    const type = form.elements.entryType.value;
    const department = form.elements.department;
    const reference = form.elements.reference;
    const paymentReferenceField = document.getElementById('accountingPaymentReferenceField');
    const paymentReference = form.elements.paymentReference;
    const receiptField = document.getElementById('accountingReceiptField');
    const receipt = form.elements.receipt;

    if (currentUser.role === 'bar_manager') department.value = 'bar';
    else if (type === 'room_payment') department.value = 'hotel';
    else if (type === 'bar_sale') department.value = 'bar';
    department.disabled = currentUser.role === 'bar_manager' || ['room_payment', 'bar_sale'].includes(type);
    reference.required = ['room_payment', 'bar_sale'].includes(type);
    paymentReferenceField.hidden = form.elements.paymentMethod.value !== 'mobile_money';
    if (paymentReferenceField.hidden) paymentReference.value = '';
    receiptField.hidden = type !== 'expense';
    receipt.required = type === 'expense';
    if (receiptField.hidden) receipt.value = '';
}

async function loadOpeningCashiers() {
    const select = document.getElementById('openingCashier');
    const { data: profiles, error } = await accountingClient()
        .from('staff_profiles')
        .select('id, full_name, role')
        .eq('active', true)
        .in('role', ['hotel_manager', 'bar_manager'])
        .order('full_name');
    if (error) throw error;

    select.replaceChildren(new Option('Choisir un gérant', ''));
    profiles.forEach(profile => {
        select.add(new Option(
            `${profile.full_name} — ${ACCOUNTING_ROLE_LABELS[profile.role]}`,
            profile.id
        ));
    });
    await updateOpeningDepartmentOptions();
}

async function updateOpeningDepartmentOptions() {
    const form = document.getElementById('openingBalanceForm');
    const cashierId = form.elements.cashierId.value;
    const department = form.elements.department;
    const profile = cashierId
        ? [...document.getElementById('openingCashier').options]
            .find(option => option.value === cashierId)
        : null;
    const selectedProfile = profile ? profile.textContent : '';
    const allowedDepartments = selectedProfile.includes('Gérant bar')
        ? ['bar']
        : selectedProfile ? ['hotel', 'bar'] : [];

    [...department.options].forEach(option => {
        option.disabled = !allowedDepartments.includes(option.value);
    });
    if (!allowedDepartments.includes(department.value)) {
        department.value = allowedDepartments[0] || '';
    }

    const method = form.elements.paymentMethod.value;
    const amountInput = form.elements.amount;
    const currentBalance = cashierId && department.value
        ? await accountingClient()
            .from('accounting_opening_balances')
            .select('id')
            .eq('cashier_id', cashierId)
            .eq('department', department.value)
            .eq('payment_method', method)
            .maybeSingle()
        : { data: null, error: null };
    if (currentBalance.error) throw currentBalance.error;
    amountInput.disabled = Boolean(currentBalance.data);
    form.querySelector('button[type="submit"]').disabled = Boolean(currentBalance.data);
    form.dataset.openingExists = currentBalance.data ? 'true' : 'false';
    form.querySelector('.accounting-opening-status')?.remove();
    if (currentBalance.data) {
        const status = document.createElement('p');
        status.className = 'accounting-opening-status';
        status.textContent = 'Un fonds initial est déjà enregistré pour ce compte.';
        form.append(status);
    }
}

async function submitOpeningBalance(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (currentUser.role !== 'owner') return;
    if (form.dataset.openingExists === 'true') {
        await showAppAlert('Ce fonds initial existe déjà. Utilisez une écriture comptable tracée pour toute correction.');
        return;
    }

    const amount = Number(form.elements.amount.value);
    if (!Number.isSafeInteger(amount) || amount < 0) {
        await showAppAlert('Saisissez un montant entier positif ou nul.');
        return;
    }

    const { error } = await accountingClient().rpc('configure_accounting_opening_balance', {
        p_cashier_id: form.elements.cashierId.value,
        p_department: form.elements.department.value,
        p_payment_method: form.elements.paymentMethod.value,
        p_amount: amount,
        p_reason: form.elements.reason.value.trim()
    });
    if (error) {
        console.error('Échec de création du fonds initial :', error);
        await showAppAlert(error.message);
        return;
    }

    form.reset();
    await showAppAlert('Fonds initial enregistré.');
    await loadOpeningCashiers();
    await loadAccountingData();
}

async function submitAccountingEntry(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (currentUser.role === 'owner') return;

    const amount = Number(form.elements.amount.value);
    const type = form.elements.entryType.value;
    const file = form.elements.receipt.files[0];
    if (!Number.isSafeInteger(amount) || amount < 1) {
        await showAppAlert('Le montant doit être un nombre entier positif en FCFA.');
        return;
    }
    if (type === 'expense' && !file) {
        await showAppAlert('Joignez le justificatif de la dépense.');
        return;
    }
    if (file && (file.size > 10 * 1024 * 1024
        || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type))) {
        await showAppAlert('Le justificatif doit être une image JPG, PNG, WebP ou un PDF de 10 Mo maximum.');
        return;
    }

    let receiptPath = null;
    if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        receiptPath = `${currentUser.userId}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await accountingClient()
            .storage.from('accounting-receipts')
            .upload(receiptPath, file, { contentType: file.type, upsert: false });
        if (uploadError) {
            console.error('Échec du téléversement du justificatif :', uploadError);
            await showAppAlert(`Le justificatif n’a pas été enregistré : ${uploadError.message}`);
            return;
        }
    }

    const { error } = await accountingClient().rpc('record_accounting_entry', {
        p_department: form.elements.department.value,
        p_entry_type: type,
        p_payment_method: form.elements.paymentMethod.value,
        p_amount: amount,
        p_description: form.elements.description.value.trim(),
        p_reference: form.elements.reference.value.trim() || null,
        p_receipt_path: receiptPath,
        p_reverses_entry_id: null,
        p_payment_reference: form.elements.paymentReference.value.trim() || null
    });
    if (error) {
        if (receiptPath) {
            const { error: cleanupError } = await accountingClient()
                .storage.from('accounting-receipts')
                .remove([receiptPath]);
            if (cleanupError) console.error('Justificatif orphelin à nettoyer :', receiptPath, cleanupError);
        }
        console.error('Échec d’enregistrement de l’écriture :', error);
        await showAppAlert(error.message);
        return;
    }

    form.reset();
    updateAccountingEntryRequirements();
    await showAppAlert('Écriture ajoutée au registre.');
    await loadAccountingData();
    await loadCashPreview();
}

async function loadCashPreview() {
    if (currentUser.role === 'owner') return;
    const department = document.querySelector('#cashClosureForm select[name="department"]').value;
    const previewElement = document.getElementById('cashBalancePreview');
    previewElement.textContent = 'Calcul du solde en cours…';

    const { data, error } = await accountingClient().rpc('get_daily_close_preview', {
        p_department: department
    });
    if (error) {
        console.error('Échec du calcul du solde de caisse :', error);
        previewElement.textContent = error.message;
        return;
    }
    const preview = data[0];
    if (!preview) {
        previewElement.textContent = 'Aucun calcul de caisse disponible.';
        return;
    }
    previewElement.innerHTML = `
        <strong>Solde attendu — ${accountingEscape(preview.business_date)}</strong>
        <span>Espèces : ${accountingFormatAmount(preview.expected_cash)}</span>
        <span>Mobile money : ${accountingFormatAmount(preview.expected_mobile)}</span>
    `;
}

async function submitCashClosure(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (currentUser.role === 'owner') return;
    const countedCash = Number(form.elements.countedCash.value);
    const countedMobile = Number(form.elements.countedMobile.value);
    if (!Number.isSafeInteger(countedCash) || countedCash < 0
        || !Number.isSafeInteger(countedMobile) || countedMobile < 0) {
        await showAppAlert('Les montants comptés doivent être des nombres entiers positifs ou nuls.');
        return;
    }

    const { error } = await accountingClient().rpc('submit_daily_cash_closure', {
        p_department: form.elements.department.value,
        p_counted_cash: countedCash,
        p_counted_mobile: countedMobile,
        p_variance_reason: form.elements.varianceReason.value.trim() || null
    });
    if (error) {
        console.error('Échec de soumission de la clôture :', error);
        await showAppAlert(error.message);
        return;
    }
    form.reset();
    if (currentUser.role === 'bar_manager') form.elements.department.value = 'bar';
    await showAppAlert('Clôture soumise au propriétaire. La caisse est verrouillée en attendant sa décision.');
    await loadAccountingData();
    await loadCashPreview();
}

async function loadAccountingData() {
    const client = accountingClient();
    const [entriesResult, openingResult, closuresResult, summaryResult] = await Promise.all([
        client.from('accounting_entries')
            .select('*, cashier:staff_profiles!accounting_entries_cashier_id_fkey(full_name), creator:staff_profiles!accounting_entries_created_by_fkey(full_name)')
            .order('created_at', { ascending: false })
            .limit(100),
        client.from('accounting_opening_balances')
            .select('*, cashier:staff_profiles!accounting_opening_balances_cashier_id_fkey(full_name), creator:staff_profiles!accounting_opening_balances_created_by_fkey(full_name)')
            .order('created_at', { ascending: false })
            .limit(100),
        client.from('cash_closures')
            .select('*, staff_profiles(full_name), cash_closure_reviews(decision, reason, reviewed_at)')
            .order('business_date', { ascending: false })
            .order('attempt', { ascending: false })
            .limit(50),
        client.rpc('get_accounting_summary')
    ]);
    if (entriesResult.error) throw entriesResult.error;
    if (openingResult.error) throw openingResult.error;
    if (closuresResult.error) throw closuresResult.error;
    if (summaryResult.error) throw summaryResult.error;

    const openingEntries = openingResult.data.map(balance => ({
        ...balance,
        entry_type: 'opening_balance',
        balance_effect: 1,
        description: `Fonds initial — ${balance.reason}`,
        reference: 'Solde d’ouverture',
        reverses_entry_id: null,
        receipt_path: null,
        isOpeningBalance: true
    }));
    await renderAccountingLedger([...entriesResult.data, ...openingEntries]
        .sort((first, second) => new Date(second.created_at) - new Date(first.created_at))
        .slice(0, 100));
    renderAccountingClosures(closuresResult.data);
    applyAccountingSummary(summaryResult.data[0]);
}

async function renderAccountingLedger(entries) {
    const tbody = document.getElementById('accountingLedgerTable');
    accountingEntriesCache = entries;
    if (!entries.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="accounting-empty">Aucune écriture comptable.</td></tr>';
        return;
    }

    const rows = await Promise.all(entries.map(async entry => {
        const reversedEntryIds = new Set(accountingEntriesCache
            .filter(item => item.reverses_entry_id)
            .map(item => item.reverses_entry_id));
        let receiptLink = '—';
        if (entry.receipt_path) {
            const { data, error } = await accountingClient()
                .storage.from('accounting-receipts')
                .createSignedUrl(entry.receipt_path, 60);
            if (error) throw error;
            receiptLink = `<a href="${accountingEscape(data.signedUrl)}" target="_blank" rel="noopener noreferrer">Ouvrir</a>`;
        }
        const sign = entry.balance_effect < 0 ? '−' : '+';
        const canReverse = !entry.isOpeningBalance
            && !reversedEntryIds.has(entry.id)
            && (currentUser.role === 'owner' || currentUser.userId === entry.cashier_id);
        return `
            <tr>
                <td>${accountingEscape(accountingFormatDate(entry.created_at))}</td>
                <td>${accountingDepartmentLabel(entry.department)}</td>
                <td>${accountingEscape(ACCOUNTING_ENTRY_LABELS[entry.entry_type] || entry.entry_type)}</td>
                <td>
                    <strong>${accountingEscape(entry.description)}</strong>
                    ${entry.reference ? `<br><small>Origine : ${accountingEscape(entry.reference)}</small>` : ''}
                    ${entry.payment_reference ? `<br><small>Transaction : ${accountingEscape(entry.payment_reference)}</small>` : ''}
                </td>
                <td>${accountingMethodLabel(entry.payment_method)}</td>
                <td class="${entry.balance_effect < 0 ? 'accounting-amount--out' : 'accounting-amount--in'}">${sign}${accountingFormatAmount(entry.amount)}</td>
                <td>${accountingEscape(entry.cashier?.full_name || 'Compte archivé')}${entry.creator?.full_name && entry.creator.full_name !== entry.cashier?.full_name ? `<br><small>Saisi par ${accountingEscape(entry.creator.full_name)}</small>` : ''}</td>
                        <td>${receiptLink}</td>
                        <td>${canReverse ? `<button class="accounting-reverse-button" type="button" onclick="runAccountingAction(() => reverseAccountingEntry('${entry.id}'))">Contre-passer</button>` : '—'}</td>
            </tr>
        `;
    }));
    tbody.innerHTML = rows.join('');
}

function applyAccountingSummary(summary) {
    if (!summary) throw new Error('Le résumé comptable central est indisponible.');
    const values = currentUser.role === 'owner' ? {
        roomRevenue: BigInt(summary.room_revenue_total),
        barRevenue: BigInt(summary.bar_revenue_total),
        totalRevenue: BigInt(summary.room_revenue_total) + BigInt(summary.bar_revenue_total),
        monthRevenue: BigInt(summary.room_revenue_month) + BigInt(summary.bar_revenue_month)
    } : currentUser.role === 'hotel_manager' ? {
        roomTodayRevenue: summary.room_revenue_today
    } : {
        todayRevenue: summary.bar_revenue_today
    };

    Object.entries(values).forEach(([key, amount]) => {
        const value = document.querySelector(`.stat-card--${key} h3`);
        if (value) value.textContent = accountingFormatAmount(amount);
    });
}

async function reverseAccountingEntry(entryId) {
    const entry = accountingEntriesCache.find(item => item.id === entryId);
    if (!entry || (currentUser.role !== 'owner' && currentUser.userId !== entry.cashier_id)) {
        await showAppAlert('Cette écriture ne peut pas être contre-passée par votre compte.');
        return;
    }
    const reason = window.prompt('Motif de la contre-écriture (au moins 5 caractères) :');
    if (reason === null) return;
    if (reason.trim().length < 5) {
        await showAppAlert('Le motif doit contenir au moins 5 caractères.');
        return;
    }
    const confirmed = await showAppConfirm(
        `Contre-passer ${accountingFormatAmount(entry.amount)} ? Cette correction sera ajoutée au journal et ne pourra pas être supprimée.`,
        { title: 'Confirmer la contre-écriture', confirmLabel: 'Contre-passer', cancelLabel: 'Annuler' }
    );
    if (!confirmed) return;
    const { error } = await accountingClient().rpc('record_accounting_entry', {
        p_department: entry.department,
        p_entry_type: 'reversal',
        p_payment_method: entry.payment_method,
        p_amount: entry.amount,
        p_description: `Correction de ${entry.id.slice(0, 8)} : ${reason.trim()}`,
        p_reference: entry.reference,
        p_receipt_path: null,
        p_reverses_entry_id: entry.id,
        p_payment_reference: null
    });
    if (error) {
        console.error('Échec de contre-passation comptable :', error);
        await showAppAlert(error.message);
        return;
    }
    await loadAccountingData();
    await loadCashPreview();
}

function renderAccountingClosures(closures) {
    const history = document.getElementById('managerClosureHistory');
    const approvals = document.getElementById('closureApprovalList');
    const ownerHistory = document.getElementById('ownerClosureHistory');
    const isOwner = currentUser.role === 'owner';
    const relevantClosures = isOwner
        ? closures.filter(closure => accountingStatus(closure) === 'pending')
        : closures;

    history.innerHTML = isOwner ? '' : relevantClosures.map(closure => `
        <div class="accounting-closure-row">
            <strong>${accountingEscape(closure.business_date)} · ${accountingDepartmentLabel(closure.department)}</strong>
            <span>Statut : ${accountingStatusLabel(accountingStatus(closure))}</span>
            <span>Espèces comptées : ${accountingFormatAmount(closure.counted_cash)}</span>
            <span>Mobile constaté : ${accountingFormatAmount(closure.counted_mobile)}</span>
        </div>
    `).join('');

    if (!isOwner) return;
    ownerHistory.innerHTML = closures.length ? closures.map(closure => {
        const status = accountingStatus(closure);
        const review = (closure.cash_closure_reviews || [])
            .slice()
            .sort((a, b) => new Date(b.reviewed_at) - new Date(a.reviewed_at))[0];
        return `
            <article class="accounting-closure-row">
                <strong>${accountingEscape(closure.staff_profiles?.full_name || 'Gérant')} · ${accountingDepartmentLabel(closure.department)} · ${accountingEscape(closure.business_date)}</strong>
                <span>Clôture ${closure.attempt} — ${accountingStatusLabel(status)}</span>
                <span>Espèces attendues / comptées : ${accountingFormatAmount(closure.expected_cash)} / ${accountingFormatAmount(closure.counted_cash)}</span>
                <span>Mobile attendue / constatée : ${accountingFormatAmount(closure.expected_mobile)} / ${accountingFormatAmount(closure.counted_mobile)}</span>
                ${closure.variance_reason ? `<span>Écart déclaré : ${accountingEscape(closure.variance_reason)}</span>` : ''}
                ${review ? `<span>Décision du propriétaire (${accountingEscape(accountingFormatDate(review.reviewed_at))})${review.reason ? ` : ${accountingEscape(review.reason)}` : ''}</span>` : ''}
            </article>
        `;
    }).join('') : '<p class="accounting-empty">Aucune clôture enregistrée.</p>';
    if (!relevantClosures.length) {
        approvals.innerHTML = '<p class="accounting-empty">Aucune clôture en attente de vérification.</p>';
        return;
    }
    approvals.innerHTML = relevantClosures.map(closure => `
        <article class="accounting-approval-card">
            <div class="accounting-approval-card__heading">
                <strong>${accountingEscape(closure.staff_profiles?.full_name || 'Gérant')} · ${accountingDepartmentLabel(closure.department)}</strong>
                <span>${accountingEscape(closure.business_date)} — clôture ${closure.attempt}</span>
            </div>
            <dl>
                <div><dt>Espèces attendues / comptées</dt><dd>${accountingFormatAmount(closure.expected_cash)} / ${accountingFormatAmount(closure.counted_cash)}</dd></div>
                <div><dt>Mobile attendue / constatée</dt><dd>${accountingFormatAmount(closure.expected_mobile)} / ${accountingFormatAmount(closure.counted_mobile)}</dd></div>
                ${closure.variance_reason ? `<div><dt>Écart expliqué</dt><dd>${accountingEscape(closure.variance_reason)}</dd></div>` : ''}
            </dl>
            <div class="accounting-approval-actions">
                <button class="btn btn-primary" type="button" onclick="runAccountingAction(() => reviewAccountingClosure('${closure.id}', 'approved'))">Approuver</button>
                <button class="btn btn-secondary" type="button" onclick="runAccountingAction(() => reviewAccountingClosure('${closure.id}', 'rejected'))">Rejeter</button>
            </div>
        </article>
    `).join('');
}

function accountingStatusLabel(status) {
    return status === 'approved' ? 'Approuvée'
        : status === 'rejected' ? 'Rejetée'
            : 'En attente';
}

async function reviewAccountingClosure(closureId, decision) {
    if (currentUser.role !== 'owner') return;
    let reason = null;
    if (decision === 'approved') {
        const confirmed = await showAppConfirm('Vous approuvez cette clôture. Le solde compté servira de base à la prochaine journée.', {
            title: 'Approuver la clôture ?',
            confirmLabel: 'Approuver',
            cancelLabel: 'Vérifier encore'
        });
        if (!confirmed) return;
    }
    if (decision === 'rejected') {
        reason = window.prompt('Motif du rejet (au moins 5 caractères) :');
        if (reason === null) return;
        if (reason.trim().length < 5) {
            await showAppAlert('Le motif de rejet doit contenir au moins 5 caractères.');
            return;
        }
    }

    const { error } = await accountingClient().rpc('review_cash_closure', {
        p_closure_id: closureId,
        p_decision: decision,
        p_reason: reason
    });
    if (error) {
        console.error('Échec de décision sur la clôture :', error);
        await showAppAlert(error.message);
        return;
    }
    await loadAccountingData();
}

function runAccountingAction(action) {
    action().catch(showAccountingError);
}

async function initAccounting() {
    configureAccountingRole();
    try {
        await loadAccountingData();
    } catch (error) {
        console.error('Échec de chargement de la comptabilité :', error);
        await showAppAlert(`La comptabilité centrale n’est pas disponible : ${error.message}`);
    }
    if (currentUser.role === 'owner') {
        try {
            await loadOpeningCashiers();
        } catch (error) {
            console.error('Échec de chargement des gérants pour les fonds initiaux :', error);
            await showAppAlert(`Impossible de charger les comptes de caisse : ${error.message}`);
        }
    }
}
