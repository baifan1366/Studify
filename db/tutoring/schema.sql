create schema if not exists tutoring;

create table if not exists tutoring.tutors (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint not null references core.profiles(id) on delete cascade,
  headline text,
  subjects text[] not null default '{}',
  hourly_rate numeric(10,2),
  qualifications text,
  rating_avg numeric(3,2) default 0,
  rating_count int default 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create or replace trigger t_upd_tutors
before update on tutoring.tutors
for each row execute procedure core.set_updated_at();

create table if not exists tutoring.students (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint not null references core.profiles(id) on delete cascade,
  school text,
  grade text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create or replace trigger t_upd_students
before update on tutoring.students
for each row execute procedure core.set_updated_at();

-- Tutor availability and bookings
create table if not exists tutoring.availability (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  tutor_id bigint not null references tutoring.tutors(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  rrule text, -- optional recurrence rule (RFC5545)
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_avail_tutor_time on tutoring.availability(tutor_id, start_at, end_at);

-- Create triggers for updated_at
create or replace trigger t_upd_availability
before update on tutoring.availability
for each row execute procedure core.set_updated_at();

create table if not exists tutoring.appointments (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  tutor_id bigint not null references tutoring.tutors(id) on delete restrict,
  student_id bigint not null references tutoring.students(id) on delete restrict,
  scheduled_at timestamptz not null,
  duration_min int not null check (duration_min > 0),
  status text not null check (status in ('requested','confirmed','completed','cancelled')) default 'requested',
  notes text,
  created_by bigint references core.profiles(id),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_appointments_lookup on tutoring.appointments(tutor_id, student_id, scheduled_at);

create or replace trigger t_upd_appt
before update on tutoring.appointments
for each row execute procedure core.set_updated_at();