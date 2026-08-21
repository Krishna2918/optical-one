export const APP_NAME = "Lumen";

export const JOURNEY_STAGES = [
  { id: "lead", label: "Lead", hint: "First contact" },
  { id: "onboarding", label: "Onboarding", hint: "Forms in progress" },
  { id: "onboarded", label: "Ready", hint: "Chart complete" },
  { id: "scheduled", label: "Scheduled", hint: "Visit on the book" },
  { id: "checked_in", label: "Checked in", hint: "In clinic" },
  { id: "exam", label: "Exam", hint: "With the doctor" },
  { id: "rx_ready", label: "Rx ready", hint: "Prescription written" },
  { id: "order_placed", label: "Order placed", hint: "Frames or lenses" },
  { id: "at_lab", label: "At lab", hint: "In production" },
  { id: "ready_to_call", label: "Ready to call", hint: "Job is back" },
  { id: "notified", label: "Notified", hint: "Patient reached" },
  { id: "delivered", label: "Delivered", hint: "Dispensed" },
  { id: "paid", label: "Paid", hint: "Closed" },
] as const;

export type JourneyStage = (typeof JOURNEY_STAGES)[number]["id"];

export const ORDER_STATUSES = [
  { id: "quote", label: "Quote", tone: "muted" },
  { id: "open", label: "Open", tone: "muted" },
  { id: "at_lab", label: "At lab", tone: "lab" },
  { id: "ready_to_call", label: "Ready to call", tone: "ready" },
  { id: "notified", label: "Notified", tone: "notified" },
  { id: "delivered", label: "Delivered", tone: "delivered" },
  { id: "billed", label: "Billed", tone: "billed" },
  { id: "paid", label: "Paid in full", tone: "paid" },
  { id: "shipped", label: "Shipped", tone: "info" },
  { id: "remade", label: "Remade", tone: "warn" },
  { id: "exchange", label: "Exchange", tone: "warn" },
  { id: "reprocess", label: "Reprocess", tone: "warn" },
  { id: "return", label: "Return", tone: "warn" },
  { id: "warranty", label: "Warranty", tone: "info" },
  { id: "canceled", label: "Canceled", tone: "canceled" },
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]["id"];

export const APPT_STATUSES = [
  { id: "pre", label: "Pre-appointment" },
  { id: "confirmed", label: "Confirmed" },
  { id: "checked_in", label: "Checked in" },
  { id: "checked_out", label: "Checked out" },
  { id: "new", label: "New" },
  { id: "left_message", label: "Left message" },
  { id: "no_show", label: "No show" },
  { id: "canceled", label: "Canceled" },
  { id: "missed", label: "Missed" },
] as const;

export type ApptStatus = (typeof APPT_STATUSES)[number]["id"];

export const ROLES = [
  { id: "owner", label: "Owner" },
  { id: "admin", label: "Admin" },
  { id: "doctor", label: "Doctor" },
  { id: "staff", label: "Staff" },
  { id: "patient", label: "Patient" },
] as const;

export type Role = (typeof ROLES)[number]["id"];

export const SERVICES = [
  "Comprehensive exam",
  "Contact lens fitting",
  "Follow-up",
  "Frame selection",
  "Dispense / adjust",
  "Emergency",
  "Pediatric exam",
  "Visual field",
] as const;

export const RELATIONSHIPS = [
  "Spouse",
  "Parent",
  "Child",
  "Sibling",
  "Guardian",
  "Guarantor",
  "Other",
] as const;

export const LETTER_TEMPLATES = [
  { name: "Exam recall", type: "Exam" },
  { name: "Contact lens check-up", type: "Order" },
  { name: "Birthday", type: "Patient" },
  { name: "Thank you — referral", type: "Patient" },
  { name: "Glasses ready", type: "Order" },
  { name: "HIPAA / PHIPA notice", type: "Patient" },
  { name: "Insurance recall", type: "Order" },
  { name: "Prescription expire", type: "Exam" },
  { name: "Referral — cataract", type: "Exam" },
  { name: "Referral — glaucoma", type: "Exam" },
] as const;

export const DOCTOR_COLORS = [
  "doc-1",
  "doc-2",
  "doc-3",
  "doc-4",
  "doc-5",
] as const;
