-- BORRAR DATOS DE CLIENTES. Pegar en Supabase > SQL Editor > Run.
-- Solo agrega 2 funciones nuevas. No modifica ni borra nada existente.
-- Se puede correr más de una vez sin problema.

-- El cliente borra su propia tarjeta (necesita su código, que solo tiene en su celular)
create or replace function delete_my_card(p_slug text, p_code text) returns json
language plpgsql security definer set search_path=public,extensions as $$
declare cid uuid;
begin
  select c.id into cid from customers c join businesses b on b.id=c.business_id
  where b.slug=p_slug and c.code=upper(trim(p_code));
  if cid is null then raise exception 'Tarjeta no encontrada'; end if;
  delete from stamp_log where customer_id=cid;
  delete from customers where id=cid;
  return json_build_object('ok',true);
end $$;

-- El negocio borra un cliente desde el panel (pide el PIN, con el mismo bloqueo por intentos)
create or replace function biz_delete_customer(p_slug text, p_pin text, p_code text) returns json
language plpgsql security definer set search_path=public,extensions as $$
declare b businesses; cid uuid;
begin
  b := _auth(p_slug,p_pin);
  if b.id is null then return _autherr(p_slug); end if;
  select id into cid from customers where business_id=b.id and code=upper(trim(p_code));
  if cid is null then raise exception 'Código no encontrado'; end if;
  delete from stamp_log where customer_id=cid;
  delete from customers where id=cid;
  return json_build_object('ok',true);
end $$;

revoke execute on function delete_my_card(text,text), biz_delete_customer(text,text,text) from public;
grant execute on function delete_my_card(text,text), biz_delete_customer(text,text,text) to anon;
