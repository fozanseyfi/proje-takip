import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Globe,
  BarChart3,
  FolderTree,
  CalendarDays,
  CheckCircle2,
  HardHat,
  Truck,
  FileText,
  ShoppingCart,
  Receipt,
  Wallet,
  AlertTriangle,
  UserCog,
  Cog,
  Trash2,
  History,
  Database,
  Settings,
  Users,
  Share2,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  superAdminOnly?: boolean;
  mobile?: boolean; // bottom navigation'da görünür
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    title: "Genel",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
      { href: "/portfolio", label: "Portfolio", icon: Globe, superAdminOnly: true },
      { href: "/timeline", label: "Timeline & Gantt", icon: BarChart3 },
    ],
  },
  {
    title: "Planlama & Takip",
    items: [
      { href: "/wbs", label: "WBS Yapısı", icon: FolderTree },
      { href: "/planning", label: "Planlama", icon: CalendarDays },
      { href: "/realization", label: "Gerçekleşme", icon: CheckCircle2, mobile: true },
      { href: "/lookahead", label: "Kritik & Tutanak", icon: AlertTriangle },
    ],
  },
  {
    title: "Saha Operasyon",
    items: [
      { href: "/personnel", label: "Personel Puantajı", icon: HardHat, mobile: true },
      { href: "/machines", label: "Makine Puantajı", icon: Truck },
      { href: "/daily-report", label: "Günlük Rapor", icon: FileText, mobile: true },
    ],
  },
  {
    title: "Finansal",
    items: [
      { href: "/procurement", label: "Satın Alma", icon: ShoppingCart },
      { href: "/billing", label: "Faturalandırma", icon: Receipt },
      { href: "/budget", label: "Bütçe & CPI", icon: Wallet },
    ],
  },
  {
    title: "Master Data",
    items: [
      { href: "/master/personnel", label: "Personel Listesi", icon: UserCog },
      { href: "/master/machines", label: "Makine Listesi", icon: Cog },
    ],
  },
  {
    title: "Yönetim",
    items: [
      { href: "/team", label: "Ekip & Davet", icon: Users },
      { href: "/share", label: "Public Paylaşım", icon: Share2 },
      { href: "/settings", label: "Proje Ayarları", icon: Settings },
    ],
  },
  {
    title: "Sistem",
    items: [
      { href: "/trash", label: "Çöp Kutusu", icon: Trash2 },
      { href: "/audit", label: "Audit Log", icon: History },
      { href: "/backup", label: "Yedekleme", icon: Database },
    ],
  },
];

export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

export const mobileNavItems = allNavItems.filter((i) => i.mobile);
