create extension if not exists btree_gist;

create table if not exists public.hotel_rooms (
    room_number text primary key,
    room_type text not null check (room_type in ('ventilated', 'air_conditioned', 'apartment')),
    nightly_rate bigint not null check (nightly_rate > 0),
    capacity integer not null check (capacity > 0),
    active boolean not null default true,
    maintenance boolean not null default false
);

insert into public.hotel_rooms (room_number, room_type, nightly_rate, capacity) values
    ('101', 'ventilated', 15000, 2),
    ('102', 'ventilated', 15000, 2),
    ('103', 'ventilated', 15000, 2),
    ('201', 'air_conditioned', 35000, 2),
    ('202', 'air_conditioned', 35000, 2),
    ('A01', 'apartment', 75000, 6)
on conflict (room_number) do nothing;

create table if not exists public.hotel_beverages (
    beverage_id integer primary key,
    name text not null,
    category text not null check (category in ('beer', 'soda', 'water')),
    unit_price bigint not null check (unit_price > 0),
    stock integer not null default 0 check (stock >= 0),
    active boolean not null default true
);

insert into public.hotel_beverages (beverage_id, name, category, unit_price, stock) values
    (1, 'PILS BB', 'beer', 800, 100),
    (2, 'Castel Beer', 'beer', 800, 100),
    (3, 'Awooyo', 'beer', 1000, 80),
    (4, 'Guinness Foreign Extra', 'beer', 1200, 60),
    (5, 'Beaufort Lager', 'beer', 800, 80),
    (7, 'Coca-Cola', 'soda', 500, 150),
    (8, 'Fanta Orange', 'soda', 500, 120),
    (9, 'Sprite', 'soda', 500, 100),
    (10, 'Malta Guinness', 'soda', 600, 80),
    (11, 'Youki Cocktail', 'soda', 400, 100),
    (12, 'Youki Orange', 'soda', 400, 100),
    (13, 'World Cola', 'soda', 400, 80),
    (14, 'Evian Petit', 'water', 500, 200),
    (15, 'Evian Grand', 'water', 1000, 150),
    (16, 'Djama Pilsner', 'beer', 800, 90),
    (17, 'Djama Lager', 'beer', 700, 100),
    (18, 'Djama 228', 'beer', 900, 80),
    (19, 'Djama Stout', 'beer', 1000, 70)
on conflict (beverage_id) do nothing;

create table if not exists public.hotel_reservations (
    id bigint generated always as identity primary key,
    room_number text not null references public.hotel_rooms(room_number),
    guest_name text not null check (length(trim(guest_name)) between 2 and 120),
    guest_phone text not null check (length(trim(guest_phone)) between 8 and 40),
    check_in date not null,
    check_out date not null,
    guests integer not null check (guests between 1 and 6),
    total_price bigint not null check (total_price > 0),
    status text not null default 'requested'
        check (status in ('requested', 'active', 'checked_in', 'completed', 'cancelled')),
    created_at timestamptz not null default now(),
    created_by uuid references auth.users(id) on delete set null,
    check (check_out > check_in),
    exclude using gist (
        room_number with =,
        daterange(check_in, check_out, '[)') with &&
    ) where (status in ('requested', 'active', 'checked_in'))
);
create index if not exists hotel_reservations_dates_idx
    on public.hotel_reservations (check_in, check_out, status);

create table if not exists public.hotel_orders (
    id bigint generated always as identity primary key,
    room_number text not null references public.hotel_rooms(room_number),
    items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
    total_price bigint not null check (total_price > 0),
    status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
    created_at timestamptz not null default now(),
    created_by uuid references auth.users(id) on delete set null
);
create index if not exists hotel_orders_created_idx on public.hotel_orders (created_at desc);

alter table public.hotel_rooms enable row level security;
alter table public.hotel_beverages enable row level security;
alter table public.hotel_reservations enable row level security;
alter table public.hotel_orders enable row level security;

revoke all on public.hotel_rooms, public.hotel_beverages from anon, authenticated;
revoke all on public.hotel_reservations, public.hotel_orders from anon, authenticated;
grant select on public.hotel_reservations, public.hotel_orders to authenticated;

create policy "hotel staff can read reservations"
    on public.hotel_reservations for select to authenticated
    using ((select private.current_staff_role()) in ('owner', 'hotel_manager'));
create policy "hotel staff can read orders"
    on public.hotel_orders for select to authenticated
    using ((select private.current_staff_role()) in ('hotel_manager', 'bar_manager'));

create or replace function public.get_public_room_availability(p_check_in date, p_check_out date)
returns table (room_number text, room_type text, nightly_rate bigint, capacity integer, available boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
    if p_check_in is null or p_check_out is null
       or p_check_in < (timezone('Africa/Lome', now()))::date
       or p_check_out <= p_check_in then
        raise exception 'Sélectionnez des dates de séjour valides.';
    end if;

    return query
    select r.room_number, r.room_type, r.nightly_rate, r.capacity,
        not r.maintenance and not exists (
            select 1 from public.hotel_reservations b
            where b.room_number = r.room_number
              and b.status in ('requested', 'active', 'checked_in')
              and daterange(b.check_in, b.check_out, '[)') && daterange(p_check_in, p_check_out, '[)')
        ) as available
    from public.hotel_rooms r
    where r.active
    order by r.room_number;
end;
$$;

create or replace function public.get_staff_room_statuses()
returns table (room_number text, maintenance boolean, occupied boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not coalesce(
        (select private.current_staff_role() in ('owner', 'hotel_manager')),
        false
    ) then
        raise exception 'Accès non autorisé.';
    end if;

    return query
    select r.room_number, r.maintenance,
        exists (
            select 1 from public.hotel_reservations stay
            where stay.room_number = r.room_number
              and stay.status = 'checked_in'
              and stay.check_in <= (timezone('Africa/Lome', now()))::date
              and stay.check_out > (timezone('Africa/Lome', now()))::date
        )
    from public.hotel_rooms r
    where r.active
    order by r.room_number;
end;
$$;

create or replace function public.set_hotel_room_maintenance(p_room_number text, p_maintenance boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    room public.hotel_rooms%rowtype;
begin
    if (select private.current_staff_role()) is distinct from 'hotel_manager' then
        raise exception 'Seul le gérant hôtel peut modifier la disponibilité des chambres.';
    end if;
    if p_maintenance is null then
        raise exception 'Sélectionnez un état de chambre valide.';
    end if;
    select * into room from public.hotel_rooms
    where room_number = p_room_number and active
    for update;
    if not found then raise exception 'Chambre introuvable.'; end if;
    if p_maintenance and exists (
        select 1 from public.hotel_reservations stay
        where stay.room_number = p_room_number
          and stay.status in ('requested', 'active', 'checked_in')
          and stay.check_out > (timezone('Africa/Lome', now()))::date
    ) then
        raise exception 'Cette chambre a des réservations en cours ou à venir et ne peut pas être mise en maintenance.';
    end if;
    update public.hotel_rooms set maintenance = p_maintenance
    where room_number = p_room_number and active;
    if not found then raise exception 'Chambre introuvable.'; end if;
end;
$$;

create or replace function public.create_public_reservation(
    p_room_number text, p_guest_name text, p_guest_phone text,
    p_check_in date, p_check_out date, p_guests integer
)
returns table (reservation_id bigint, total_price bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
    room public.hotel_rooms%rowtype;
    nights integer;
    reservation_total bigint;
begin
    if length(trim(coalesce(p_guest_name, ''))) not between 2 and 120
       or length(trim(coalesce(p_guest_phone, ''))) not between 8 and 40 then
        raise exception 'Vérifiez le nom et le numéro de téléphone.';
    end if;
    if p_check_in is null or p_check_out is null
       or p_check_in < (timezone('Africa/Lome', now()))::date
       or p_check_out <= p_check_in then
        raise exception 'Sélectionnez des dates de séjour valides.';
    end if;

    select * into room from public.hotel_rooms r
    where r.room_number = p_room_number and r.active and not r.maintenance
    for update;
    if not found then raise exception 'Cette chambre est indisponible.'; end if;
    if p_guests < 1 or p_guests > room.capacity then
        raise exception 'Le nombre de personnes dépasse la capacité de cette chambre.';
    end if;
    nights := p_check_out - p_check_in;
    reservation_total := room.nightly_rate * nights;

    insert into public.hotel_reservations (
        room_number, guest_name, guest_phone, check_in, check_out, guests, total_price, created_by
    ) values (
        room.room_number, trim(p_guest_name), trim(p_guest_phone), p_check_in, p_check_out,
        p_guests, reservation_total, auth.uid()
    ) returning id into reservation_id;
    total_price := reservation_total;
    return next;
exception when exclusion_violation then
    raise exception 'Cette chambre vient d’être demandée pour ces dates. Choisissez une autre période ou une autre chambre.';
end;
$$;

create or replace function public.manage_hotel_reservation(p_reservation_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    today date := (timezone('Africa/Lome', now()))::date;
begin
    if (select private.current_staff_role()) is distinct from 'hotel_manager' then
        raise exception 'Seul le gérant hôtel peut gérer les réservations.';
    end if;
    if p_status is null or p_status not in ('active', 'checked_in', 'completed', 'cancelled') then
        raise exception 'Statut de réservation invalide.';
    end if;
    update public.hotel_reservations set status = p_status
    where id = p_reservation_id and status in ('requested', 'active', 'checked_in')
      and (p_status = 'cancelled' or p_status = 'active' and status = 'requested'
           or p_status = 'checked_in' and status = 'active'
           or p_status = 'completed' and status = 'checked_in')
      and (p_status <> 'active' or check_out > today)
      and (p_status <> 'checked_in' or check_in <= today and check_out > today);
    if not found then raise exception 'Réservation introuvable ou changement de statut invalide.'; end if;
end;
$$;

create or replace function public.create_staff_walk_in_reservation(
    p_room_number text, p_guest_name text, p_guest_phone text, p_check_out date, p_guests integer
)
returns table (reservation_id bigint, total_price bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
    room public.hotel_rooms%rowtype;
    today date := (timezone('Africa/Lome', now()))::date;
begin
    if (select private.current_staff_role()) is distinct from 'hotel_manager' then
        raise exception 'Seul le gérant hôtel peut enregistrer une arrivée immédiate.';
    end if;
    if length(trim(coalesce(p_guest_name, ''))) not between 2 and 120
       or length(trim(coalesce(p_guest_phone, ''))) not between 8 and 40
       or p_check_out is null or p_check_out <= today then
        raise exception 'Vérifiez le nom, le téléphone et la date de départ.';
    end if;
    select * into room from public.hotel_rooms r
    where r.room_number = p_room_number and r.active and not r.maintenance
    for update;
    if not found or p_guests is null or p_guests < 1 or p_guests > room.capacity then
        raise exception 'Chambre indisponible ou capacité dépassée.';
    end if;
    insert into public.hotel_reservations (
        room_number, guest_name, guest_phone, check_in, check_out, guests, total_price, status, created_by
    ) values (
        room.room_number, trim(p_guest_name), trim(p_guest_phone), today, p_check_out, p_guests,
        room.nightly_rate * (p_check_out - today), 'checked_in', auth.uid()
    ) returning id, hotel_reservations.total_price into reservation_id, total_price;
    return next;
exception when exclusion_violation then
    raise exception 'Cette chambre n’est pas libre pour la période demandée.';
end;
$$;

create or replace function public.get_public_beverage_menu()
returns table (beverage_id integer, name text, category text, unit_price bigint, stock integer)
language sql
security definer
set search_path = ''
as $$
    select b.beverage_id, b.name, b.category, b.unit_price, b.stock
    from public.hotel_beverages b where b.active order by b.category, b.name
$$;

create or replace function public.create_public_hotel_order(p_room_number text, p_guest_phone text, p_items jsonb)
returns table (order_id bigint, total_price bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
    item jsonb;
    product public.hotel_beverages%rowtype;
    item_id integer;
    quantity integer;
    calculated_total bigint := 0;
    order_items jsonb := '[]'::jsonb;
begin
    if length(trim(coalesce(p_guest_phone, ''))) not between 8 and 40 or not exists (
        select 1 from public.hotel_reservations stay
        where stay.room_number = p_room_number and stay.status = 'checked_in'
          and stay.guest_phone = trim(p_guest_phone)
          and stay.check_in <= (timezone('Africa/Lome', now()))::date
          and stay.check_out > (timezone('Africa/Lome', now()))::date
    ) then
        raise exception 'Vérifiez le numéro de chambre et le téléphone associé au séjour en cours.';
    end if;
    if p_items is null or jsonb_typeof(p_items) <> 'array' then
        raise exception 'Le panier est vide ou invalide.';
    end if;
    if jsonb_array_length(p_items) not between 1 and 30 then
        raise exception 'Le panier est vide ou invalide.';
    end if;
    for item in
        select value
        from jsonb_array_elements(p_items)
        order by (value->>'beverage_id')::integer
    loop
        item_id := (item->>'beverage_id')::integer;
        quantity := (item->>'quantity')::integer;
        if item_id is null or quantity is null or quantity not between 1 and 50 then
            raise exception 'Quantité de produit invalide.';
        end if;
        select * into product from public.hotel_beverages b
        where b.beverage_id = item_id and b.active for update;
        if not found or product.stock < quantity then
            raise exception 'Stock insuffisant pour le produit %.', item_id;
        end if;
        update public.hotel_beverages set stock = stock - quantity where beverage_id = item_id;
        calculated_total := calculated_total + product.unit_price * quantity;
        order_items := order_items || jsonb_build_array(jsonb_build_object(
            'beverageId', product.beverage_id, 'name', product.name,
            'quantity', quantity, 'price', product.unit_price
        ));
    end loop;
    insert into public.hotel_orders (room_number, items, total_price, created_by)
    values (p_room_number, order_items, calculated_total, auth.uid())
    returning id into order_id;
    total_price := calculated_total;
    return next;
end;
$$;

create or replace function public.manage_hotel_order(p_order_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not coalesce(
        (select private.current_staff_role() in ('hotel_manager', 'bar_manager')),
        false
    ) then
        raise exception 'Accès non autorisé.';
    end if;
    if p_status is null or p_status not in ('completed', 'cancelled') then
        raise exception 'Statut de commande invalide.';
    end if;
    if p_status = 'cancelled' then
        with cancelled_order as (
            update public.hotel_orders set status = p_status
            where id = p_order_id and status = 'pending'
            returning items
        )
        update public.hotel_beverages b
        set stock = b.stock + cancelled_items.quantity
        from (
            select (item.value->>'beverageId')::integer as beverage_id,
                sum((item.value->>'quantity')::integer)::integer as quantity
            from cancelled_order c, jsonb_array_elements(c.items) item
            group by (item.value->>'beverageId')::integer
        ) as cancelled_items
        where b.beverage_id = cancelled_items.beverage_id;
    else
        update public.hotel_orders set status = p_status
        where id = p_order_id and status = 'pending';
    end if;
    if not found then raise exception 'Commande introuvable ou déjà traitée.'; end if;
end;
$$;

create or replace function public.restock_hotel_beverage(p_beverage_id integer, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not coalesce(
        (select private.current_staff_role() in ('hotel_manager', 'bar_manager')),
        false
    )
       or p_quantity is null or p_quantity not between 1 and 1000 then
        raise exception 'Réapprovisionnement non autorisé ou quantité invalide.';
    end if;
    update public.hotel_beverages set stock = stock + p_quantity
    where beverage_id = p_beverage_id and active;
    if not found then raise exception 'Produit introuvable.'; end if;
end;
$$;

revoke all on function public.get_public_room_availability(date, date) from public;
revoke all on function public.get_staff_room_statuses() from public;
revoke all on function public.set_hotel_room_maintenance(text, boolean) from public;
revoke all on function public.create_public_reservation(text, text, text, date, date, integer) from public;
revoke all on function public.manage_hotel_reservation(bigint, text) from public;
revoke all on function public.create_staff_walk_in_reservation(text, text, text, date, integer) from public;
revoke all on function public.get_public_beverage_menu() from public;
revoke all on function public.create_public_hotel_order(text, text, jsonb) from public;
revoke all on function public.manage_hotel_order(bigint, text) from public;
revoke all on function public.restock_hotel_beverage(integer, integer) from public;
grant execute on function public.get_public_room_availability(date, date) to anon, authenticated;
grant execute on function public.get_staff_room_statuses() to authenticated;
grant execute on function public.set_hotel_room_maintenance(text, boolean) to authenticated;
grant execute on function public.create_public_reservation(text, text, text, date, date, integer) to anon, authenticated;
grant execute on function public.manage_hotel_reservation(bigint, text) to authenticated;
grant execute on function public.create_staff_walk_in_reservation(text, text, text, date, integer) to authenticated;
grant execute on function public.get_public_beverage_menu() to anon, authenticated;
grant execute on function public.create_public_hotel_order(text, text, jsonb) to anon, authenticated;
grant execute on function public.manage_hotel_order(bigint, text) to authenticated;
grant execute on function public.restock_hotel_beverage(integer, integer) to authenticated;

grant usage, select on sequence public.hotel_reservations_id_seq, public.hotel_orders_id_seq to service_role;
