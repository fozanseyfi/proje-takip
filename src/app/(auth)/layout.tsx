export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-bg via-bg2 to-bg" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,rgba(0,212,255,0.08),transparent)]" />
      {children}
    </div>
  );
}
