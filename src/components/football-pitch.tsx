import * as React from "react"
import { cn } from "@/lib/utils"

export interface FootballPitchProps extends React.HTMLAttributes<HTMLDivElement> {
  showZoneLabels?: boolean;
}

const FootballPitch = React.forwardRef<HTMLDivElement, FootballPitchProps>(
  ({ className, children, showZoneLabels = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full aspect-[4/3] sm:aspect-video rounded-xl overflow-hidden border border-[hsl(145,40%,30%)] shadow-[inset_0_0_40px_rgba(0,0,0,0.15)]",
          className
        )}
        {...props}
      >
        {/* Pitch Background SVG */}
        <svg
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          <defs>
            {/* Realistic grass stripes */}
            <linearGradient id="grass-stripes" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2d8a4e" />
              <stop offset="8.33%" stopColor="#2d8a4e" />
              <stop offset="8.33%" stopColor="#267a44" />
              <stop offset="16.66%" stopColor="#267a44" />
              <stop offset="16.66%" stopColor="#2d8a4e" />
              <stop offset="25%" stopColor="#2d8a4e" />
              <stop offset="25%" stopColor="#267a44" />
              <stop offset="33.33%" stopColor="#267a44" />
              <stop offset="33.33%" stopColor="#2d8a4e" />
              <stop offset="41.66%" stopColor="#2d8a4e" />
              <stop offset="41.66%" stopColor="#267a44" />
              <stop offset="50%" stopColor="#267a44" />
              <stop offset="50%" stopColor="#2d8a4e" />
              <stop offset="58.33%" stopColor="#2d8a4e" />
              <stop offset="58.33%" stopColor="#267a44" />
              <stop offset="66.66%" stopColor="#267a44" />
              <stop offset="66.66%" stopColor="#2d8a4e" />
              <stop offset="75%" stopColor="#2d8a4e" />
              <stop offset="75%" stopColor="#267a44" />
              <stop offset="83.33%" stopColor="#267a44" />
              <stop offset="83.33%" stopColor="#2d8a4e" />
              <stop offset="91.66%" stopColor="#2d8a4e" />
              <stop offset="91.66%" stopColor="#267a44" />
              <stop offset="100%" stopColor="#267a44" />
            </linearGradient>
            {/* Subtle vignette */}
            <radialGradient
              id="pitch-vignette"
              cx="50%"
              cy="50%"
              r="70%"
              fx="50%"
              fy="50%"
            >
              <stop offset="0%" stopColor="transparent" stopOpacity={0} />
              <stop offset="100%" stopColor="#000" stopOpacity={0.15} />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grass-stripes)" />
          <rect width="100%" height="100%" fill="url(#pitch-vignette)" />
        </svg>

        {/* Field Markings */}
        <div className="absolute inset-0 pointer-events-none m-2 md:m-4">
          {/* Outer boundary */}
          <div className="absolute inset-0 border-2 border-white/40 rounded-sm" />

          {/* Center Line */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/35" />
          {/* Center Circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[18%] aspect-square rounded-full border-2 border-white/35" />
          {/* Center Spot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/50 rounded-full" />

          {/* Top Penalty Box */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[18%] w-[45%] border-b-2 border-x-2 border-white/35 rounded-b-sm" />
          {/* Top Goal Area */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[8%] w-[25%] border-b-2 border-x-2 border-white/35 rounded-b-sm" />
          {/* Top Penalty Spot */}
          <div className="absolute top-[12%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/40 rounded-full" />
          {/* Top Arc */}
          <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[15%] aspect-[2/1] border-b-2 border-white/35 rounded-b-full -mt-[1px]" />
          {/* Top Goal Line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[1.5%] w-[12%] border-b-2 border-x-2 border-white/25 rounded-b-sm" />

          {/* Bottom Penalty Box */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[18%] w-[45%] border-t-2 border-x-2 border-white/35 rounded-t-sm" />
          {/* Bottom Goal Area */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[8%] w-[25%] border-t-2 border-x-2 border-white/35 rounded-t-sm" />
          {/* Bottom Penalty Spot */}
          <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-white/40 rounded-full" />
          {/* Bottom Arc */}
          <div className="absolute bottom-[18%] left-1/2 -translate-x-1/2 w-[15%] aspect-[2/1] border-t-2 border-white/35 rounded-t-full -mb-[1px]" />
          {/* Bottom Goal Line */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[1.5%] w-[12%] border-t-2 border-x-2 border-white/25 rounded-t-sm" />

          {/* Corner arcs */}
          <div className="absolute top-0 left-0 w-[3%] aspect-square border-b-2 border-r-2 border-white/25 rounded-br-full" />
          <div className="absolute top-0 right-0 w-[3%] aspect-square border-b-2 border-l-2 border-white/25 rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-[3%] aspect-square border-t-2 border-r-2 border-white/25 rounded-tr-full" />
          <div className="absolute bottom-0 right-0 w-[3%] aspect-square border-t-2 border-l-2 border-white/25 rounded-tl-full" />
        </div>

        {/* Zone Labels (optional) */}
        {showZoneLabels && (
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-[8%] right-2 md:right-3">
              <span className="text-[10px] md:text-xs font-semibold text-white/20 tracking-widest uppercase">
                ATQ
              </span>
            </div>
            <div className="absolute top-[45%] right-2 md:right-3 -translate-y-1/2">
              <span className="text-[10px] md:text-xs font-semibold text-white/20 tracking-widest uppercase">
                MED
              </span>
            </div>
            <div className="absolute bottom-[8%] right-2 md:right-3">
              <span className="text-[10px] md:text-xs font-semibold text-white/20 tracking-widest uppercase">
                DEF
              </span>
            </div>
          </div>
        )}

        {/* Children (Player tokens) */}
        <div className="relative w-full h-full">{children}</div>
      </div>
    );
  }
);
FootballPitch.displayName = "FootballPitch";

export { FootballPitch };
