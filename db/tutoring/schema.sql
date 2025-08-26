create schema if not exists tutoring;

create table if not exists tutoring.tutors (
  user_id uuid primary key references core.profiles(user_id) on delete cascade,
  headline text,
  subjects text[] not null default '{}',
  hourly_rate numeric(10,2),
  qualifications text,
  rating_avg numeric(3,2) default 0,
  rating_count int default 0,
  updated_at timestamptz default now()
);
create trigger t_upd_tutors before update on tutoring.tutors
for each row execute procedure core.set_updated_at();

create table if not exists tutoring.students (
  user_id uuid primary key references core.profiles(user_id) on delete cascade,
  school text,
  grade text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger t_upd_students before update on tutoring.students
for each row execute procedure core.set_updated_at();

-- Tutor availability and bookings
create table if not exists tutoring.availability (
  id uuid primary key default uuid_generate_v1(),
  tutor_id uuid not null references tutoring.tutors(user_id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  rrule text -- optional recurrence rule (RFC5545)
);
create index if not exists idx_avail_tutor_time on tutoring.availability(tutor_id, start_at, end_at);

create table if not exists tutoring.appointments (
  id uuid primary key default uuid_generate_v1(),
  tutor_id uuid not null references tutoring.tutors(user_id) on delete restrict,
  student_id uuid not null references tutoring.students(user_id) on delete restrict,
  scheduled_at timestamptz not null,
  duration_min int not null check (duration_min > 0),
  status text not null check (status in ('requested','confirmed','completed','cancelled')) default 'requested',
  notes text,
  created_by uuid references core.profiles(user_id),
  updated_at timestamptz default now()
);
create index if not exists idx_appointments_lookup on tutoring.appointments(tutor_id, student_id, scheduled_at);
create trigger t_upd_appt before update on tutoring.appointments
for each row execute procedure core.set_updated_at();