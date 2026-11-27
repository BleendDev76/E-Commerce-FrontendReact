-- Eliminar la propia cuenta desde el front.
-- Ejecutar una vez en Supabase -> SQL Editor.
--
-- Por qué una funcion y no un DELETE desde el navegador:
--   * auth.users no es accesible con la clave publicable, y la service_role key
--     nunca puede vivir en el front.
--   * `security definer` borra con los permisos de postgres, pero solo la fila
--     del que llama: el id sale de auth.uid(), no de un parametro.
--
-- Que borra:
--   * auth.users: la cuenta y sus sesiones, identidades y tokens (cascade interno).
--   * public.usuarios: el perfil, por la FK usuarios_id_fkey ON DELETE CASCADE.
--   * public.boletas NO se toca. Si el usuario tiene boletas, la funcion rechaza
--     el borrado en vez de destruir registros comerciales o dejar filas huerfanas.

create or replace function public.eliminar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'No hay una sesion activa.'
      using errcode = '28000';
  end if;

  if exists (select 1 from public.boletas where usuario_id = uid) then
    raise exception 'La cuenta tiene boletas emitidas.'
      using errcode = '23503';
  end if;

  delete from auth.users where id = uid;
end;
$$;

-- Solo con sesion iniciada; nunca un visitante anonimo.
revoke all on function public.eliminar_mi_cuenta() from public;
revoke all on function public.eliminar_mi_cuenta() from anon;
grant execute on function public.eliminar_mi_cuenta() to authenticated;
