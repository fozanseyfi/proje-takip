"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Search } from "lucide-react";
import { useStore, useCurrentUser } from "@/lib/store";
import type { Role } from "@/lib/store/types";
import { formatDate } from "@/lib/utils";

/** Kullanıcılar — tüm platformlarda aynı düzen: başlık, filtreli üye listesi, yanda davetler ve roller. */

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Süper Admin",
  project_manager: "Proje Yöneticisi",
  field_engineer: "Saha Mühendisi",
  viewer: "Görüntüleyici",
};

const ROLE_PILL: Record<Role, string> = {
  super_admin: "bg-purple/10 text-purple",
  project_manager: "bg-accent/10 text-accent",
  field_engineer: "bg-blue/10 text-blue",
  viewer: "bg-bg3 text-text2",
};

const ROLE_DESC: Record<Role, string> = {
  super_admin: "Tüm projeler ve panel ayarları",
  project_manager: "Projeyi yönetir, ekip davet eder",
  field_engineer: "Günlük gerçekleşme ve puantaj girer",
  viewer: "Görüntüleme amaçlı",
};

const ROLES = Object.keys(ROLE_LABEL) as Role[];

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toLocaleUpperCase("tr-TR") || "?";
}

function RolePill({ role, className = "" }: { role: Role; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${ROLE_PILL[role]} ${className}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {ROLE_LABEL[role]}
    </span>
  );
}

export default function UsersPage() {
  const me = useCurrentUser();
  const users = useStore((s) => s.users);
  const members = useStore((s) => s.members);
  const projects = useStore((s) => s.projects);
  const invitations = useStore((s) => s.invitations);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Role | "all">("all");

  /** Kişinin paneldeki en yetkili rolü (süper admin > proje yöneticisi > saha mühendisi > görüntüleyici) */
  const roleOf = useMemo(() => {
    const m = new Map<string, Role>();
    users.forEach((u) => {
      if (u.isSuperAdmin) return m.set(u.id, "super_admin");
      const rs = members.filter((x) => x.userId === u.id).map((x) => x.role);
      m.set(u.id, ROLES.find((r) => rs.includes(r)) ?? "viewer");
    });
    return m;
  }, [users, members]);

  const projCount = useMemo(() => {
    const m = new Map<string, number>();
    members.forEach((x) => m.set(x.userId, (m.get(x.userId) ?? 0) + 1));
    return m;
  }, [members]);

  const list = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr-TR");
    return users
      .filter((u) => filter === "all" || roleOf.get(u.id) === filter)
      .filter((u) => !s || u.fullName.toLocaleLowerCase("tr-TR").includes(s) || u.email.toLowerCase().includes(s))
      .sort((a, b) => (a.id === me?.id ? -1 : b.id === me?.id ? 1 : a.fullName.localeCompare(b.fullName, "tr")));
  }, [users, q, filter, roleOf, me?.id]);

  const pending = invitations.filter((i) => !i.acceptedAt && new Date(i.expiresAt) > new Date());
  const projName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";
  const segs: [Role | "all", string, number][] = [
    ["all", "Tümü", users.length],
    ...ROLES.map((r) => [r, ROLE_LABEL[r], users.filter((u) => roleOf.get(u.id) === r).length] as [Role, string, number]),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      {/* Başlık */}
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-border bg-gradient-to-b from-white to-bg2 px-6 py-6">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-text3">Yönetici paneli</p>
          <h1 className="mt-1.5 text-[26px] font-extrabold leading-tight tracking-tight text-text">Ekip ve yetkilendirme</h1>
          <p className="mt-2 max-w-xl text-sm text-text2">
            Panelinizdeki kişiler ve projelerdeki rolleri. Kişi davetleri proje bazında, Proje Ekibi sayfasından yapılır.
          </p>
        </div>
        <Link
          href="/team"
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent2"
        >
          Proje ekibini yönet <ArrowRight className="size-4" />
        </Link>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Üye listesi */}
        <section className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5">
            <div className="flex max-w-full overflow-x-auto rounded-lg bg-bg2 p-[3px] text-[12.5px]" role="tablist">
              {segs.map(([v, l, n]) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={filter === v}
                  onClick={() => setFilter(v)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition-colors ${
                    filter === v ? "bg-white text-text shadow-sm" : "text-text2 hover:text-text"
                  }`}
                >
                  {l} <span className="tabular-nums opacity-70">{n}</span>
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text3" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="İsim veya e-posta ara"
                className="h-9 w-full rounded-md border border-border bg-white pl-8 pr-3 text-[13px] text-text outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              />
            </div>
          </div>

          {list.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-medium text-text">Eşleşen üye yok</p>
              <p className="mt-1 text-xs text-text2">Aramayı veya rol filtresini değiştirin.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((u) => {
                const isMe = u.id === me?.id;
                const n = projCount.get(u.id) ?? 0;
                return (
                  <li key={u.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-2 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_110px_160px]">
                    <div className="flex size-[38px] items-center justify-center rounded-full bg-[#0f172a] text-[13px] font-bold text-white">
                      {initials(u.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold text-text">
                        <span className="truncate">{u.fullName}</span>
                        {isMe && <span className="rounded bg-blue/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-blue">Siz</span>}
                      </p>
                      <p className="truncate text-[12.5px] text-text2">{u.email}</p>
                    </div>
                    <p className="hidden text-xs text-text2 sm:block" title="Katılma tarihi">
                      {formatDate(u.createdAt)}
                    </p>
                    <div className="col-span-1 col-start-2 flex flex-wrap items-center gap-2 sm:col-start-auto">
                      <RolePill role={roleOf.get(u.id) ?? "viewer"} />
                      <span className="text-[11px] text-text3">{n} proje</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Yan sütun */}
        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-white p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-text">
              <Clock className="size-4 text-yellow" />
              Bekleyen davetler <span className="tabular-nums text-text3">· {pending.length}</span>
            </h2>
            {pending.length === 0 ? (
              <p className="mt-3 text-xs text-text2">Bekleyen davet yok.</p>
            ) : (
              <ul className="mt-2">
                {pending.map((i) => (
                  <li key={i.id} className="border-t border-dashed border-border py-2.5 first:border-t-0">
                    <p className="truncate text-[13px] text-text">{i.email}</p>
                    <p className="text-xs text-text2">
                      {ROLE_LABEL[i.role]} · {projName(i.projectId)} · {formatDate(i.expiresAt)} tarihine kadar
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2.5 rounded-xl border border-border bg-white p-4">
            <h2 className="text-sm font-bold text-text">Roller</h2>
            {ROLES.map((r) => (
              <div key={r} className="flex items-start gap-2.5 text-[12.5px]">
                <RolePill role={r} className="min-w-[124px] justify-center" />
                <span className="pt-px text-text2">{ROLE_DESC[r]}</span>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
