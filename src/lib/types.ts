import type { ApptStatus, JourneyStage, OrderStatus, Role } from "./constants";

export type Clinic = {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postal: string;
  phone: string;
  email: string;
  slot_minutes: number;
  work_start: string;
  work_end: string;
};

export type Profile = {
  user_id: string;
  clinic_id: string;
  role: Role;
  display_name: string;
  email: string;
  patient_id: string | null;
  doctor_id: string | null;
  active: boolean;
};

export type Doctor = {
  id: string;
  clinic_id: string;
  user_id: string | null;
  name: string;
  credentials: string;
  color: string;
  specialty: string;
  work_start: string;
  work_end: string;
  slot_minutes: number;
  active: boolean;
};

export type Patient = {
  id: string;
  clinic_id: string;
  user_id: string | null;
  patient_no: number;
  title: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  sex: string;
  dob: string | null;
  email: string;
  phone_home: string;
  phone_cell: string;
  phone_work: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  postal: string;
  country: string;
  employer: string;
  occupation: string;
  marital: string;
  language: string;
  health_card: string;
  journey_stage: JourneyStage;
  onboarded: boolean;
  phipa_consent: boolean;
  active: boolean;
  notes: string;
  created_at: string;
};

export type FamilyLink = {
  id: string;
  patient_id: string;
  related_patient_id: string;
  relationship: string;
  is_guarantor: boolean;
  related_name?: string;
  related_no?: number;
};

export type Insurance = {
  id: string;
  patient_id: string;
  carrier: string;
  plan_name: string;
  member_id: string;
  group_no: string;
  copay: number;
  is_primary: boolean;
};

export type VisionRx = {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  exam_date: string;
  od_sphere: string;
  od_cyl: string;
  od_axis: string;
  od_add: string;
  os_sphere: string;
  os_cyl: string;
  os_axis: string;
  os_add: string;
  pd: string;
  notes: string;
  doctor_name?: string;
};

export type Appointment = {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  start_at: string;
  duration_min: number;
  status: ApptStatus;
  service: string;
  notes: string;
  patient_name?: string;
  doctor_name?: string;
  doctor_color?: string;
};

export type Order = {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string | null;
  type: string;
  status: OrderStatus;
  frame_name: string;
  lens_type: string;
  promised_date: string | null;
  sold_by: string;
  patient_total: number;
  insurance_total: number;
  created_at: string;
  patient_name?: string;
};

export type EmailRow = {
  id: string;
  clinic_id: string;
  to_email: string;
  to_name: string;
  subject: string;
  body: string;
  kind: string;
  related_type: string | null;
  related_id: string | null;
  sent_at: string;
};

export type JourneyEvent = {
  id: string;
  patient_id: string;
  stage: JourneyStage;
  note: string;
  created_at: string;
};

export type Invite = {
  id: string;
  clinic_id: string;
  email: string;
  role: Role;
  name: string;
};

export type DashboardStats = {
  patients: number;
  appointmentsToday: number;
  openOrders: number;
  readyToCall: number;
  emailsToday: number;
  onboarding: number;
};

export function patientName(p: Pick<Patient, "first_name" | "last_name" | "title">) {
  return [p.title, p.first_name, p.last_name].filter(Boolean).join(" ");
}
