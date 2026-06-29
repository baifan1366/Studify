alter table public.course
add column if not exists rejected_message text;

comment on column public.course.rejected_message is
'Reason shown to the tutor when an administrator rejects or deactivates a course.';
