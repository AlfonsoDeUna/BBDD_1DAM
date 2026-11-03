-- PULSOFIT / Evaluacion formativa
-- Proyecto: icemxcczzopnpsgsuhnq.supabase.co
-- Ejecutar una sola vez en SQL Editor, antes de usar alumnos.html o profesor.html.
-- IMPORTANTE: activar Auth > Providers > Anonymous sign-ins, y configurar
-- una clave publishable en config.js. Nunca utilizar una service_role en web.
-- Este esquema es reutilizable para mas actividades.
-- Los alumnos solo ven en la API enunciados/opciones, nunca la clave correcta.

create schema if not exists pf_private;
revoke all on schema pf_private from public;
grant usage on schema pf_private to authenticated;

create table if not exists public.pf_activities (
  id text primary key,
  title text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.pf_blocks (
  id text primary key,
  activity_id text not null references public.pf_activities(id) on delete cascade,
  title text not null,
  sort_order smallint not null,
  is_open boolean not null default false,
  reveal_answers boolean not null default false,
  unique(activity_id,sort_order)
);
create table if not exists public.pf_questions (
  id text primary key,
  block_id text not null references public.pf_blocks(id) on delete cascade,
  exercise_number smallint not null,
  sort_order smallint not null,
  prompt text not null,
  options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options)=4),
  unique(block_id,sort_order)
);
create table if not exists public.pf_students (
  activity_id text not null references public.pf_activities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check(char_length(btrim(display_name)) between 2 and 60),
  group_name text not null check(char_length(btrim(group_name)) between 1 and 30),
  joined_at timestamptz not null default now(),
  primary key(activity_id,user_id)
);
create table if not exists public.pf_responses (
  question_id text not null references public.pf_questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  choice char(1) not null check(choice in ('A','B','C','D')),
  submitted_at timestamptz not null default now(),
  primary key(question_id,user_id)
);
create table if not exists public.pf_scores (
  question_id text not null,
  user_id uuid not null,
  is_correct boolean not null,
  primary key(question_id,user_id),
  foreign key(question_id,user_id) references public.pf_responses(question_id,user_id) on delete cascade
);
create table if not exists pf_private.answer_keys (
  question_id text primary key references public.pf_questions(id) on delete cascade,
  correct_choice char(1) not null check(correct_choice in ('A','B','C','D')),
  explanation text not null
);
create table if not exists pf_private.teachers (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create index if not exists pf_q_block on public.pf_questions(block_id);
create index if not exists pf_responses_user on public.pf_responses(user_id);
create index if not exists pf_students_group on public.pf_students(activity_id,group_name);

-- Revocar todos los permisos por defecto (crear politicas RLS no los revoca).
revoke all on public.pf_activities,public.pf_blocks,public.pf_questions,
  public.pf_students,public.pf_responses,public.pf_scores from anon,authenticated;
revoke all on pf_private.answer_keys,pf_private.teachers from anon,authenticated;
grant select on public.pf_activities,public.pf_blocks,public.pf_questions to authenticated;
grant update on public.pf_blocks to authenticated;
grant select,insert,update on public.pf_students to authenticated;
grant select on public.pf_responses,public.pf_scores to authenticated;

alter table public.pf_activities enable row level security;
alter table public.pf_blocks enable row level security;
alter table public.pf_questions enable row level security;
alter table public.pf_students enable row level security;
alter table public.pf_responses enable row level security;
alter table public.pf_scores enable row level security;

-- Funcion interna: pertenece a un esquema NO expuesto en Data API.
create or replace function pf_private.is_teacher()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from pf_private.teachers
    where user_id=auth.uid()
  );
$$;
revoke all on function pf_private.is_teacher() from public;
grant execute on function pf_private.is_teacher() to authenticated;

-- Politicas de lectura y escritura, separadas por rol y propiedad.
drop policy if exists pf_activities_read on public.pf_activities;
create policy pf_activities_read on public.pf_activities for select to authenticated using(true);
drop policy if exists pf_blocks_read on public.pf_blocks;
create policy pf_blocks_read on public.pf_blocks for select to authenticated using(true);
drop policy if exists pf_blocks_teacher_update on public.pf_blocks;
create policy pf_blocks_teacher_update on public.pf_blocks for update to authenticated
 using ((select pf_private.is_teacher())) with check ((select pf_private.is_teacher()));
drop policy if exists pf_questions_read on public.pf_questions;
create policy pf_questions_read on public.pf_questions for select to authenticated using(true);
drop policy if exists pf_students_read on public.pf_students;
create policy pf_students_read on public.pf_students for select to authenticated
 using (user_id=(select auth.uid()) or (select pf_private.is_teacher()));
drop policy if exists pf_students_insert on public.pf_students;
create policy pf_students_insert on public.pf_students for insert to authenticated
 with check(user_id=(select auth.uid()));
drop policy if exists pf_students_update on public.pf_students;
create policy pf_students_update on public.pf_students for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists pf_responses_read on public.pf_responses;
create policy pf_responses_read on public.pf_responses for select to authenticated
 using(user_id=(select auth.uid()) or (select pf_private.is_teacher()));
drop policy if exists pf_scores_teacher_read on public.pf_scores;
create policy pf_scores_teacher_read on public.pf_scores for select to authenticated
 using((select pf_private.is_teacher()));

-- RPC internamente privilegiada: valida una sola entrega por pregunta.
create or replace function pf_private.submit_impl(p_question_id text,p_choice text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_activity text;
  v_open boolean;
  v_correct char(1);
  v_count integer;
begin
  if v_user is null then raise exception 'Debes iniciar una sesion'; end if;
  if p_choice not in ('A','B','C','D') then raise exception 'Opcion incorrecta'; end if;
  select b.activity_id,b.is_open into v_activity,v_open
    from public.pf_questions q join public.pf_blocks b on b.id=q.block_id
    join public.pf_activities a on a.id=b.activity_id
    where q.id=p_question_id and a.enabled=true;
  if v_activity is null then raise exception 'Pregunta inexistente'; end if;
  if not v_open then raise exception 'Este control aun no esta abierto'; end if;
  if not exists (select 1 from public.pf_students s
                 where s.user_id=v_user and s.activity_id=v_activity)
    then raise exception 'Debes identificarte en esta actividad';
  end if;
  insert into public.pf_responses(question_id,user_id,choice)
    values(p_question_id,v_user,p_choice)
    on conflict(question_id,user_id) do nothing;
  get diagnostics v_count=row_count;
  if v_count=0 then return jsonb_build_object('saved',false,'already_sent',true); end if;
  select correct_choice into strict v_correct from pf_private.answer_keys where question_id=p_question_id;
  insert into public.pf_scores(question_id,user_id,is_correct)
    values(p_question_id,v_user,p_choice=v_correct);
  return jsonb_build_object('saved',true,'already_sent',false);
end;
$$;
revoke all on function pf_private.submit_impl(text,text) from public;
grant execute on function pf_private.submit_impl(text,text) to authenticated;

-- Wrapper invoker: unico RPC publico; la logica privilegiada esta en pf_private.
create or replace function public.pf_submit_answer(p_question_id text,p_choice text)
returns jsonb language sql security invoker set search_path = ''
as $$ select pf_private.submit_impl(p_question_id,p_choice); $$;
revoke all on function public.pf_submit_answer(text,text) from public;
grant execute on function public.pf_submit_answer(text,text) to authenticated;

create or replace function public.pf_am_teacher()
returns boolean language sql stable security invoker set search_path = ''
as $$ select pf_private.is_teacher(); $$;
revoke all on function public.pf_am_teacher() from public;
grant execute on function public.pf_am_teacher() to authenticated;

-- El profesor puede consultar las soluciones, los alumnos no.
create or replace function pf_private.teacher_keys_impl(p_activity text)
returns table(question_id text,correct_choice text,explanation text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not pf_private.is_teacher() then raise exception 'No autorizado'; end if;
  return query select q.id,k.correct_choice::text,k.explanation
    from public.pf_questions q join public.pf_blocks b on b.id=q.block_id
    join pf_private.answer_keys k on k.question_id=q.id
    where b.activity_id=p_activity;
end;
$$;
revoke all on function pf_private.teacher_keys_impl(text) from public;
grant execute on function pf_private.teacher_keys_impl(text) to authenticated;
create or replace function public.pf_teacher_keys(p_activity text)
returns table(question_id text,correct_choice text,explanation text)
language sql stable security invoker set search_path = ''
as $$ select * from pf_private.teacher_keys_impl(p_activity); $$;
revoke all on function public.pf_teacher_keys(text) from public;
grant execute on function public.pf_teacher_keys(text) to authenticated;

-- El alumno recibe su correccion solo cuando el profesor activa reveal_answers.
create or replace function pf_private.my_results_impl(p_activity text)
returns table(question_id text,correct_choice text,explanation text,is_correct boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  return query select q.id,k.correct_choice::text,k.explanation,g.is_correct
    from public.pf_responses r
    join public.pf_questions q on q.id=r.question_id
    join public.pf_blocks b on b.id=q.block_id
    join pf_private.answer_keys k on k.question_id=q.id
    join public.pf_scores g on g.question_id=r.question_id and g.user_id=r.user_id
    where r.user_id=auth.uid() and b.activity_id=p_activity and b.reveal_answers=true;
end;
$$;
revoke all on function pf_private.my_results_impl(text) from public;
grant execute on function pf_private.my_results_impl(text) to authenticated;
create or replace function public.pf_my_results(p_activity text)
returns table(question_id text,correct_choice text,explanation text,is_correct boolean)
language sql stable security invoker set search_path = ''
as $$ select * from pf_private.my_results_impl(p_activity); $$;
revoke all on function public.pf_my_results(text) from public;
grant execute on function public.pf_my_results(text) to authenticated;

-- Ejemplo de alta del profesor (NO ejecutar hasta conocer el UUID real):
-- 1) Supabase > Authentication > Users: crear usuario con correo y contrasena.
-- 2) Copiar su User UID y ejecutar:
-- insert into pf_private.teachers(user_id) values ('PEGA_AQUI_EL_UUID') on conflict do nothing;

-- ===== Datos del ejercicio PulsoFit (sin destruir respuestas previas) =====
insert into public.pf_activities(id,title) values
  ('pulsofit-checks-1dam','PulsoFit · Evaluacion formativa de CHECK')
  on conflict(id) do nothing;

insert into public.pf_blocks(id,activity_id,title,sort_order) values ('pulsofit-b1','pulsofit-checks-1dam','Control 1 · Ejercicios 1–3',1) on conflict(id) do nothing;
insert into public.pf_blocks(id,activity_id,title,sort_order) values ('pulsofit-b2','pulsofit-checks-1dam','Control 2 · Ejercicios 4–6',2) on conflict(id) do nothing;
insert into public.pf_blocks(id,activity_id,title,sort_order) values ('pulsofit-b3','pulsofit-checks-1dam','Control 3 · Ejercicios 7–9',3) on conflict(id) do nothing;
insert into public.pf_blocks(id,activity_id,title,sort_order) values ('pulsofit-b4','pulsofit-checks-1dam','Control 4 · Ejercicios 10–12',4) on conflict(id) do nothing;
insert into public.pf_blocks(id,activity_id,title,sort_order) values ('pulsofit-b5','pulsofit-checks-1dam','Control 5 · Ejercicios 13–15',5) on conflict(id) do nothing;

-- Preguntas y sus cuatro opciones (lectura para los alumnos; sin la clave).
insert into public.pf_questions(id,block_id,exercise_number,sort_order,prompt,options) values ('pf-q01','pulsofit-b1',1,1,'¿Se acepta PF-12345?','["Sí, tiene el prefijo correcto.", "No, contiene cinco dígitos.", "No, falta una letra final.", "Sí, porque los cuatro primeros dígitos son válidos."]'::jsonb) on conflict(id) do nothing;
insert into public.pf_questions(id,block_id,exercise_number,sort_order,prompt,options) values ('pf-q02','pulsofit-b1',2,2,'¿Es válido 12345678a?','["Sí, contiene ocho cifras y una letra.", "No, necesita nueve cifras.", "Sí, porque admite minúsculas.", "No, la letra final debe estar en mayúscula."]'::jsonb) on conflict(id) do nothing;
insert into public.pf_questions(id,block_id,exercise_number,sort_order,prompt,options) values ('pf-q03','pulsofit-b1',3,3,'¿Es válido 512345678?','["No, empieza por 5.", "No, tiene ocho cifras.", "Sí, porque contiene nueve cifras.", "Sí, porque cualquier dígito inicial es válido."]'::jsonb) on conflict(id) do nothing;
insert into public.pf_questions(id,block_id,exercise_number,sort_order,prompt,options) values ('pf-q04','pulsofit-b2',4,1,'¿Se aceptan 53001 y 05001?','["Ambos.", "Ninguno.", "Solo 05001.", "Solo 53001."]'::jsonb) on conflict(id) do nothing;
insert into public.pf_questions(id,block_id,exercise_number,sort_order,prompt,options) values ('pf-q05','pulsofit-b2',5,2,'¿Es válido maria25?','["Sí, porque tiene siete caracteres.", "No, contiene números.", "No, contiene mayúsculas.", "Sí, porque empieza con letras."]'::jsonb) on conflict(id) do nothing;
insert into public.pf_questions(id,block_id,exercise_number,sort_order,prompt,options) values ('pf-q06','pulsofit-b2',6,3,'¿Es válida 1234ABC?','["Sí, tiene cuatro cifras y tres letras.", "No, tiene demasiados caracteres.", "Sí, todas las letras son mayúsculas.", "No, contiene la vocal A."]'::jsonb) on conflict(id) do nothing;
insert into public.pf_questions(id,block_id,exercise_number,sort_order,prompt,options) values ('pf-q07','pulsofit-b3',7,1,'¿Se permite el tipo de cuota ''FAMILIAR''?','["No, no pertenece al conjunto permitido.", "Sí, porque tiene menos de diez caracteres.", "No, porque está escrito en mayúsculas.", "Sí, si la cuota está entre 20 y 90 €."]'::jsonb) on conflict(id) do nothing;
insert into public.pf_questions(id,block_id,exercise_number,sort_order,prompt,options) values ('pf-q08','pulsofit-b3',8,2,'¿Se permiten cuotas de 20 y 90 €?','["Solo 20 €.", "Ambas.", "Solo 90 €.", "Ninguna."]'::jsonb) on conflict(id) do nothing;
insert into public.pf_questions(id,block_id,exercise_number,sort_order,prompt,options) values ('pf-q09','pulsofit-b3',9,3,'¿Puede un socio PREMIUM pagar 60 €?','["No, ninguna cuota puede superar 35 €.", "No, PREMIUM tiene un máximo de 35 €.", "Sí, el límite especial de 35 € solo se aplica a ESTUDIANTE.", "Sí, porque PREMIUM no está sujeto a ninguna restricción."]'::jsonb) on conflict(id) do nothing;
insert into public.pf_questions(id,block_id,exercise_number,sort_order,prompt,options) values ('pf-q10','pulsofit-b4',10,1,'¿Puede registrarse una baja anterior al alta?','["Sí, cuando no es NULL.", "No, la baja debe ser igual o posterior al alta.", "Sí, para socios PREMIUM.", "No, porque la fecha de baja no puede ser NULL."]'::jsonb) on conflict(id) do nothing;
insert into public.pf_questions(id,block_id,exercise_number,sort_order,prompt,options) values ('pf-q11','pulsofit-b4',11,2,'¿Son válidos '' Ana'' y ''A''?','["Ambos.", "Solo ''A''.", "Ninguno.", "Solo '' Ana''."]'::jsonb) on conflict(id) do nothing;
insert into public.pf_questions(id,block_id,exercise_number,sort_order,prompt,options) values ('pf-q12','pulsofit-b4',12,3,'¿Se permite el nivel ''EXPERTO''?','["Sí, para cualquier clase.", "Sí, porque es un nivel avanzado.", "No, porque supera la longitud del campo.", "No, porque no aparece en los valores permitidos."]'::jsonb) on conflict(id) do nothing;
insert into public.pf_questions(id,block_id,exercise_number,sort_order,prompt,options) values ('pf-q13','pulsofit-b5',13,1,'¿Se permite el día ''D''?','["No, domingo no está incluido.", "Sí, porque representa un día de la semana.", "No, porque el campo debe contener números.", "Sí, porque admite cualquier letra."]'::jsonb) on conflict(id) do nothing;
insert into public.pf_questions(id,block_id,exercise_number,sort_order,prompt,options) values ('pf-q14','pulsofit-b5',14,2,'¿Es válida una clase de 10:00 a 09:00?','["Sí, ambos horarios están dentro de los límites.", "No, el inicio es posterior al final.", "No, porque las 10:00 está fuera del horario permitido.", "Sí, porque ambas horas pertenecen al mismo día."]'::jsonb) on conflict(id) do nothing;
insert into public.pf_questions(id,block_id,exercise_number,sort_order,prompt,options) values ('pf-q15','pulsofit-b5',15,3,'¿Puede una clase tener aforo 20 y 25 plazas ocupadas?','["Sí, porque el aforo está entre 1 y 30.", "No, porque el aforo supera el máximo.", "No, porque las plazas ocupadas superan el aforo.", "Sí, porque las columnas son UNSIGNED."]'::jsonb) on conflict(id) do nothing;

-- NOTA: las claves correctas deben cargarse desde el archivo PRIVADO, no publicado en GitHub.
