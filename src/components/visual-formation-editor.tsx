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
import { Input } from "@/components/ui/input";
import {
  Check,
  RotateCcw,
  FlipHorizontal2,
  Shield,
  Crosshair,
  Swords,
  Ruler,
  MapPin,
  Settings2,
} from "lucide-react";
import type {
  FormationSlot,
  Position,
  PlayerStyle,
} from "@/lib/types";
import { positions, getAvailableStylesForPosition } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FootballPitch } from "./football-pitch";
import { formationPresets } from "@/lib/formation-presets";

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

type VisualFormationEditorProps = {
  value: FormationSlot[];
  onChange: (value: FormationSlot[]) => void;
};

const PlayerToken = ({
  slot,
  index,
  onSlotChange,
  style,
  isSelected,
  onPointerDown,
}: {
  slot: FormationSlot;
  index: number;
  onSlotChange: (newSlot: FormationSlot) => void;
  style: React.CSSProperties;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);

  const zone = getPositionZone(slot.position);
  const config = zoneConfig[zone];

  const handleStyleToggle = (styleToToggle: PlayerStyle) => {
    const currentValues = slot.styles || [];
    const isAlreadySelected = currentValues.includes(styleToToggle);
    const newValues = isAlreadySelected
      ? currentValues.filter((s) => s !== styleToToggle)
      : [...currentValues, styleToToggle];
    onSlotChange({ ...slot, styles: newValues });
  };

  const handlePositionChange = (newPos: Position) => {
    onSlotChange({
      ...slot,
      position: newPos,
      styles: [],
    });
  };

  const displayPosition = slot.position;
  const availableStyles: PlayerStyle[] = [
    "Ninguno",
    ...getAvailableStylesForPosition(slot.position, false),
  ];
  const hasStyles = slot.styles && slot.styles.length > 0;
  const hasAdvanced = !!slot.minHeight || !!slot.secondaryPosition;

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
        <span className="text-[9px] sm:text-[10px] font-medium text-white/70 leading-none">
          {index + 1}
        </span>
        <span className="font-bold text-xs sm:text-sm text-white leading-none">
          {displayPosition}
        </span>

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
              <Settings2 className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-72 p-0 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            side="right"
            align="start"
          >
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ZoneColorDot position={slot.position} />
                  Posicion Principal
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Estilos de Juego Sugeridos</label>
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

              <div>
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1 border-t mt-2 pt-2"
                >
                  <span className="flex items-center gap-1.5">
                    <Settings2 className="w-3.5 h-3.5" />
                    Requisitos Especiales
                  </span>
                  <Settings2 className={cn("w-3.5 h-3.5 transition-transform", isAdvancedOpen && "rotate-180")} />
                </button>
                {isAdvancedOpen && (
                  <div className="pt-2 space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-1.5">
                        <Ruler className="w-3 h-3" /> Altura Minima (cm)
                      </label>
                      <Input
                        type="number"
                        placeholder="Ej: 185"
                        value={slot.minHeight || ""}
                        onChange={(e) =>
                          onSlotChange({
                            ...slot,
                            minHeight: e.target.value ? parseInt(e.target.value, 10) : undefined,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" /> 2ª Posicion Requerida
                      </label>
                      <Select
                        value={slot.secondaryPosition || "none"}
                        onValueChange={(val) =>
                          onSlotChange({
                            ...slot,
                            secondaryPosition: val === "none" ? undefined : (val as Position),
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Ninguna" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Ninguna</SelectItem>
                          {positions.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {(hasStyles || hasAdvanced) && (
        <div className="flex items-center gap-0.5 max-w-[60px] sm:max-w-[72px]">
          {hasStyles && (
            <span className="truncate text-[8px] sm:text-[9px] font-medium text-white/80 bg-black/40 px-1 py-px rounded backdrop-blur-sm">
              {slot.styles![0].substring(0, 4)}
            </span>
          )}
          {hasAdvanced && (
            <span className="text-[8px] sm:text-[9px] font-medium text-white/80 bg-primary/60 px-1 py-px rounded backdrop-blur-sm">
              REQ
            </span>
          )}
        </div>
      )}
    </div>
  );
};

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

export function VisualFormationEditor({
  value,
  onChange,
}: VisualFormationEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [movingTokenIndex, setMovingTokenIndex] = React.useState<number | null>(
    null
  );

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
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setMovingTokenIndex(index);
  };

  const handleSlotChange = (index: number, newSlot: FormationSlot) => {
    const newSlots = [...value];
    newSlots[index] = newSlot;
    onChange(newSlots);
  };

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
            />
          );
        })}
      </FootballPitch>
    </div>
  );
}