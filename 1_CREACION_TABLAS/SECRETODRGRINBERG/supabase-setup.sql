-- Tablon de aula. Solo se guardan alias y progreso, nunca respuestas ni contrasenas.
begin;
create table if not exists public.grinberg_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null check (char_length(title) between 1 and 60),
  owner_token uuid not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.grinberg_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.grinberg_sessions(id) on delete cascade,
  player_token uuid not null,
  alias text not null check (char_length(alias) between 2 and 24),
  solved integer not null default 0 check (solved between 0 and 10),
  room integer not null default 1 check (room between 1 and 5),
  attempts integer not null default 0 check (attempts between 0 and 100000),
  hints integer not null default 0 check (hints between 0 and 30),
  joined_at timestamptz not null default now(),
  progress_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  unique(session_id,player_token)
);
create unique index if not exists grinberg_alias_per_session on public.grinberg_players(session_id,lower(alias));
alter table public.grinberg_sessions enable row level security;
alter table public.grinberg_players enable row level security;
revoke all on public.grinberg_sessions,public.grinberg_players from public,anon,authenticated;

create or replace function public.grinberg_create_session(p_owner uuid,p_title text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.grinberg_sessions;
begin
  if p_owner is null or p_title is null or char_length(trim(p_title)) not between 1 and 60 then
    raise exception 'Escribe un nombre de partida de entre 1 y 60 caracteres.';
  end if;
  select * into s from public.grinberg_sessions where owner_token=p_owner;
  if not found then
    insert into public.grinberg_sessions(code,title,owner_token)
    values(upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),trim(p_title),p_owner)
    returning * into s;
  end if;
  return jsonb_build_object('code',s.code,'title',s.title,'active',s.active);
end; $$;

create or replace function public.grinberg_join(p_code text,p_player uuid,p_alias text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.grinberg_sessions; p public.grinberg_players;
begin
  select * into s from public.grinberg_sessions where code=upper(trim(p_code));
  if not found then raise exception 'No existe esa partida. Comprueba el codigo del tablon.'; end if;
  if not s.active then raise exception 'Esta partida esta cerrada. Pide un codigo nuevo.'; end if;
  if p_player is null or p_alias is null or char_length(trim(p_alias)) not between 2 and 24
     or p_alias ~ '[[:cntrl:]]' then raise exception 'Escribe un alias de entre 2 y 24 caracteres.'; end if;
  select * into p from public.grinberg_players where session_id=s.id and player_token=p_player;
  if found then return jsonb_build_object('id',p.id,'alias',p.alias,'code',s.code); end if;
  if (select count(*) from public.grinberg_players where session_id=s.id)>=200 then
    raise exception 'Esta partida ya tiene 200 participantes.';
  end if;
  insert into public.grinberg_players(session_id,player_token,alias)
    values(s.id,p_player,trim(p_alias)) returning * into p;
  return jsonb_build_object('id',p.id,'alias',p.alias,'code',s.code);
exception when unique_violation then
  raise exception 'Ese alias ya esta en la partida. Usa otro o vuelve al navegador donde empezaste.';
end; $$;

create or replace function public.grinberg_progress(p_code text,p_player uuid,p_solved integer,p_room integer,p_attempts integer,p_hints integer,p_finished boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.grinberg_sessions; p public.grinberg_players; stamp timestamptz:=clock_timestamp();
begin
  select * into s from public.grinberg_sessions where code=upper(trim(p_code));
  if not found then raise exception 'No existe esa partida.'; end if;
  if not s.active then return jsonb_build_object('closed',true); end if;
  if p_solved is null or p_solved not between 0 and 10 or p_room is null or p_room not between 1 and 5
    or p_attempts is null or p_attempts not between 0 and 100000 or p_hints is null or p_hints not between 0 and 30
    or p_finished is null or (p_finished and p_solved<>10) then raise exception 'Progreso no valido.'; end if;
  select * into p from public.grinberg_players where session_id=s.id and player_token=p_player for update;
  if not found then raise exception 'Vuelve a entrar con tu alias y el codigo de partida.'; end if;
  update public.grinberg_players set
    solved=greatest(solved,p_solved), room=greatest(room,p_room),
    attempts=greatest(attempts,p_attempts), hints=greatest(hints,p_hints),
    progress_at=case when p_solved>solved then stamp else progress_at end,
    finished_at=case when p_finished and finished_at is null then stamp else finished_at end,
    updated_at=stamp where id=p.id;
  return jsonb_build_object('ok',true,'updated_at',stamp);
end; $$;

create or replace function public.grinberg_board(p_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.grinberg_sessions; players jsonb;
begin
  select * into s from public.grinberg_sessions where code=upper(trim(p_code));
  if not found then raise exception 'No existe esa partida. Revisa el codigo.'; end if;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.position),'[]'::jsonb) into players from (
    select row_number() over(order by (finished_at is not null) desc,solved desc,
      coalesce(finished_at,progress_at),joined_at,id) as position,
      id,alias,solved,room,attempts,hints,joined_at,updated_at,finished_at
    from public.grinberg_players where session_id=s.id
  ) r;
  return jsonb_build_object('code',s.code,'title',s.title,'active',s.active,'now',now(),'players',players);
end; $$;

create or replace function public.grinberg_close_session(p_code text,p_owner uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  update public.grinberg_sessions set active=false where code=upper(trim(p_code)) and owner_token=p_owner;
  if not found then raise exception 'Solo el navegador que creo esta partida puede cerrarla.'; end if;
  return jsonb_build_object('ok',true);
end; $$;

revoke all on function public.grinberg_create_session(uuid,text),public.grinberg_join(text,uuid,text),
  public.grinberg_progress(text,uuid,integer,integer,integer,integer,boolean),public.grinberg_board(text),
  public.grinberg_close_session(text,uuid) from public;
grant execute on function public.grinberg_create_session(uuid,text),public.grinberg_join(text,uuid,text),
  public.grinberg_progress(text,uuid,integer,integer,integer,integer,boolean),public.grinberg_board(text),
  public.grinberg_close_session(text,uuid) to anon,authenticated;
commit;
