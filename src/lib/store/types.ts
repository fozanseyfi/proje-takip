import type { Currency } from "@/lib/utils";

export type Role = "super_admin" | "project_manager" | "field_engineer" | "viewer";

export type Discipline = "mekanik" | "elektrik" | "insaat" | "muhendislik" | "idari" | "diger";

export type MachineType =
  | "ekskavator"
  | "kamyon"
  | "vinc"
  | "forklift"
  | "loder"
  | "greyder"
  | "silindir"
  | "jenerator"
  | "diger";

export type FuelType = "dizel" | "benzin" | "elektrik" | "diger";

export type ProjectStatus = "active" | "archived" | "completed";

export type Priority = "low" | "medium" | "high" | "critical";

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  isSuperAdmin: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  wbsNo: string;
  startDate: string;       // ISO
  durationDays: number;
  plannedEnd: string;      // ISO
  contractEnd: string;     // ISO
  reportDate: string;      // ISO
  installedCapacityMw?: number | null;
  totalBudget?: number | null;
  budgetCurrency: Currency;
  status: ProjectStatus;
  publicShareToken?: string | null;
  publicShareExpiresAt?: string | null;
  createdBy: string;       // userId
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: Role;
  invitedBy: string;
  invitedAt: string;
  acceptedAt?: string | null;
}

export interface Invitation {
  id: string;
  projectId: string;
  email: string;
  role: Role;
  token: string;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  acceptedAt?: string | null;
}

export interface WbsItem {
  id: string;
  projectId: string;
  code: string;
  name: string;
  level: 0 | 1 | 2 | 3;
  parentCode?: string;
  isLeaf: boolean;
  weight: number;
  quantity: number;
  unit: string;
  discipline?: Discipline;
  plannedStart?: string;
  plannedEnd?: string;
  realizedStart?: string;
  realizedEnd?: string;
  deletedAt?: string | null;
}

// Planning & Realization: { [code]: { [isoDate]: quantity } }
export type DateQuantityMap = Record<string, Record<string, number>>;

export interface PersonnelMaster {
  id: string;
  ownerUserId: string;
  firstName: string;
  lastName: string;
  tcKimlikNo?: string;
  company: string;
  discipline: Discipline;
  jobTitle?: string;
  phone?: string;
  startDate?: string;
  dailyRate?: number;
  dailyRateCurrency?: Currency;
  status: "active" | "inactive";
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface MachineMaster {
  id: string;
  ownerUserId: string;
  name: string;
  machineType: MachineType;
  licensePlate?: string;
  company: string;
  dailyRate?: number;
  dailyRateCurrency?: Currency;
  fuelType?: FuelType;
  status: "active" | "inactive";
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface PersonnelAssignment {
  id: string;
  projectId: string;
  personnelMasterId: string;
  assignedFrom: string;
  assignedTo?: string | null;
  projectSpecificRole?: string;
}

export interface MachineAssignment {
  id: string;
  projectId: string;
  machineMasterId: string;
  assignedFrom: string;
  assignedTo?: string | null;
}

export interface PersonnelAttendance {
  id: string;
  projectId: string;
  personnelMasterId: string;
  date: string;
  present: boolean;
  hours: number;
  location?: string;
  notes?: string;
  recordedBy: string;
  recordedAt: string;
}

export interface MachineAttendance {
  id: string;
  projectId: string;
  machineMasterId: string;
  date: string;
  present: boolean;
  hours: number;
  fuelConsumed?: number;
  notes?: string;
  recordedBy: string;
  recordedAt: string;
}

export interface DailyReport {
  id: string;
  projectId: string;
  reportDate: string;
  weather?: string;
  temperatureMin?: number;
  temperatureMax?: number;
  weatherAutoFetched?: boolean;
  workStopped: boolean;
  workStoppedReason?: string;
  summary: string;
  issues?: string;
  tomorrowPlan?: string;
  photos: { url: string; caption?: string; uploadedAt: string }[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementItem {
  id: string;
  projectId: string;
  category: string;
  material: string;
  supplier?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  currency: Currency;
  status: "talep" | "siparis" | "yolda" | "teslim" | "iade";
  notes?: string;

  /** Kritik malzeme bayrağı — dashboard procurement follow-up'ta sürekli görünür */
  isCritical?: boolean;

  // === Planlanan tarihler ===
  /** Teklif Toplama Başlangıç (RFQ start) */
  rfqStartDate?: string;
  /** Teklif Toplama Bitiş (RFQ end / vendor selection) */
  rfqEndDate?: string;
  /** Planlanan Satın Alma Siparişi (PO) tarihi */
  plannedPoDate?: string;
  /** Planlanan EXW Tarihi (fabrika çıkış / hazır olma) */
  plannedExwDate?: string;
  /** Planlanan Teslimat Tarihi (sahaya geliş) */
  plannedDeliveryDate?: string;

  // === Gerçekleşen ===
  /** Gerçek PO tarihi */
  actualPoDate?: string;
  /** Gerçek EXW tarihi */
  actualExwDate?: string;
  /** Gerçek teslim tarihi */
  actualDeliveredDate?: string;
  /** Gerçek miktar (planın altında/üstünde olabilir) */
  actualQuantity?: number;
  /** Gerçek birim fiyat */
  actualUnitPrice?: number;
  /** Gerçek para birimi (genelde aynı, kur değişebilir) */
  actualCurrency?: Currency;
  /** Gerçekleşme notu */
  actualNotes?: string;

  // === Legacy (eski sample data için) — UI'da yenilere fallback yapılır ===
  /** @deprecated plannedPoDate kullanın */
  orderDate?: string;
  /** @deprecated plannedDeliveryDate kullanın */
  expectedDate?: string;
  /** @deprecated actualDeliveredDate kullanın */
  deliveredDate?: string;
}

/**
 * Fatura — iki yönlü:
 * - `owner_incoming`: işverene biz hakediş kestik (gelir)
 * - `subcontractor_outgoing`: alt yükleniciden bize fatura geldi (gider)
 */
export type BillingDirection = "owner_incoming" | "subcontractor_outgoing";

export interface BillingItem {
  id: string;
  projectId: string;
  direction: BillingDirection;
  subcontractorId?: string;          // sadece subcontractor_outgoing için
  invoiceNo?: string;
  description: string;
  amount: number;
  currency: Currency;
  issueDate: string;
  dueDate?: string;
  paidDate?: string;
  status: "taslak" | "gonderildi" | "odendi" | "iptal";
  notes?: string;
}

/**
 * Alt yüklenici (subcontractor) — proje bazlı sözleşme.
 */
export interface Subcontractor {
  id: string;
  projectId: string;
  name: string;                  // firma adı
  taxNo?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  scopeOfWork: string;           // iş kapsamı kısa açıklama
  discipline?: Discipline;
  contractAmount: number;        // sözleşme tutarı
  currency: Currency;
  contractDate: string;          // sözleşme tarihi
  startDate?: string;
  endDate?: string;              // planlanan bitiş
  status: "aktif" | "tamamlandi" | "iptal" | "askida";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory {
  id: string;
  projectId: string;
  name: string;
  plannedAmount: number;
  currency: Currency;
  linkedWbsCodes?: string[];
  sortOrder: number;
}

export interface BudgetActual {
  id: string;
  projectId: string;
  categoryId: string;
  date: string;
  amount: number;
  currency: Currency;
  amountInProjectCurrency?: number;
  description?: string;
  invoiceRef?: string;
  recordedBy: string;
  recordedAt: string;
}

export type LookaheadKind = "kritik_is" | "claim" | "tutanak" | "yazisma" | "ihbar";

export interface LookaheadItem {
  id: string;
  projectId: string;
  task: string;
  date: string;
  priority: Priority;
  owner?: string;
  done: boolean;
  notes?: string;
  /** Tip: kritik iş / claim / tutanak / yazışma / ihbar */
  kind?: LookaheadKind;
}

export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  projectId?: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  readAt?: string | null;
  createdAt: string;
}
