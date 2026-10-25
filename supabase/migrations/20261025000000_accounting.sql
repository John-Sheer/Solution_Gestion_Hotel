create extension if not exists pgcrypto;

create table if not exists public.staff_profiles (
    id uuid primary key references auth.users(id) on delete restrict,
    full_name text not null check (length(trim(full_name)) between 2 and 120),
    role text not null check (role in ('owner', 'hotel_manager', 'bar_manager', 'super_admin')),
    active boolean not null default true,
    created_at timestamptz not null default now()
);

alter table public.staff_profiles enable row level security;
create unique index if not exists staff_profiles_single_owner_idx
    on public.staff_profiles (role) where role = 'owner';
create schema if not exists private;

create or replace function private.current_staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
    select role
    from public.staff_profiles
    where id = (select auth.uid()) and active
$$;

create or replace function private.is_accounting_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce((select private.current_staff_role()) = 'owner', false)
$$;

create or replace function private.can_access_department(p_department text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select case (select private.current_staff_role())
        when 'owner' then true
        when 'hotel_manager' then p_department in ('hotel', 'bar')
        when 'bar_manager' then p_department = 'bar'
        else false
    end
$$;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.current_staff_role() to authenticated;
grant execute on function private.is_accounting_owner() to authenticated;
grant execute on function private.can_access_department(text) to authenticated;
revoke all on public.staff_profiles from anon, authenticated;
grant select on public.staff_profiles to authenticated;

create policy "staff can read own profile; owner can read all"
    on public.staff_profiles for select to authenticated
    using (
        id = auth.uid()
        or (select private.is_accounting_owner())
        or (select private.current_staff_role()) = 'super_admin'
    );

create table if not exists public.accounting_opening_balances (
    id uuid primary key default gen_random_uuid(),
    cashier_id uuid not null references public.staff_profiles(id) on delete restrict,
    department text not null check (department in ('hotel', 'bar')),
    payment_method text not null check (payment_method in ('cash', 'mobile_money')),
    amount bigint not null check (amount >= 0),
    reason text not null check (length(trim(reason)) between 5 and 500),
    created_by uuid not null references public.staff_profiles(id) on delete restrict default auth.uid(),
    created_at timestamptz not null default now(),
    unique (cashier_id, department, payment_method)
);

create table if not exists public.accounting_entries (
    id uuid primary key default gen_random_uuid(),
    cashier_id uuid not null references public.staff_profiles(id) on delete restrict default auth.uid(),
    created_by uuid not null references public.staff_profiles(id) on delete restrict default auth.uid(),
    department text not null check (department in ('hotel', 'bar')),
    entry_type text not null check (entry_type in (
        'room_payment', 'bar_sale', 'expense', 'cash_deposit', 'cash_withdrawal', 'reversal'
    )),
    payment_method text not null check (payment_method in ('cash', 'mobile_money')),
    amount bigint not null check (amount > 0),
    balance_effect smallint not null check (balance_effect in (-1, 1)),
    description text not null check (length(trim(description)) between 3 and 500),
    reference text check (reference is null or length(reference) <= 120),
    payment_reference text check (payment_reference is null or length(payment_reference) <= 120),
    receipt_path text,
    reverses_entry_id uuid unique references public.accounting_entries(id) on delete restrict,
    business_date date not null default (timezone('Africa/Lome', now()))::date,
    created_at timestamptz not null default now(),
    check ((entry_type = 'reversal') = (reverses_entry_id is not null)),
    check (
        (entry_type = 'expense' and receipt_path is not null)
        or (entry_type <> 'expense' and receipt_path is null)
    ),
    check (payment_reference is null or payment_method = 'mobile_money')
);

create index if not exists accounting_entries_cashier_day_idx
    on public.accounting_entries (cashier_id, department, business_date, payment_method);
create index if not exists accounting_entries_created_idx
    on public.accounting_entries (created_at desc);
create unique index if not exists accounting_entries_unique_mobile_reference
    on public.accounting_entries (payment_reference)
    where payment_method = 'mobile_money' and payment_reference is not null;
create unique index if not exists accounting_entries_unique_receipt
    on public.accounting_entries (receipt_path)
    where receipt_path is not null;

create table if not exists public.cash_closures (
    id uuid primary key default gen_random_uuid(),
    cashier_id uuid not null references public.staff_profiles(id) on delete restrict default auth.uid(),
    department text not null check (department in ('hotel', 'bar')),
    business_date date not null,
    attempt integer not null check (attempt > 0),
    expected_cash bigint not null,
    counted_cash bigint not null check (counted_cash >= 0),
    expected_mobile bigint not null,
    counted_mobile bigint not null check (counted_mobile >= 0),
    variance_reason text,
    submitted_at timestamptz not null default now(),
    unique (cashier_id, department, business_date, attempt),
    check (
        (expected_cash = counted_cash and expected_mobile = counted_mobile)
        or (variance_reason is not null and length(trim(variance_reason)) >= 5)
    )
);

create index if not exists cash_closures_day_idx
    on public.cash_closures (business_date desc, department);

create table if not exists public.cash_closure_reviews (
    id uuid primary key default gen_random_uuid(),
    closure_id uuid not null references public.cash_closures(id) on delete restrict,
    reviewed_by uuid not null references public.staff_profiles(id) on delete restrict default auth.uid(),
    decision text not null check (decision in ('approved', 'rejected')),
    reason text,
    reviewed_at timestamptz not null default now(),
    check (decision <> 'rejected' or (reason is not null and length(trim(reason)) >= 5))
);

create index if not exists cash_closure_reviews_latest_idx
    on public.cash_closure_reviews (closure_id, reviewed_at desc);

alter table public.accounting_opening_balances enable row level security;
alter table public.accounting_entries enable row level security;
alter table public.cash_closures enable row level security;
alter table public.cash_closure_reviews enable row level security;

create policy "cashiers and owner can read opening balances"
    on public.accounting_opening_balances for select to authenticated
    using (cashier_id = auth.uid() or (select private.is_accounting_owner()));
create policy "cashiers and owner can read ledger entries"
    on public.accounting_entries for select to authenticated
    using (cashier_id = auth.uid() or created_by = auth.uid() or (select private.is_accounting_owner()));
create policy "cashiers and owner can read closures"
    on public.cash_closures for select to authenticated
    using (cashier_id = auth.uid() or (select private.is_accounting_owner()));
create policy "cashiers and owner can read closure reviews"
    on public.cash_closure_reviews for select to authenticated
    using (
        (select private.is_accounting_owner())
        or exists (
            select 1 from public.cash_closures c
            where c.id = closure_id and c.cashier_id = auth.uid()
        )
    );

revoke all on public.accounting_opening_balances from anon, authenticated;
revoke all on public.accounting_entries from anon, authenticated;
revoke all on public.cash_closures from anon, authenticated;
revoke all on public.cash_closure_reviews from anon, authenticated;
grant select on public.staff_profiles, public.accounting_opening_balances,
    public.accounting_entries, public.cash_closures, public.cash_closure_reviews to authenticated;
grant insert on public.staff_profiles to service_role;

create or replace function public.configure_accounting_opening_balance(
    p_cashier_id uuid,
    p_department text,
    p_payment_method text,
    p_amount bigint,
    p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_id uuid;
begin
    if not (select private.is_accounting_owner()) then
        raise exception 'Seul le propriétaire peut définir le fonds initial.';
    end if;
    if p_department not in ('hotel', 'bar')
        or p_payment_method not in ('cash', 'mobile_money')
        or p_amount < 0
        or length(trim(coalesce(p_reason, ''))) < 5 then
        raise exception 'Fonds initial invalide : vérifiez le service, le moyen, le montant et le motif.';
    end if;
    if not exists (
        select 1 from public.staff_profiles
        where id = p_cashier_id and active
          and (p_department = 'bar' or role in ('owner', 'hotel_manager'))
    ) then
        raise exception 'Compte de caisse introuvable ou incompatible avec ce service.';
    end if;

    insert into public.accounting_opening_balances
        (cashier_id, department, payment_method, amount, reason)
    values (p_cashier_id, p_department, p_payment_method, p_amount, trim(p_reason))
    returning id into v_id;
    return v_id;
exception
    when unique_violation then
        raise exception 'Le fonds initial de ce compte existe déjà. Corrigez-le par une écriture tracée.';
end;
$$;

create or replace function public.record_accounting_entry(
    p_department text,
    p_entry_type text,
    p_payment_method text,
    p_amount bigint,
    p_description text,
    p_reference text default null,
    p_receipt_path text default null,
    p_reverses_entry_id uuid default null,
    p_payment_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_id uuid;
    v_effect smallint;
    v_cashier_id uuid := auth.uid();
    v_original public.accounting_entries%rowtype;
    v_today date := (timezone('Africa/Lome', now()))::date;
begin
    if not (select private.can_access_department(p_department)) then
        raise exception 'Vous n’êtes pas autorisé à enregistrer une écriture dans ce service.';
    end if;
    if (select private.current_staff_role()) = 'owner' and p_entry_type <> 'reversal' then
        raise exception 'Le propriétaire ne peut créer que des contre-écritures tracées.';
    end if;
    if p_entry_type not in ('room_payment', 'bar_sale', 'expense', 'cash_deposit', 'cash_withdrawal', 'reversal')
        or p_payment_method not in ('cash', 'mobile_money')
        or p_amount <= 0
        or length(trim(coalesce(p_description, ''))) < 3
        or (p_reference is not null and length(p_reference) > 120)
        or (p_payment_reference is not null and length(p_payment_reference) > 120)
        or (p_payment_reference is not null and p_payment_method <> 'mobile_money') then
        raise exception 'Écriture invalide : vérifiez le montant, la catégorie et le libellé.';
    end if;
    if p_entry_type in ('room_payment', 'bar_sale')
        and length(trim(coalesce(p_reference, ''))) = 0 then
        raise exception 'Indiquez le numéro du séjour ou de la commande pour tracer cet encaissement.';
    end if;
    if p_entry_type = 'room_payment' and p_department <> 'hotel'
        or p_entry_type = 'bar_sale' and p_department <> 'bar' then
        raise exception 'La catégorie choisie ne correspond pas au service.';
    end if;
    if p_entry_type = 'expense' then
        if p_receipt_path is null
            or split_part(p_receipt_path, '/', 1) <> auth.uid()::text
            or not exists (
                select 1 from storage.objects
                where bucket_id = 'accounting-receipts' and name = p_receipt_path
            ) then
            raise exception 'Un justificatif téléversé est obligatoire pour chaque dépense.';
        end if;
    elsif p_receipt_path is not null then
        raise exception 'Un justificatif ne peut être joint qu’à une dépense.';
    end if;

    if p_entry_type = 'reversal' then
        select * into v_original
        from public.accounting_entries
        where id = p_reverses_entry_id
          and department = p_department
          and (cashier_id = auth.uid() or (select private.is_accounting_owner()));
        if not found then
            raise exception 'Écriture d’origine introuvable ou inaccessible.';
        end if;
        if p_amount <> v_original.amount or p_payment_method <> v_original.payment_method then
            raise exception 'Une contre-écriture doit reprendre exactement le montant et le moyen d’origine.';
        end if;
        v_effect := -v_original.balance_effect;
        v_cashier_id := v_original.cashier_id;
    else
        if p_reverses_entry_id is not null then
            raise exception 'Une référence d’annulation n’est admise que pour une contre-écriture.';
        end if;
        v_effect := case when p_entry_type in ('expense', 'cash_withdrawal') then -1 else 1 end;
    end if;

    perform pg_advisory_xact_lock(hashtextextended(
        v_cashier_id::text || ':' || p_department || ':' || v_today::text, 0
    ));

    if not exists (
        select 1 from public.accounting_opening_balances
        where cashier_id = v_cashier_id and department = p_department
          and payment_method = 'cash'
    ) or not exists (
        select 1 from public.accounting_opening_balances
        where cashier_id = v_cashier_id and department = p_department
          and payment_method = 'mobile_money'
    ) then
        raise exception 'Le propriétaire doit définir les deux fonds initiaux de cette caisse avant toute écriture.';
    end if;

    if exists (
        select 1
        from public.cash_closures c
        left join lateral (
            select r.decision
            from public.cash_closure_reviews r
            where r.closure_id = c.id
            order by r.reviewed_at desc
            limit 1
        ) review on true
        where c.cashier_id = v_cashier_id
          and c.department = p_department
          and c.business_date = v_today
          and coalesce(review.decision, 'pending') in ('pending', 'approved')
    ) then
        raise exception 'La caisse du jour est déjà soumise ou approuvée. Toute correction doit être enregistrée sur une journée ouverte.';
    end if;

    insert into public.accounting_entries
        (cashier_id, department, entry_type, payment_method, amount, balance_effect, description,
         reference, receipt_path, reverses_entry_id, business_date, payment_reference)
    values
        (v_cashier_id, p_department, p_entry_type, p_payment_method, p_amount, v_effect, trim(p_description),
         nullif(trim(p_reference), ''), p_receipt_path, p_reverses_entry_id, v_today,
         nullif(trim(p_payment_reference), ''))
    returning id into v_id;
    return v_id;
end;
$$;

create or replace function public.get_daily_close_preview(p_department text)
returns table (
    business_date date,
    opening_cash bigint,
    expected_cash bigint,
    opening_mobile bigint,
    expected_mobile bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_today date := (timezone('Africa/Lome', now()))::date;
    v_prev_date date;
    v_open_cash bigint;
    v_open_mobile bigint;
    v_cash_delta bigint;
    v_mobile_delta bigint;
begin
    if not (select private.can_access_department(p_department)) then
        raise exception 'Vous n’êtes pas autorisé à consulter cette caisse.';
    end if;
    if (select private.current_staff_role()) = 'owner' then
        raise exception 'Le propriétaire consulte et approuve les clôtures, il ne clôture pas une caisse.';
    end if;

    select c.business_date, c.counted_cash, c.counted_mobile
    into v_prev_date, v_open_cash, v_open_mobile
    from public.cash_closures c
    join lateral (
        select r.decision
        from public.cash_closure_reviews r
        where r.closure_id = c.id
        order by r.reviewed_at desc
        limit 1
    ) review on review.decision = 'approved'
    where c.cashier_id = auth.uid()
      and c.department = p_department
      and c.business_date < v_today
    order by c.business_date desc, c.attempt desc
    limit 1;

    if not found then
        select
            max(amount) filter (where payment_method = 'cash'),
            max(amount) filter (where payment_method = 'mobile_money')
        into v_open_cash, v_open_mobile
        from public.accounting_opening_balances
        where cashier_id = auth.uid() and department = p_department;
        if v_open_cash is null or v_open_mobile is null then
            raise exception 'Le propriétaire doit d’abord définir le fonds initial en espèces et mobile money pour cette caisse.';
        end if;
        select coalesce(min(business_date) - 1, v_today - 1)
        into v_prev_date
        from public.accounting_entries
        where cashier_id = auth.uid() and department = p_department;
    end if;

    select
        coalesce(sum(amount * balance_effect) filter (where payment_method = 'cash'), 0),
        coalesce(sum(amount * balance_effect) filter (where payment_method = 'mobile_money'), 0)
    into v_cash_delta, v_mobile_delta
    from public.accounting_entries
    where cashier_id = auth.uid()
      and department = p_department
      and business_date > v_prev_date
      and business_date <= v_today;

    return query select v_today, v_open_cash, v_open_cash + v_cash_delta,
        v_open_mobile, v_open_mobile + v_mobile_delta;
end;
$$;

create or replace function public.submit_daily_cash_closure(
    p_department text,
    p_counted_cash bigint,
    p_counted_mobile bigint,
    p_variance_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_preview record;
    v_attempt integer;
    v_id uuid;
    v_today date := (timezone('Africa/Lome', now()))::date;
begin
    if not (select private.can_access_department(p_department)) then
        raise exception 'Vous n’êtes pas autorisé à clôturer cette caisse.';
    end if;
    if (select private.current_staff_role()) = 'owner' then
        raise exception 'Le propriétaire ne peut pas clôturer la caisse d’un gérant.';
    end if;
    if p_counted_cash < 0 or p_counted_mobile < 0 then
        raise exception 'Les montants comptés ne peuvent pas être négatifs.';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(
        auth.uid()::text || ':' || p_department || ':' || v_today::text, 0
    ));

    select * into v_preview from public.get_daily_close_preview(p_department);
    if (p_counted_cash <> v_preview.expected_cash or p_counted_mobile <> v_preview.expected_mobile)
        and length(trim(coalesce(p_variance_reason, ''))) < 5 then
        raise exception 'Un motif détaillé est obligatoire en cas d’écart.';
    end if;

    if exists (
        select 1
        from public.cash_closures c
        left join lateral (
            select r.decision
            from public.cash_closure_reviews r
            where r.closure_id = c.id
            order by r.reviewed_at desc
            limit 1
        ) review on true
        where c.cashier_id = auth.uid()
          and c.department = p_department
          and c.business_date = v_today
          and coalesce(review.decision, 'pending') in ('pending', 'approved')
    ) then
        raise exception 'Une clôture de cette caisse est déjà en attente ou approuvée.';
    end if;

    select coalesce(max(attempt), 0) + 1 into v_attempt
    from public.cash_closures
    where cashier_id = auth.uid() and department = p_department and business_date = v_today;

    insert into public.cash_closures
        (department, business_date, attempt, expected_cash, counted_cash,
         expected_mobile, counted_mobile, variance_reason)
    values
        (p_department, v_today, v_attempt, v_preview.expected_cash, p_counted_cash,
         v_preview.expected_mobile, p_counted_mobile, nullif(trim(p_variance_reason), ''))
    returning id into v_id;
    return v_id;
end;
$$;

create or replace function public.review_cash_closure(
    p_closure_id uuid,
    p_decision text,
    p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_id uuid;
begin
    if not (select private.is_accounting_owner()) then
        raise exception 'Seul le propriétaire peut approuver ou rejeter une clôture.';
    end if;
    if p_decision not in ('approved', 'rejected')
        or (p_decision = 'rejected' and length(trim(coalesce(p_reason, ''))) < 5) then
        raise exception 'Décision invalide : un motif détaillé est obligatoire en cas de rejet.';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(p_closure_id::text, 0));
    if not exists (
        select 1
        from public.cash_closures c
        left join lateral (
            select r.decision
            from public.cash_closure_reviews r
            where r.closure_id = c.id
            order by r.reviewed_at desc
            limit 1
        ) review on true
        where c.id = p_closure_id
          and c.cashier_id <> auth.uid()
          and coalesce(review.decision, 'pending') = 'pending'
    ) then
        raise exception 'Clôture introuvable ou déjà examinée.';
    end if;

    insert into public.cash_closure_reviews (closure_id, decision, reason)
    values (p_closure_id, p_decision, nullif(trim(p_reason), ''))
    returning id into v_id;
    return v_id;
end;
$$;

create or replace function public.get_accounting_summary()
returns table (
    room_revenue_total bigint,
    bar_revenue_total bigint,
    room_revenue_month bigint,
    bar_revenue_month bigint,
    room_revenue_today bigint,
    bar_revenue_today bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_today date := (timezone('Africa/Lome', now()))::date;
    v_month date := date_trunc('month', (timezone('Africa/Lome', now())))::date;
begin
    if (select private.current_staff_role()) is null then
        raise exception 'Compte du personnel inactif ou non configuré.';
    end if;

    return query
    select
        coalesce(sum(events.amount * events.balance_effect) filter (
            where events.source_type = 'room_payment'
        ), 0)::bigint,
        coalesce(sum(events.amount * events.balance_effect) filter (
            where events.source_type = 'bar_sale'
        ), 0)::bigint,
        coalesce(sum(events.amount * events.balance_effect) filter (
            where events.source_type = 'room_payment' and events.business_date >= v_month
        ), 0)::bigint,
        coalesce(sum(events.amount * events.balance_effect) filter (
            where events.source_type = 'bar_sale' and events.business_date >= v_month
        ), 0)::bigint,
        coalesce(sum(events.amount * events.balance_effect) filter (
            where events.source_type = 'room_payment' and events.business_date = v_today
        ), 0)::bigint,
        coalesce(sum(events.amount * events.balance_effect) filter (
            where events.source_type = 'bar_sale' and events.business_date = v_today
        ), 0)::bigint
    from (
        with recursive revenue_events as (
            select id, cashier_id, entry_type as source_type, amount,
                balance_effect, business_date
            from public.accounting_entries
            where entry_type in ('room_payment', 'bar_sale')
            union all
            select correction.id, correction.cashier_id, source.source_type,
                correction.amount, correction.balance_effect, correction.business_date
            from public.accounting_entries correction
            join revenue_events source on source.id = correction.reverses_entry_id
            where correction.entry_type = 'reversal'
        )
        select * from revenue_events
    ) events
    where (events.cashier_id = auth.uid() or (select private.is_accounting_owner()));
end;
$$;

revoke all on function public.configure_accounting_opening_balance(uuid, text, text, bigint, text) from public, anon;
revoke all on function public.record_accounting_entry(text, text, text, bigint, text, text, text, uuid, text) from public, anon;
revoke all on function public.get_daily_close_preview(text) from public, anon;
revoke all on function public.submit_daily_cash_closure(text, bigint, bigint, text) from public, anon;
revoke all on function public.review_cash_closure(uuid, text, text) from public, anon;
revoke all on function public.get_accounting_summary() from public, anon;
grant execute on function public.configure_accounting_opening_balance(uuid, text, text, bigint, text) to authenticated;
grant execute on function public.record_accounting_entry(text, text, text, bigint, text, text, text, uuid, text) to authenticated;
grant execute on function public.get_daily_close_preview(text) to authenticated;
grant execute on function public.submit_daily_cash_closure(text, bigint, bigint, text) to authenticated;
grant execute on function public.review_cash_closure(uuid, text, text) to authenticated;
grant execute on function public.get_accounting_summary() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('accounting-receipts', 'accounting-receipts', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "staff upload own accounting receipts"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'accounting-receipts'
        and (storage.foldername(name))[1] = auth.uid()::text
        and (select private.current_staff_role()) in ('owner', 'hotel_manager', 'bar_manager')
    );
create policy "staff and owner read authorized accounting receipts"
    on storage.objects for select to authenticated
    using (
        bucket_id = 'accounting-receipts'
        and (
            (storage.foldername(name))[1] = auth.uid()::text
            or (select private.is_accounting_owner())
        )
    );
create policy "staff remove unlinked own accounting receipts"
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'accounting-receipts'
        and (storage.foldername(name))[1] = auth.uid()::text
        and not exists (
            select 1 from public.accounting_entries
            where receipt_path = name
        )
    );

comment on table public.accounting_entries is
    'Append-only accounting ledger. All writes go through validated security-definer RPCs.';
comment on table public.cash_closures is
    'Immutable daily cashier declarations; owner decisions are append-only in cash_closure_reviews.';
