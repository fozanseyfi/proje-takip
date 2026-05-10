"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  User,
  Project,
  ProjectMember,
  Invitation,
  WbsItem,
  DateQuantityMap,
  PersonnelMaster,
  MachineMaster,
  PersonnelAssignment,
  MachineAssignment,
  PersonnelAttendance,
  MachineAttendance,
  DailyReport,
  ProcurementItem,
  BillingItem,
  BudgetCategory,
  BudgetActual,
  LookaheadItem,
  AuditEntry,
  NotificationItem,
  Role,
} from "./types";
import { DEFAULT_WBS } from "@/lib/data/default-wbs";
import { uid, toISODate } from "@/lib/utils";

// ============================================================
// State shape
// ============================================================
export interface StoreState {
  // Auth
  currentUserId: string | null;
  users: User[];

  // Multi-project
  projects: Project[];
  currentProjectId: string | null;
  members: ProjectMember[];
  invitations: Invitation[];

  // Per-project iş verileri
  wbs: WbsItem[];
  planned: Record<string, DateQuantityMap>;   // { projectId: { code: { date: qty } } }
  realized: Record<string, DateQuantityMap>;

  // Master data (user-bound, proje-bağımsız)
  personnelMaster: PersonnelMaster[];
  machinesMaster: MachineMaster[];
  personnelAssignments: PersonnelAssignment[];
  machineAssignments: MachineAssignment[];

  // Puantaj
  personnelAttendance: PersonnelAttendance[];
  machineAttendance: MachineAttendance[];

  // Diğer modüller
  dailyReports: DailyReport[];
  procurement: ProcurementItem[];
  billing: BillingItem[];
  budgetCategories: BudgetCategory[];
  budgetActuals: BudgetActual[];
  lookahead: LookaheadItem[];

  // Sistem
  auditLog: AuditEntry[];
  notifications: NotificationItem[];

  _seeded: boolean;

  // ===== Actions =====
  seedIfEmpty: () => void;
  resetAll: () => void;

  // Auth
  setCurrentUser: (userId: string | null) => void;
  addUser: (u: Omit<User, "id" | "createdAt">) => User;

  // Projects
  setCurrentProject: (id: string | null) => void;
  createProject: (p: Omit<Project, "id" | "createdAt" | "updatedAt">) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Members & invites
  addMember: (m: Omit<ProjectMember, "id" | "invitedAt">) => void;
  updateMemberRole: (memberId: string, role: Role) => void;
  removeMember: (memberId: string) => void;
  createInvitation: (i: Omit<Invitation, "id" | "token" | "invitedAt" | "expiresAt">) => Invitation;
  acceptInvitation: (token: string, userId: string) => void;
  cancelInvitation: (id: string) => void;

  // WBS
  addWbs: (item: Omit<WbsItem, "id">) => void;
  updateWbs: (id: string, patch: Partial<WbsItem>) => void;
  softDeleteWbs: (id: string) => void;
  restoreWbs: (id: string) => void;
  hardDeleteWbs: (id: string) => void;

  // Planning & Realization
  setPlanned: (projectId: string, code: string, date: string, qty: number) => void;
  setRealized: (projectId: string, code: string, date: string, qty: number) => void;

  // Master data
  addPersonnel: (p: Omit<PersonnelMaster, "id" | "createdAt" | "updatedAt">) => PersonnelMaster;
  updatePersonnel: (id: string, patch: Partial<PersonnelMaster>) => void;
  softDeletePersonnel: (id: string) => void;

  addMachine: (m: Omit<MachineMaster, "id" | "createdAt" | "updatedAt">) => MachineMaster;
  updateMachine: (id: string, patch: Partial<MachineMaster>) => void;
  softDeleteMachine: (id: string) => void;

  assignPersonnel: (a: Omit<PersonnelAssignment, "id">) => void;
  assignMachine: (a: Omit<MachineAssignment, "id">) => void;
  unassignPersonnel: (id: string) => void;
  unassignMachine: (id: string) => void;

  // Attendance
  setPersonnelAttendance: (records: Omit<PersonnelAttendance, "id" | "recordedAt">[]) => void;
  setMachineAttendance: (records: Omit<MachineAttendance, "id" | "recordedAt">[]) => void;

  // Daily report
  upsertDailyReport: (r: Omit<DailyReport, "id" | "createdAt" | "updatedAt"> & { id?: string }) => DailyReport;
  deleteDailyReport: (id: string) => void;

  // Procurement / Billing
  addProcurement: (p: Omit<ProcurementItem, "id">) => void;
  updateProcurement: (id: string, patch: Partial<ProcurementItem>) => void;
  deleteProcurement: (id: string) => void;
  addBilling: (b: Omit<BillingItem, "id">) => void;
  updateBilling: (id: string, patch: Partial<BillingItem>) => void;
  deleteBilling: (id: string) => void;

  // Budget
  addBudgetCategory: (c: Omit<BudgetCategory, "id">) => void;
  updateBudgetCategory: (id: string, patch: Partial<BudgetCategory>) => void;
  deleteBudgetCategory: (id: string) => void;
  addBudgetActual: (a: Omit<BudgetActual, "id" | "recordedAt">) => void;

  // Lookahead
  addLookahead: (l: Omit<LookaheadItem, "id">) => void;
  updateLookahead: (id: string, patch: Partial<LookaheadItem>) => void;
  deleteLookahead: (id: string) => void;
  toggleLookaheadDone: (id: string) => void;

  // Audit & Notifications
  addAudit: (e: Omit<AuditEntry, "id" | "createdAt">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

// ============================================================
// Helpers
// ============================================================
const now = () => new Date().toISOString();

function makeSeedProject(userId: string): {
  user: User;
  project: Project;
  member: ProjectMember;
  wbs: WbsItem[];
} {
  const user: User = {
    id: userId,
    email: "ozan.seyfi@kontrolmatik.com",
    fullName: "Ozan Seyfi",
    isSuperAdmin: true,
    createdAt: now(),
  };

  const startDate = "2026-01-01";
  const durationDays = 240;
  const start = new Date(startDate);
  const plannedEnd = new Date(start);
  plannedEnd.setDate(plannedEnd.getDate() + durationDays);

  const project: Project = {
    id: uid(),
    name: "Konya GES 1",
    location: "Konya, Karapınar",
    latitude: 37.7156,
    longitude: 33.5471,
    wbsNo: "1",
    startDate,
    durationDays,
    plannedEnd: toISODate(plannedEnd),
    contractEnd: toISODate(plannedEnd),
    reportDate: toISODate(new Date()),
    installedCapacityMw: 10.5,
    totalBudget: 350_000_000,
    budgetCurrency: "TRY",
    status: "active",
    createdBy: userId,
    createdAt: now(),
    updatedAt: now(),
  };

  const member: ProjectMember = {
    id: uid(),
    projectId: project.id,
    userId,
    role: "super_admin",
    invitedBy: userId,
    invitedAt: now(),
    acceptedAt: now(),
  };

  const wbs: WbsItem[] = DEFAULT_WBS.map((w) => ({
    id: uid(),
    projectId: project.id,
    code: w.code,
    name: w.name,
    level: w.level,
    isLeaf: w.isLeaf,
    weight: w.weight,
    quantity: w.quantity,
    unit: w.unit,
    parentCode: w.code.includes(".") ? w.code.split(".").slice(0, -1).join(".") : undefined,
  }));

  return { user, project, member, wbs };
}

// ============================================================
// Store
// ============================================================
const initialState: Omit<StoreState, keyof Actions> = {
  currentUserId: null,
  users: [],
  projects: [],
  currentProjectId: null,
  members: [],
  invitations: [],
  wbs: [],
  planned: {},
  realized: {},
  personnelMaster: [],
  machinesMaster: [],
  personnelAssignments: [],
  machineAssignments: [],
  personnelAttendance: [],
  machineAttendance: [],
  dailyReports: [],
  procurement: [],
  billing: [],
  budgetCategories: [],
  budgetActuals: [],
  lookahead: [],
  auditLog: [],
  notifications: [],
  _seeded: false,
};

// Action keys to subtract from state shape above
type Actions = {
  [K in keyof StoreState as StoreState[K] extends (...args: never[]) => unknown ? K : never]: StoreState[K];
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      seedIfEmpty: () => {
        const s = get();
        if (s._seeded || s.projects.length > 0) return;
        const userId = uid();
        const seed = makeSeedProject(userId);
        set({
          users: [seed.user],
          currentUserId: seed.user.id,
          projects: [seed.project],
          currentProjectId: seed.project.id,
          members: [seed.member],
          wbs: seed.wbs,
          _seeded: true,
        });
      },

      resetAll: () => {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("ges-store");
        }
        set({ ...initialState });
      },

      setCurrentUser: (id) => set({ currentUserId: id }),

      addUser: (u) => {
        const user: User = { id: uid(), createdAt: now(), ...u };
        set((s) => ({ users: [...s.users, user] }));
        return user;
      },

      setCurrentProject: (id) => set({ currentProjectId: id }),

      createProject: (p) => {
        const project: Project = { id: uid(), createdAt: now(), updatedAt: now(), ...p };
        // Yeni projeye default WBS yükle
        const wbsItems: WbsItem[] = DEFAULT_WBS.map((w) => ({
          id: uid(),
          projectId: project.id,
          code: w.code,
          name: w.name,
          level: w.level,
          isLeaf: w.isLeaf,
          weight: w.weight,
          quantity: w.quantity,
          unit: w.unit,
          parentCode: w.code.includes(".") ? w.code.split(".").slice(0, -1).join(".") : undefined,
        }));
        const userId = get().currentUserId;
        const member: ProjectMember = {
          id: uid(),
          projectId: project.id,
          userId: userId || project.createdBy,
          role: "project_manager",
          invitedBy: userId || project.createdBy,
          invitedAt: now(),
          acceptedAt: now(),
        };
        set((s) => ({
          projects: [...s.projects, project],
          wbs: [...s.wbs, ...wbsItems],
          members: [...s.members, member],
          currentProjectId: project.id,
        }));
        return project;
      },

      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: now() } : p
          ),
        })),

      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          wbs: s.wbs.filter((w) => w.projectId !== id),
          members: s.members.filter((m) => m.projectId !== id),
          currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
        })),

      addMember: (m) => {
        const member: ProjectMember = { id: uid(), invitedAt: now(), ...m };
        set((s) => ({ members: [...s.members, member] }));
      },

      updateMemberRole: (memberId, role) =>
        set((s) => ({
          members: s.members.map((m) => (m.id === memberId ? { ...m, role } : m)),
        })),

      removeMember: (memberId) =>
        set((s) => ({ members: s.members.filter((m) => m.id !== memberId) })),

      createInvitation: (i) => {
        const expires = new Date();
        expires.setDate(expires.getDate() + 7);
        const inv: Invitation = {
          id: uid(),
          token: uid().replace(/-/g, ""),
          invitedAt: now(),
          expiresAt: expires.toISOString(),
          ...i,
        };
        set((s) => ({ invitations: [...s.invitations, inv] }));
        return inv;
      },

      acceptInvitation: (token, userId) => {
        const inv = get().invitations.find((x) => x.token === token);
        if (!inv) return;
        const member: ProjectMember = {
          id: uid(),
          projectId: inv.projectId,
          userId,
          role: inv.role,
          invitedBy: inv.invitedBy,
          invitedAt: inv.invitedAt,
          acceptedAt: now(),
        };
        set((s) => ({
          members: [...s.members, member],
          invitations: s.invitations.map((x) =>
            x.id === inv.id ? { ...x, acceptedAt: now() } : x
          ),
        }));
      },

      cancelInvitation: (id) =>
        set((s) => ({ invitations: s.invitations.filter((x) => x.id !== id) })),

      addWbs: (item) => {
        const wbs: WbsItem = { id: uid(), ...item };
        set((s) => ({ wbs: [...s.wbs, wbs] }));
      },

      updateWbs: (id, patch) =>
        set((s) => ({ wbs: s.wbs.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),

      softDeleteWbs: (id) =>
        set((s) => ({
          wbs: s.wbs.map((w) => (w.id === id ? { ...w, deletedAt: now() } : w)),
        })),

      restoreWbs: (id) =>
        set((s) => ({
          wbs: s.wbs.map((w) => (w.id === id ? { ...w, deletedAt: null } : w)),
        })),

      hardDeleteWbs: (id) =>
        set((s) => ({ wbs: s.wbs.filter((w) => w.id !== id) })),

      setPlanned: (projectId, code, date, qty) =>
        set((s) => {
          const pp = { ...(s.planned[projectId] || {}) };
          const byCode = { ...(pp[code] || {}) };
          if (qty <= 0 || Number.isNaN(qty)) {
            delete byCode[date];
          } else {
            byCode[date] = qty;
          }
          if (Object.keys(byCode).length === 0) {
            delete pp[code];
          } else {
            pp[code] = byCode;
          }
          return { planned: { ...s.planned, [projectId]: pp } };
        }),

      setRealized: (projectId, code, date, qty) =>
        set((s) => {
          const pr = { ...(s.realized[projectId] || {}) };
          const byCode = { ...(pr[code] || {}) };
          if (qty <= 0 || Number.isNaN(qty)) {
            delete byCode[date];
          } else {
            byCode[date] = qty;
          }
          if (Object.keys(byCode).length === 0) {
            delete pr[code];
          } else {
            pr[code] = byCode;
          }
          return { realized: { ...s.realized, [projectId]: pr } };
        }),

      addPersonnel: (p) => {
        const person: PersonnelMaster = {
          id: uid(),
          createdAt: now(),
          updatedAt: now(),
          ...p,
        };
        set((s) => ({ personnelMaster: [...s.personnelMaster, person] }));
        return person;
      },

      updatePersonnel: (id, patch) =>
        set((s) => ({
          personnelMaster: s.personnelMaster.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: now() } : p
          ),
        })),

      softDeletePersonnel: (id) =>
        set((s) => ({
          personnelMaster: s.personnelMaster.map((p) =>
            p.id === id ? { ...p, deletedAt: now() } : p
          ),
        })),

      addMachine: (m) => {
        const machine: MachineMaster = {
          id: uid(),
          createdAt: now(),
          updatedAt: now(),
          ...m,
        };
        set((s) => ({ machinesMaster: [...s.machinesMaster, machine] }));
        return machine;
      },

      updateMachine: (id, patch) =>
        set((s) => ({
          machinesMaster: s.machinesMaster.map((m) =>
            m.id === id ? { ...m, ...patch, updatedAt: now() } : m
          ),
        })),

      softDeleteMachine: (id) =>
        set((s) => ({
          machinesMaster: s.machinesMaster.map((m) =>
            m.id === id ? { ...m, deletedAt: now() } : m
          ),
        })),

      assignPersonnel: (a) => {
        const ass: PersonnelAssignment = { id: uid(), ...a };
        set((s) => ({ personnelAssignments: [...s.personnelAssignments, ass] }));
      },

      assignMachine: (a) => {
        const ass: MachineAssignment = { id: uid(), ...a };
        set((s) => ({ machineAssignments: [...s.machineAssignments, ass] }));
      },

      unassignPersonnel: (id) =>
        set((s) => ({ personnelAssignments: s.personnelAssignments.filter((a) => a.id !== id) })),

      unassignMachine: (id) =>
        set((s) => ({ machineAssignments: s.machineAssignments.filter((a) => a.id !== id) })),

      setPersonnelAttendance: (records) => {
        const recordedAt = now();
        set((s) => {
          // Aynı (projectId, personnelMasterId, date) varsa üzerine yaz
          const keep = s.personnelAttendance.filter((r) =>
            !records.some(
              (n) =>
                n.projectId === r.projectId &&
                n.personnelMasterId === r.personnelMasterId &&
                n.date === r.date
            )
          );
          const fresh: PersonnelAttendance[] = records.map((r) => ({
            id: uid(),
            recordedAt,
            ...r,
          }));
          return { personnelAttendance: [...keep, ...fresh] };
        });
      },

      setMachineAttendance: (records) => {
        const recordedAt = now();
        set((s) => {
          const keep = s.machineAttendance.filter((r) =>
            !records.some(
              (n) =>
                n.projectId === r.projectId &&
                n.machineMasterId === r.machineMasterId &&
                n.date === r.date
            )
          );
          const fresh: MachineAttendance[] = records.map((r) => ({
            id: uid(),
            recordedAt,
            ...r,
          }));
          return { machineAttendance: [...keep, ...fresh] };
        });
      },

      upsertDailyReport: (r) => {
        const existing = r.id ? get().dailyReports.find((x) => x.id === r.id) : undefined;
        if (existing) {
          const updated: DailyReport = { ...existing, ...r, updatedAt: now() };
          set((s) => ({
            dailyReports: s.dailyReports.map((x) => (x.id === updated.id ? updated : x)),
          }));
          return updated;
        }
        const created: DailyReport = {
          id: uid(),
          createdAt: now(),
          updatedAt: now(),
          ...r,
        } as DailyReport;
        set((s) => ({ dailyReports: [...s.dailyReports, created] }));
        return created;
      },

      deleteDailyReport: (id) =>
        set((s) => ({ dailyReports: s.dailyReports.filter((d) => d.id !== id) })),

      addProcurement: (p) =>
        set((s) => ({ procurement: [...s.procurement, { id: uid(), ...p }] })),
      updateProcurement: (id, patch) =>
        set((s) => ({
          procurement: s.procurement.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      deleteProcurement: (id) =>
        set((s) => ({ procurement: s.procurement.filter((p) => p.id !== id) })),

      addBilling: (b) =>
        set((s) => ({ billing: [...s.billing, { id: uid(), ...b }] })),
      updateBilling: (id, patch) =>
        set((s) => ({
          billing: s.billing.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      deleteBilling: (id) =>
        set((s) => ({ billing: s.billing.filter((b) => b.id !== id) })),

      addBudgetCategory: (c) =>
        set((s) => ({ budgetCategories: [...s.budgetCategories, { id: uid(), ...c }] })),
      updateBudgetCategory: (id, patch) =>
        set((s) => ({
          budgetCategories: s.budgetCategories.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        })),
      deleteBudgetCategory: (id) =>
        set((s) => ({ budgetCategories: s.budgetCategories.filter((c) => c.id !== id) })),

      addBudgetActual: (a) =>
        set((s) => ({
          budgetActuals: [...s.budgetActuals, { id: uid(), recordedAt: now(), ...a }],
        })),

      addLookahead: (l) =>
        set((s) => ({ lookahead: [...s.lookahead, { id: uid(), ...l }] })),
      updateLookahead: (id, patch) =>
        set((s) => ({
          lookahead: s.lookahead.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),
      deleteLookahead: (id) =>
        set((s) => ({ lookahead: s.lookahead.filter((l) => l.id !== id) })),
      toggleLookaheadDone: (id) =>
        set((s) => ({
          lookahead: s.lookahead.map((l) =>
            l.id === id ? { ...l, done: !l.done } : l
          ),
        })),

      addAudit: (e) =>
        set((s) => ({
          auditLog: [...s.auditLog, { id: uid(), createdAt: now(), ...e }].slice(-1000),
        })),

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, readAt: now() } : n
          ),
        })),

      markAllNotificationsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.readAt ? n : { ...n, readAt: now() }
          ),
        })),
    }),
    {
      name: "ges-store",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

// ============================================================
// Selector helpers — stable empty references + useMemo to avoid
// infinite re-renders from new object/array creation in selectors
// ============================================================
import { useMemo } from "react";

const EMPTY_DQM: DateQuantityMap = Object.freeze({}) as DateQuantityMap;
const EMPTY_WBS: WbsItem[] = Object.freeze([]) as unknown as WbsItem[];
const EMPTY_MEMBERS: ProjectMember[] = Object.freeze([]) as unknown as ProjectMember[];

export const useCurrentUser = () => {
  const userId = useStore((s) => s.currentUserId);
  const users = useStore((s) => s.users);
  return useMemo(() => users.find((u) => u.id === userId) || null, [users, userId]);
};

export const useCurrentProject = () => {
  const id = useStore((s) => s.currentProjectId);
  const projects = useStore((s) => s.projects);
  return useMemo(() => projects.find((p) => p.id === id) || null, [projects, id]);
};

export const useProjectWbs = (projectId: string | null | undefined) => {
  const wbs = useStore((s) => s.wbs);
  return useMemo(
    () =>
      projectId
        ? wbs.filter((w) => w.projectId === projectId && !w.deletedAt)
        : EMPTY_WBS,
    [wbs, projectId]
  );
};

export const useProjectPlanned = (projectId: string | null | undefined): DateQuantityMap => {
  const planned = useStore((s) => s.planned);
  return projectId ? planned[projectId] || EMPTY_DQM : EMPTY_DQM;
};

export const useProjectRealized = (projectId: string | null | undefined): DateQuantityMap => {
  const realized = useStore((s) => s.realized);
  return projectId ? realized[projectId] || EMPTY_DQM : EMPTY_DQM;
};

export const useProjectMembers = (projectId: string | null | undefined) => {
  const members = useStore((s) => s.members);
  return useMemo(
    () => (projectId ? members.filter((m) => m.projectId === projectId) : EMPTY_MEMBERS),
    [members, projectId]
  );
};
