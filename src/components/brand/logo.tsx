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
            "font-display font-extrabold tracking-[3px] text-accent text-glow-cyan whitespace-nowrap",
            textClassName
          )}
        >
          GES TAKİP
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
        <linearGradient id="ges-grad-1" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#3d8ef0" />
        </linearGradient>
        <linearGradient id="ges-grad-2" x1="0" y1="40" x2="40" y2="0">
          <stop offset="0%" stopColor="#00e676" stopOpacity="0.0" />
          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="ges-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Glow background */}
      <circle cx="20" cy="20" r="20" fill="url(#ges-glow)" />
      {/* Outer hex frame */}
      <path
        d="M20 4 L34 12 L34 28 L20 36 L6 28 L6 12 Z"
        stroke="url(#ges-grad-1)"
        strokeWidth="1.6"
        fill="rgba(0, 212, 255, 0.06)"
      />
      {/* Inner sun */}
      <circle cx="20" cy="20" r="4.5" fill="url(#ges-grad-1)" />
      {/* Sun rays — 4 cardinal */}
      <g stroke="url(#ges-grad-1)" strokeWidth="1.6" strokeLinecap="round">
        <line x1="20" y1="10" x2="20" y2="13" />
        <line x1="20" y1="27" x2="20" y2="30" />
        <line x1="10" y1="20" x2="13" y2="20" />
        <line x1="27" y1="20" x2="30" y2="20" />
      </g>
      {/* Solar panel grid lines */}
      <g stroke="url(#ges-grad-2)" strokeWidth="0.7" opacity="0.6">
        <line x1="6" y1="20" x2="34" y2="20" />
        <line x1="20" y1="4" x2="20" y2="36" />
      </g>
    </svg>
  );
}
