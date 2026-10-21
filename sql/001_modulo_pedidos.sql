/* ============================================================
   MÓDULO PEDIDOS  (opt-in por negocio)  — para cafés y comidas
   ----------------------------------------------------------------
   Pegar en:  Supabase  >  SQL Editor  >  New query  >  Run
   ---------------------------------------------------------------
   Qué hace:
   - El cliente arma su pedido en el menú de la app.
   - El pedido entra en la cola del panel del negocio.
   - Cuando el negocio lo entrega, se suma el sello en el MISMO toque.
     (reusa la función biz_stamp, así que el sello respeta caducidad,
      minutos mínimos, cumpleaños y el historial)

   Es idempotente: se puede volver a pegar sin romper nada.
   ============================================================ */

/* --- Módulos por negocio: cada negocio enciende lo que necesita ---
   Un solo repo, un solo código: el núcleo de sellos es igual para todos
   y cada negocio prende solamente los módulos que le sirven. */
create table if not exists public.modulos (
  slug         text primary key,
  pedidos      boolean not null default false,
  turnos       boolean not null default false,
  por_servicio boolean not null default false
);

/* --- Pedidos --- */
create table if not exists public.pedidos (
  id        bigint generated always as identity primary key,
  slug      text not null,
  codigo    text not null,                 -- código de la tarjeta del cliente
  cliente   text,
  items     jsonb not null default '[]'::jsonb,
  total     numeric(12,2) not null default 0,
  nota      text,
  estado    text not null default 'pendiente',   -- pendiente | entregado | cancelado
  creado    timestamptz not null default now(),
  entregado timestamptz
);
create index if not exists pedidos_pendientes_idx on public.pedidos (slug, estado, creado desc);
create index if not exists pedidos_codigo_idx on public.pedidos (slug, codigo);

-- Las tablas nunca se tocan desde el navegador: todo pasa por las funciones de abajo.
alter table public.modulos enable row level security;
alter table public.pedidos enable row level security;

/* ¿Qué módulos tiene encendidos este negocio? */
create or replace function public.get_modulos(p_slug text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select to_jsonb(m) - 'slug' from public.modulos m where m.slug = lower(p_slug)),
    '{"pedidos":false,"turnos":false,"por_servicio":false}'::jsonb);
$$;

/* Encender o apagar un módulo desde "Ajustes" del panel.
   El PIN se valida reusando biz_stats (no se duplica la lógica del negocio). */
create or replace function public.modulo_activar(p_slug text, p_pin text, p_modulo text, p_activo boolean)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v jsonb;
begin
  v := public.biz_stats(p_slug, p_pin);
  if v ? 'error' then raise exception '%', v->>'error'; end if;
  if p_modulo not in ('pedidos', 'turnos', 'por_servicio') then raise exception 'Módulo desconocido'; end if;

  insert into public.modulos (slug, pedidos, turnos, por_servicio)
  values (lower(p_slug), p_modulo = 'pedidos', p_modulo = 'turnos', p_modulo = 'por_servicio')
  on conflict (slug) do update set
    pedidos      = case when p_modulo = 'pedidos'      then p_activo else modulos.pedidos end,
    turnos       = case when p_modulo = 'turnos'       then p_activo else modulos.turnos end,
    por_servicio = case when p_modulo = 'por_servicio' then p_activo else modulos.por_servicio end;

  -- Se lee directo de la tabla (y no con get_modulos) para no depender del
  -- snapshot de la sentencia anterior dentro de la misma transacción.
  return coalesce(
    (select to_jsonb(m) - 'slug' from public.modulos m where m.slug = lower(p_slug)),
    '{"pedidos":false,"turnos":false,"por_servicio":false}'::jsonb);
end $$;

/* El cliente manda su pedido.
   El código de la tarjeta es la prueba de que es cliente del local
   (es el mismo secreto que va en su QR). */
create or replace function public.pedido_crear(
  p_slug   text,
  p_codigo text,
  p_items  jsonb,
  p_total  numeric default 0,
  p_cliente text default null,
  p_nota   text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_mod jsonb; v_tar jsonb; v_id bigint; v_cod text; v_pend int;
begin
  v_mod := public.get_modulos(p_slug);
  if not coalesce((v_mod ->> 'pedidos')::boolean, false) then
    raise exception 'Este negocio no tiene pedidos activados';
  end if;

  -- El código puede venir en minúsculas (el celu lo guardó así): se normaliza.
  v_cod := upper(btrim(coalesce(p_codigo, '')));
  if v_cod !~ '^[A-Z0-9]{6,8}$' then raise exception 'Tarjeta inválida'; end if;

  v_tar := public.get_card(p_slug, v_cod);
  if v_tar is null then raise exception 'No encontramos tu tarjeta en este negocio'; end if;

  -- Tope de pedidos pendientes por tarjeta: evita que alguien inunde el mostrador.
  select count(*) into v_pend from public.pedidos
   where slug = lower(p_slug) and codigo = v_cod and estado = 'pendiente';
  if v_pend >= 3 then raise exception 'Ya tenés pedidos esperando. Esperá a que te los entreguemos.'; end if;

  insert into public.pedidos (slug, codigo, cliente, items, total, nota)
  values (lower(p_slug), v_cod,
          coalesce(nullif(btrim(p_cliente), ''), v_tar ->> 'name'),
          coalesce(p_items, '[]'::jsonb),
          greatest(0, least(coalesce(p_total, 0), 10000000)),
          nullif(btrim(coalesce(p_nota, '')), ''))
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'ok', true,
                            'nombre', coalesce(nullif(btrim(p_cliente), ''), v_tar ->> 'name'));
end $$;

/* Cola de pedidos del negocio. */
create or replace function public.pedidos_listar(p_slug text, p_pin text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_chk jsonb; v_rows jsonb;
begin
  v_chk := public.biz_stats(p_slug, p_pin);
  if v_chk ? 'error' then raise exception '%', v_chk ->> 'error'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'codigo', p.codigo, 'cliente', coalesce(p.cliente, 'Cliente'),
           'items', p.items, 'total', p.total, 'nota', p.nota,
           'creado', p.creado, 'estado', p.estado
         ) order by p.creado), '[]'::jsonb)
    into v_rows
    from public.pedidos p
   where p.slug = lower(p_slug) and p.estado = 'pendiente';

  return v_rows;
end $$;

/* El negocio entrega el pedido: se marca entregado Y se suma el sello en el mismo paso. */
create or replace function public.pedido_entregar(p_slug text, p_pin text, p_id bigint)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_chk jsonb; v_ped public.pedidos%rowtype; v_stamp jsonb;
begin
  v_chk := public.biz_stats(p_slug, p_pin);
  if v_chk ? 'error' then raise exception '%', v_chk ->> 'error'; end if;

  select * into v_ped from public.pedidos
   where id = p_id and slug = lower(p_slug) and estado = 'pendiente';
  if not found then raise exception 'Ese pedido no está pendiente'; end if;

  v_stamp := public.biz_stamp(p_slug, p_pin, v_ped.codigo);
  if v_stamp ? 'error' then
    raise exception '%', v_stamp ->> 'error';
  end if;

  update public.pedidos set estado = 'entregado', entregado = now() where id = p_id;
  return jsonb_build_object('ok', true, 'sello', v_stamp);
end $$;

/* El negocio descarta un pedido (el cliente se arrepiente o no vino). */
create or replace function public.pedido_cancelar(p_slug text, p_pin text, p_id bigint)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_chk jsonb;
begin
  v_chk := public.biz_stats(p_slug, p_pin);
  if v_chk ? 'error' then raise exception '%', v_chk ->> 'error'; end if;
  update public.pedidos set estado = 'cancelado' where id = p_id and slug = lower(p_slug) and estado = 'pendiente';
  return jsonb_build_object('ok', true);
end $$;

/* El cliente ve sus pedidos. */
create or replace function public.pedidos_mios(p_slug text, p_codigo text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_rows jsonb; v_cod text;
begin
  v_cod := upper(btrim(coalesce(p_codigo, '')));
  if v_cod !~ '^[A-Z0-9]{6,8}$' then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'items', p.items, 'total', p.total, 'nota', p.nota,
           'estado', p.estado, 'creado', p.creado
         ) order by p.creado desc), '[]'::jsonb)
    into v_rows
    from public.pedidos p
   where p.slug = lower(p_slug) and p.codigo = v_cod;
  return v_rows;
end $$;

/* Permisos: el navegador solo entra por estas funciones. */
grant execute on function public.get_modulos(text) to anon, authenticated;
grant execute on function public.modulo_activar(text, text, text, boolean) to anon, authenticated;
grant execute on function public.pedido_crear(text, text, jsonb, numeric, text, text) to anon, authenticated;
grant execute on function public.pedidos_listar(text, text) to anon, authenticated;
grant execute on function public.pedido_entregar(text, text, bigint) to anon, authenticated;
grant execute on function public.pedido_cancelar(text, text, bigint) to anon, authenticated;
grant execute on function public.pedidos_mios(text, text) to anon, authenticated;

/* --- Encender el módulo para un negocio (ej: el café "micafe") ---
   insert into public.modulos (slug, pedidos) values ('micafe', true)
   on conflict (slug) do update set pedidos = true;
   (o desde Ajustes del panel, una vez pegado este SQL) */

/* Si después de pegar esto las funciones todavía no aparecen en la API,
   corré esto por separado para recargar la cache de PostgREST:
   notify pgrst, 'reload schema'; */

