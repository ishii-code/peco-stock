import * as React from "react";
import Image from "next/image";

export type PecoLogoSize = "sm" | "md" | "lg";
export type PecoLogoColor = "white" | "primary";

export interface PecoLogoProps {
  size?: PecoLogoSize;
  color?: PecoLogoColor;
  subtitle?: string;
  className?: string;
  priority?: boolean;
}

const LOGO_NATURAL_WIDTH = 1600;
const LOGO_NATURAL_HEIGHT = 597;
const ASPECT = LOGO_NATURAL_WIDTH / LOGO_NATURAL_HEIGHT;

const sizeMap: Record<
  PecoLogoSize,
  { height: number; subtitle: string; gap: string }
> = {
  sm: { height: 24, subtitle: "text-[10px]", gap: "gap-1" },
  md: { height: 32, subtitle: "text-[11px]", gap: "gap-1" },
  lg: { height: 56, subtitle: "text-xs", gap: "gap-1.5" },
};

export function PecoLogo({
  size = "md",
  color = "primary",
  subtitle,
  className = "",
  priority = false,
}: PecoLogoProps) {
  const s = sizeMap[size];
  const renderedWidth = Math.round(s.height * ASPECT);
  const subtitleColor = color === "white" ? "text-white/85" : "text-peco-text-secondary";

  return (
    <div
      className={`inline-flex flex-col leading-none ${s.gap} ${className}`}
      aria-label="PECO 動物病院グループ"
    >
      <Image
        src="/peco-logo.png"
        alt="PECO 動物病院グループ"
        width={LOGO_NATURAL_WIDTH}
        height={LOGO_NATURAL_HEIGHT}
        priority={priority}
        sizes={`${renderedWidth}px`}
        className="block w-auto"
        style={{
          height: `${s.height}px`,
          width: "auto",
          filter: color === "white" ? "brightness(0) invert(1)" : undefined,
        }}
      />
      {subtitle ? (
        <span
          className={`font-semibold tracking-wide uppercase ${s.subtitle} ${subtitleColor}`}
        >
          {subtitle}
        </span>
      ) : null}
    </div>
  );
}

export default PecoLogo;
