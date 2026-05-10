import { cn } from "@/lib/utils";

export function Logo({
  size = 28,
  showText = true,
  className,
  textClassName,
}: {
  size?: number;
  showText?: boolean;
  className?: string;
  textClassName?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showText && (
        <span
          className={cn(
            "font-display font-extrabold tracking-[2px] text-text whitespace-nowrap",
            textClassName
          )}
        >
          GES <span className="text-accent">TAKİP</span>
        </span>
      )}
    </div>
  );
}

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="ges-grad-primary" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#0f4c81" />
          <stop offset="100%" stopColor="#1e6cb3" />
        </linearGradient>
        <linearGradient id="ges-grad-sun" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      {/* Hex outer frame — solid navy */}
      <path
        d="M20 3 L34.5 11 L34.5 29 L20 37 L5.5 29 L5.5 11 Z"
        fill="url(#ges-grad-primary)"
      />
      {/* Inner sun — amber circle */}
      <circle cx="20" cy="20" r="6" fill="url(#ges-grad-sun)" />
      {/* Sun rays */}
      <g stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round">
        <line x1="20" y1="9" x2="20" y2="11.5" />
        <line x1="20" y1="28.5" x2="20" y2="31" />
        <line x1="9" y1="20" x2="11.5" y2="20" />
        <line x1="28.5" y1="20" x2="31" y2="20" />
        <line x1="12.5" y1="12.5" x2="14.3" y2="14.3" />
        <line x1="25.7" y1="25.7" x2="27.5" y2="27.5" />
        <line x1="27.5" y1="12.5" x2="25.7" y2="14.3" />
        <line x1="14.3" y1="25.7" x2="12.5" y2="27.5" />
      </g>
    </svg>
  );
}
