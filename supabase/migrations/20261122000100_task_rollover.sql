-- Carry-over: task yang belum selesai dari hari sebelumnya dipindah ke hari ini
-- dan postpone_count-nya bertambah. Aman dipanggil berkali-kali dalam sehari.
create or replace function public.rollover_tasks(p_today date)
returns int
language sql
security invoker
set search_path = public
as $$
  with moved as (
    update public.tasks
       set due_date = p_today,
           postpone_count = postpone_count + 1
     where user_id = auth.uid()
       and completed_at is null
       and someday = false
       and due_date is not null
       and due_date < p_today
    returning 1
  )
  select count(*)::int from moved;
$$;

grant execute on function public.rollover_tasks(date) to authenticated;
