export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-bg2">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white via-bg2 to-bg3" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,rgba(15,76,129,0.06),transparent_70%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_40%_at_100%_100%,rgba(245,158,11,0.04),transparent_70%)]" />
      {children}
    </div>
  );
}
