create table if not exists clinics (
  id text primary key,
  name text not null,
  address text not null default '',
  city text not null default '',
  province text not null default 'ON',
  postal text not null default '',
  phone text not null default '',
  email text not null default '',
  slot_minutes integer not null default 20,
  work_start text not null default '09:00',
  work_end text not null default '17:00',
  created_at timestamptz not null default now()
);

create table if not exists doctors (
  id text primary key,
  clinic_id text not null references clinics(id) on delete cascade,
  user_id text,
  name text not null,
  credentials text not null default 'OD',
  color text not null default 'doc-1',
  specialty text not null default 'Optometry',
  work_start text not null default '09:00',
  work_end text not null default '17:00',
  slot_minutes integer not null default 20,
  active boolean not null default true
);

create table if not exists patients (
  id text primary key,
  clinic_id text not null references clinics(id) on delete cascade,
  user_id text,
  patient_no integer not null,
  title text not null default '',
  first_name text not null,
  middle_name text not null default '',
  last_name text not null,
  suffix text not null default '',
  sex text not null default '',
  dob date,
  email text not null default '',
  phone_home text not null default '',
  phone_cell text not null default '',
  phone_work text not null default '',
  address1 text not null default '',
  address2 text not null default '',
  city text not null default '',
  province text not null default 'ON',
  postal text not null default '',
  country text not null default 'Canada',
  employer text not null default '',
  occupation text not null default '',
  marital text not null default '',
  language text not null default 'English',
  health_card text not null default '',
  journey_stage text not null default 'lead',
  onboarded boolean not null default false,
  phipa_consent boolean not null default false,
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists patients_clinic_no on patients(clinic_id, patient_no);

create table if not exists profiles (
  user_id text primary key,
  clinic_id text not null references clinics(id) on delete cascade,
  role text not null default 'staff',
  display_name text not null,
  email text not null default '',
  patient_id text references patients(id) on delete set null,
  doctor_id text references doctors(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists invites (
  id text primary key,
  clinic_id text not null references clinics(id) on delete cascade,
  email text not null,
  role text not null,
  name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists family_links (
  id text primary key,
  clinic_id text not null references clinics(id) on delete cascade,
  patient_id text not null references patients(id) on delete cascade,
  related_patient_id text not null references patients(id) on delete cascade,
  relationship text not null,
  is_guarantor boolean not null default false
);

create table if not exists insurance (
  id text primary key,
  patient_id text not null references patients(id) on delete cascade,
  carrier text not null,
  plan_name text not null default '',
  member_id text not null default '',
  group_no text not null default '',
  copay numeric not null default 0,
  is_primary boolean not null default true
);

create table if not exists vision_rx (
  id text primary key,
  patient_id text not null references patients(id) on delete cascade,
  doctor_id text references doctors(id) on delete set null,
  exam_date date not null,
  od_sphere text not null default '',
  od_cyl text not null default '',
  od_axis text not null default '',
  od_add text not null default '',
  os_sphere text not null default '',
  os_cyl text not null default '',
  os_axis text not null default '',
  os_add text not null default '',
  pd text not null default '',
  notes text not null default ''
);

create table if not exists appointments (
  id text primary key,
  clinic_id text not null references clinics(id) on delete cascade,
  patient_id text not null references patients(id) on delete cascade,
  doctor_id text not null references doctors(id) on delete cascade,
  start_at timestamptz not null,
  duration_min integer not null default 20,
  status text not null default 'confirmed',
  service text not null default 'Comprehensive exam',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  clinic_id text not null references clinics(id) on delete cascade,
  patient_id text not null references patients(id) on delete cascade,
  doctor_id text references doctors(id) on delete set null,
  type text not null default 'Spectacle lens',
  status text not null default 'open',
  frame_name text not null default '',
  lens_type text not null default '',
  promised_date date,
  sold_by text not null default '',
  patient_total numeric not null default 0,
  insurance_total numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists emails (
  id text primary key,
  clinic_id text not null references clinics(id) on delete cascade,
  to_email text not null,
  to_name text not null default '',
  subject text not null,
  body text not null,
  kind text not null,
  related_type text,
  related_id text,
  sent_at timestamptz not null default now()
);

create table if not exists journey_events (
  id text primary key,
  patient_id text not null references patients(id) on delete cascade,
  stage text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
