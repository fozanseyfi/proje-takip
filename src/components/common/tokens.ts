/**
 * Ortak sayfa şablonları (İletişim, Diğer Platformlar) için bu platformun renk sınıfları.
 * components/common/ klasörü tüm platformlarda BİREBİR aynıdır; yalnızca bu dosya platforma özeldir.
 * — Proje Yönetim Platformu
 */
export const T = {
  fg: "text-text",
  sub: "text-text2",
  faint: "text-text3",
  soft: "bg-bg2",
  soft2: "bg-bg3",
  hoverSoft: "hover:bg-bg2",
  card: "bg-white",
  heroGrad: "from-bg2 via-white to-accent/5",
  toCard: "to-white",
  border: "border-border",
  input: "border-border bg-white",
  btn: "bg-accent text-white hover:bg-accent2",
  btnOutline: "bg-white border border-border2 hover:bg-bg2",
  accentText: "text-accent",
  accentSoft: "border-accent/30 bg-accent/10",
  glow: "bg-accent/10",
} as const;
