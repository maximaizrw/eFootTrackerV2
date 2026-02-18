"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Check,
  ChevronsUpDown,
  RotateCcw,
  FlipHorizontal2,
  Shield,
  Crosshair,
  Swords,
  User,
} from "lucide-react";
import type {
  FormationSlot,
  Position,
  PlayerStyle,
  IdealBuild,
} from "@/lib/types";
import { positions, getAvailableStylesForPosition } from "@/lib/types";
import { cn, symmetricalPositionMap } from "@/lib/utils";
import { FootballPitch } from "./football-pitch";
import { formationPresets } from "@/lib/formation-presets";

// --- Zone color helpers ---

type PositionZone = "PT" | "DEF" | "MED" | "ATQ";

function getPositionZone(pos: Position): PositionZone {
  if (pos === "PT") return "PT";
  if (["DFC", "LI", "LD"].includes(pos)) return "DEF";
  if (["MCD", "MC", "MDI", "MDD", "MO"].includes(pos)) return "MED";
  return "ATQ";
}

const zoneConfig: Record<
  PositionZone,
  { bg: string; border: string; ring: string; label: string }
> = {
  PT: {
    bg: "bg-emerald-500",
    border: "border-emerald-300",
    ring: "ring-emerald-400/60",
    label: "PT",
  },
  DEF: {
    bg: "bg-blue-500",
    border: "border-blue-300",
    ring: "ring-blue-400/60",
    label: "DEF",
  },
  MED: {
    bg: "bg-amber-500",
    border: "border-amber-300",
    ring: "ring-amber-400/60",
    label: "MED",
  },
  ATQ: {
    bg: "bg-red-500",
    border: "border-red-300",
    ring: "ring-red-400/60",
    label: "ATQ",
  },
};

// --- Zone color dot for popover preview ---
function ZoneColorDot({ position }: { position: Position }) {
  const zone = getPositionZone(position);
  const config = zoneConfig[zone];
  return (
    <span
      className={cn("inline-block w-2.5 h-2.5 rounded-full", config.bg)}
      aria-hidden="true"
    />
  );
}

// --- Types ---

type VisualFormationEditorProps = {
  value: FormationSlot[];
  onChange: (value: FormationSlot[]) => void;
  idealBuilds: IdealBuild[];
};

// --- PlayerToken ---

const PlayerToken = ({
  slot,
  index,
  onSlotChange,
  style,
  isSelected,
  onPointerDown,
  idealBuilds,
}: {
  slot: FormationSlot;
  index: number;
  onSlotChange: (newSlot: FormationSlot) => void;
  style: React.CSSProperties;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  idealBuilds: IdealBuild[];
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);

  const zone = getPositionZone(slot.position);
  const config = zoneConfig[zone];

  const handleStyleToggle = (styleToToggle: PlayerStyle) => {
    const currentValues = slot.styles || [];
    const isAlreadySelected = currentValues.includes(styleToToggle);
    const newValues = isAlreadySelected
      ? currentValues.filter((s) => s !== styleToToggle)
      : [...currentValues, styleToToggle];
    onSlotChange({ ...slot, styles: newValues, profileName: undefined });
  };

  const handlePositionChange = (newPos: Position) => {
    onSlotChange({
      ...slot,
      position: newPos,
      styles: [],
      profileName: undefined,
    });
  };

  const availableProfiles = React.useMemo(() => {
    if (!idealBuilds) return [];
    const archetype = symmetricalPositionMap[slot.position];
    const stylesToSearch =
      slot.styles && slot.styles.length > 0 ? slot.styles : ["Ninguno"];
    const profiles = new Set<string>();
    idealBuilds.forEach((b) => {
      const posMatch =
        b.position === slot.position ||
        (archetype && b.position === archetype);
      const styleMatch = stylesToSearch.includes(b.style);
      if (posMatch && styleMatch && b.profileName) {
        profiles.add(b.profileName);
      }
    });
    return Array.from(profiles).sort();
  }, [slot.position, slot.styles, idealBuilds]);

  const displayPosition = slot.position;
  const availableStyles: PlayerStyle[] = [
    "Ninguno",
    ...getAvailableStylesForPosition(slot.position, false),
  ];
  const hasStyles = slot.styles && slot.styles.length > 0;
  const hasProfile = !!slot.profileName;

  return (
    <div
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 select-none touch-none",
        "transition-transform duration-150",
        isSelected && "z-20 scale-110",
        !isSelected && "z-10"
      )}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* Main token */}
      <div
        className={cn(
          "relative w-11 h-11 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center cursor-grab",
          "border-2 shadow-lg transition-all duration-200",
          config.bg,
          config.border,
          "hover:brightness-110 hover:shadow-xl",
          isSelected &&
            `${config.ring} ring-4 cursor-grabbing shadow-2xl brightness-110`
        )}
        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
      >
        {/* Player number */}
        <span className="text-[9px] sm:text-[10px] font-medium text-white/70 leading-none">
          {index + 1}
        </span>
        {/* Position label */}
        <span className="font-bold text-xs sm:text-sm text-white leading-none">
          {displayPosition}
        </span>

        {/* Config button */}
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center",
                "bg-background/90 border border-border shadow-md backdrop-blur-sm",
                "hover:bg-accent hover:text-accent-foreground transition-colors",
                "text-foreground/70"
              )}
              onClick={(e) => {
                e.stopPropagation();
                setIsPopoverOpen(true);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Configurar posicion"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="sm:w-3 sm:h-3"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-72 p-0"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            side="right"
            align="start"
          >
            <div className="p-4 space-y-4">
              {/* Position selector with zone color preview */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ZoneColorDot position={slot.position} />
                  Posicion
                </label>
                <Select
                  value={slot.position}
                  onValueChange={(newPos) =>
                    handlePositionChange(newPos as Position)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos} value={pos}>
                        <span className="flex items-center gap-2">
                          <ZoneColorDot position={pos} />
                          {pos}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Styles as chip toggles */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Estilos de Juego
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableStyles.map((s) => {
                    const isActive = slot.styles?.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleStyleToggle(s)}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors border",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary/50 text-secondary-foreground border-border hover:bg-secondary"
                        )}
                      >
                        {isActive && <Check className="w-3 h-3" />}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Collapsible tactical profile */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Perfil Tactico
                  </span>
                  <ChevronsUpDown className={cn("w-3.5 h-3.5 transition-transform", isProfileOpen && "rotate-180")} />
                </button>
                {isProfileOpen && (
                  <div className="pt-2">
                    <Select
                      value={slot.profileName || "General"}
                      onValueChange={(val) =>
                        onSlotChange({
                          ...slot,
                          profileName: val === "General" ? undefined : val,
                        })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecciona perfil..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">
                          General (Automatico)
                        </SelectItem>
                        {availableProfiles.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Style/Profile indicators below token */}
      {(hasStyles || hasProfile) && (
        <div className="flex items-center gap-0.5 max-w-[60px] sm:max-w-[72px]">
          {hasStyles && (
            <span className="truncate text-[8px] sm:text-[9px] font-medium text-white/80 bg-black/40 px-1 py-px rounded backdrop-blur-sm">
              {slot.styles!.length === 1
                ? slot.styles![0].substring(0, 8)
                : `${slot.styles!.length} estilos`}
            </span>
          )}
          {hasProfile && (
            <span className="text-[8px] sm:text-[9px] font-medium text-white/80 bg-black/40 px-1 py-px rounded backdrop-blur-sm">
              {slot.profileName!.substring(0, 6)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// --- Zone Counter ---

function ZoneCounter({ slots }: { slots: FormationSlot[] }) {
  const counts = React.useMemo(() => {
    const c = { PT: 0, DEF: 0, MED: 0, ATQ: 0 };
    slots.forEach((s) => {
      const zone = getPositionZone(s.position);
      c[zone]++;
    });
    return c;
  }, [slots]);

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-muted-foreground">{counts.PT}</span>
      </span>
      <span className="flex items-center gap-1">
        <Shield className="w-3 h-3 text-blue-500" />
        <span className="text-muted-foreground">{counts.DEF}</span>
      </span>
      <span className="flex items-center gap-1">
        <Crosshair className="w-3 h-3 text-amber-500" />
        <span className="text-muted-foreground">{counts.MED}</span>
      </span>
      <span className="flex items-center gap-1">
        <Swords className="w-3 h-3 text-red-500" />
        <span className="text-muted-foreground">{counts.ATQ}</span>
      </span>
      <span
        className={cn(
          "ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
          slots.length === 11
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-destructive/10 text-destructive"
        )}
      >
        {slots.length}/11
      </span>
    </div>
  );
}

// --- Main Editor ---

export function VisualFormationEditor({
  value,
  onChange,
  idealBuilds,
}: VisualFormationEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [movingTokenIndex, setMovingTokenIndex] = React.useState<number | null>(
    null
  );

  // Unified pointer handler (works for mouse + touch)
  const handlePointerMove = React.useCallback(
    (e: PointerEvent) => {
      if (movingTokenIndex === null) return;

      const fieldRect = editorRef.current?.getBoundingClientRect();
      if (!fieldRect) return;

      const x = e.clientX - fieldRect.left;
      const y = e.clientY - fieldRect.top;

      let leftPercent = (x / fieldRect.width) * 100;
      let topPercent = (y / fieldRect.height) * 100;

      leftPercent = Math.max(3, Math.min(97, leftPercent));
      topPercent = Math.max(3, Math.min(97, topPercent));

      onChange(
        value.map((slot, index) =>
          index === movingTokenIndex
            ? { ...slot, left: leftPercent, top: topPercent }
            : slot
        )
      );
    },
    [movingTokenIndex, onChange, value]
  );

  const handlePointerUp = React.useCallback(() => {
    setMovingTokenIndex(null);
  }, []);

  React.useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const handleTokenPointerDown = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    // Capture pointer for reliable touch tracking
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setMovingTokenIndex(index);
  };

  const handleSlotChange = (index: number, newSlot: FormationSlot) => {
    const newSlots = [...value];
    newSlots[index] = newSlot;
    onChange(newSlots);
  };

  // Reset to default positions based on current slot positions
  const handleReset = () => {
    const currentPositions = value.map((s) => s.position).join(",");
    const matchingPreset = formationPresets.find(
      (p) => p.slots.map((s) => s.position).join(",") === currentPositions
    );
    if (matchingPreset) {
      onChange(
        value.map((slot, i) => ({
          ...slot,
          top: matchingPreset.slots[i].top,
          left: matchingPreset.slots[i].left,
        }))
      );
    }
  };

  // Mirror positions horizontally
  const handleMirror = () => {
    onChange(
      value.map((slot) => ({
        ...slot,
        left: slot.left !== undefined ? 100 - slot.left : 50,
      }))
    );
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <ZoneCounter slots={value} />
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMirror}
            className="h-7 px-2 text-xs gap-1"
          >
            <FlipHorizontal2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Espejo</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2 text-xs gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Resetear</span>
          </Button>
        </div>
      </div>

      {/* Pitch */}
      <FootballPitch
        ref={editorRef}
        showZoneLabels
        className={cn(
          movingTokenIndex !== null && "cursor-grabbing",
          "formation-editor-pitch"
        )}
      >
        {value.map((slot, index) => {
          const tokenStyle: React.CSSProperties = {
            top: `${slot.top || 50}%`,
            left: `${slot.left || 50}%`,
          };
          return (
            <PlayerToken
              key={index}
              slot={slot}
              index={index}
              onSlotChange={(newSlot) => handleSlotChange(index, newSlot)}
              style={tokenStyle}
              isSelected={movingTokenIndex === index}
              onPointerDown={(e) => handleTokenPointerDown(e, index)}
              idealBuilds={idealBuilds}
            />
          );
        })}
      </FootballPitch>
    </div>
  );
}
