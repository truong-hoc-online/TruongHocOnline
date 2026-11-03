-- Follow-ups found while building the admin site.
-- 1. Feedback that is fixed / rejected / duplicate is locked: only an admin may change (reopen) it.
-- 2. Hiding a display name and editing banned words are written to audit_log.
-- 3. Adding a banned word hides existing names that contain it right away (not only at the player's next save).

create or replace function public.feedback_before_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status is distinct from old.status or new.admin_note is distinct from old.admin_note then
    if old.status in ('fixed', 'rejected', 'duplicate') and not public.is_staff('admin') then
      raise exception 'locked: only an admin can reopen this report';
    end if;
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
    perform public.audit('feedback.review', new.id::text,
      jsonb_build_object('from', old.status, 'to', new.status, 'note', new.admin_note));
  end if;
  return new;
end;
$$;

create function public.profiles_audit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.hidden is distinct from old.hidden and public.is_staff('admin', 'moderator') then
    perform public.audit(case when new.hidden then 'profile.hide' else 'profile.unhide' end, new.user_id::text,
      jsonb_build_object('name', new.display_name));
  end if;
  return new;
end;
$$;
create trigger profiles_audit before update on public.profiles
  for each row execute function public.profiles_audit();

create function public.banned_words_changed()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.word := lower(trim(new.word));
    perform public.audit('banned_word.add', new.word, null);
    update public.profiles set hidden = true
      where not hidden and position(new.word in lower(display_name)) > 0;
    return new;
  end if;
  perform public.audit('banned_word.remove', old.word, null);
  return old;
end;
$$;
create trigger banned_words_changed before insert or delete on public.banned_words
  for each row execute function public.banned_words_changed();

revoke execute on function public.profiles_audit() from public, anon, authenticated;
revoke execute on function public.banned_words_changed() from public, anon, authenticated;
