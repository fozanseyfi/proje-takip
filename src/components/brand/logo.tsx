import { cn } from "@/lib/utils";

export function Logo({
  size = 28,
  showText = true,
  className,
  textClassName,
  compact = false,
}: {
  size?: number;
  showText?: boolean;
  className?: string;
  textClassName?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showText && (
        <div className="leading-tight">
          <div className={cn("font-display font-extrabold text-text tracking-tight", textClassName)}>
            GES <span className="text-accent">Takip</span>
          </div>
          {!compact && (
            <div className="text-[10px] text-text3 font-medium tracking-wider uppercase mt-0.5">
              Proje Yönetim Platformu
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-xl shadow-sm", className)}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
      }}
    >
      <SunIcon size={Math.round(size * 0.58)} />
    </span>
  );
}

function SunIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <circle cx="12" cy="12" r="4" fill="#fbbf24" stroke="#fbbf24" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
    </svg>
  );
}
