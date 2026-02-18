"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Settings } from "lucide-react";
import type { FormationSlot, Position, PlayerStyle, IdealBuild } from "@/lib/types";
import { positions, getAvailableStylesForPosition } from "@/lib/types";
import { cn, symmetricalPositionMap } from "@/lib/utils";
import { FootballPitch } from "./football-pitch";

type VisualFormationEditorProps = {
  value: FormationSlot[];
  onChange: (value: FormationSlot[]) => void;
  idealBuilds: IdealBuild[];
};

const PlayerToken = ({
  slot,
  onSlotChange,
  style,
  isSelected,
  onMouseDown,
  idealBuilds,
}: {
  slot: FormationSlot;
  onSlotChange: (newSlot: FormationSlot) => void;
  style: React.CSSProperties;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  idealBuilds: IdealBuild[];
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const handleStyleToggle = (styleToToggle: PlayerStyle) => {
    const currentValues = slot.styles || [];
    const isAlreadySelected = currentValues.includes(styleToToggle);
    const newValues = isAlreadySelected
      ? currentValues.filter((s) => s !== styleToToggle)
      : [...currentValues, styleToToggle];
    onSlotChange({ ...slot, styles: newValues, profileName: undefined });
  };
  
  const handlePositionChange = (newPos: Position) => {
    onSlotChange({ ...slot, position: newPos, styles: [], profileName: undefined });
  };

  const availableProfiles = React.useMemo(() => {
    if (!idealBuilds) return [];
    const archetype = symmetricalPositionMap[slot.position];
    
    // If slot.styles is empty or has 'Ninguno', we check for those.
    const stylesToSearch = slot.styles && slot.styles.length > 0 ? slot.styles : ['Ninguno'];

    const profiles = new Set<string>();
    idealBuilds.forEach(b => {
        const posMatch = b.position === slot.position || (archetype && b.position === archetype);
        const styleMatch = stylesToSearch.includes(b.style);
        if (posMatch && styleMatch && b.profileName) {
            profiles.add(b.profileName);
        }
    });
    
    return Array.from(profiles).sort();
  }, [slot.position, slot.styles, idealBuilds]);

  const displayPosition = slot.position;
  const availableStyles: PlayerStyle[] = ['Ninguno', ...getAvailableStylesForPosition(slot.position, false)];
  
  return (
    <div
        className={cn(
            "absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-grab",
            "bg-primary/80 border-2 border-primary text-primary-foreground shadow-lg",
            "hover:bg-primary hover:scale-105",
             isSelected && "ring-4 ring-accent scale-110 z-10 cursor-grabbing"
        )}
        style={{...style, textShadow: '0 1px 2px rgba(0,0,0,0.4)'}}
        onMouseDown={onMouseDown}
    >
      <span className="font-bold text-base">{displayPosition}</span>
      <div className="absolute top-0.5 right-0.5 flex gap-0.5">
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className="p-1 rounded-full bg-background/60 hover:bg-accent backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); setIsPopoverOpen(true); }}
                onMouseDown={(e) => e.stopPropagation()} 
                aria-label="Configurar posición"
              >
                <Settings className="h-3 w-3 text-primary-foreground/80" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium">Posición</label>
                    <Select
                      value={slot.position}
                      onValueChange={(newPos) => handlePositionChange(newPos as Position)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map((pos) => (
                          <SelectItem key={pos} value={pos}>
                            {pos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                      <label className="text-sm font-medium mb-2 block">Estilos de Juego (Opcional)</label>
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between h-auto"
                              >
                                  <div className="flex gap-1 flex-wrap">
                                      {slot.styles && slot.styles.length > 0 ? (
                                          slot.styles.map((style) => (
                                              <Badge variant="secondary" key={style} className="mr-1">
                                                  {style}
                                              </Badge>
                                          ))
                                      ) : (
                                          <span className="text-muted-foreground">Cualquiera</span>
                                      )}
                                  </div>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                  <CommandInput placeholder="Buscar estilo..." />
                                  <CommandList>
                                      <CommandEmpty>No se encontró el estilo.</CommandEmpty>
                                      {availableStyles.map((style) => (
                                          <CommandItem
                                              key={style}
                                              value={style}
                                              onSelect={() => handleStyleToggle(style)}
                                          >
                                              <Check
                                                  className={cn(
                                                      "mr-2 h-4 w-4",
                                                      slot.styles?.includes(style) ? "opacity-100" : "opacity-0"
                                                  )}
                                              />
                                              {style}
                                          </CommandItem>
                                      ))}
                                  </CommandList>
                              </Command>
                          </PopoverContent>
                      </Popover>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Perfil Táctico</label>
                    <Select 
                        value={slot.profileName || 'General'} 
                        onValueChange={(val) => onSlotChange({ ...slot, profileName: val === 'General' ? undefined : val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona perfil..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="General">General (Automático)</SelectItem>
                            {availableProfiles.map(p => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
              </div>
            </PopoverContent>
          </Popover>
      </div>
    </div>
  );
};


export function VisualFormationEditor({ value, onChange, idealBuilds }: VisualFormationEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [movingTokenIndex, setMovingTokenIndex] = React.useState<number | null>(null);

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (movingTokenIndex === null) return;

    const fieldRect = editorRef.current?.getBoundingClientRect();
    if (!fieldRect) return;

    const x = e.clientX - fieldRect.left;
    const y = e.clientY - fieldRect.top;
    
    let leftPercent = (x / fieldRect.width) * 100;
    let topPercent = (y / fieldRect.height) * 100;
    
    leftPercent = Math.max(0, Math.min(100, leftPercent));
    topPercent = Math.max(0, Math.min(100, topPercent));

    onChange(
      value.map((slot, index) => 
        index === movingTokenIndex 
          ? { ...slot, left: leftPercent, top: topPercent } 
          : slot
      )
    );
  }, [movingTokenIndex, onChange, value]);
  
  const handleMouseUp = React.useCallback(() => {
    setMovingTokenIndex(null);
  }, []);

  React.useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  const handleTokenMouseDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setMovingTokenIndex(index);
  };

  const handleSlotChange = (index: number, newSlot: FormationSlot) => {
    const newSlots = [...value];
    newSlots[index] = newSlot;
    onChange(newSlots);
  };
  
  return (
    <FootballPitch
        ref={editorRef}
        className={cn(movingTokenIndex !== null && "cursor-grabbing")}
    >
      {value.map((slot, index) => {
        const style: React.CSSProperties = {
            top: `${slot.top || 50}%`,
            left: `${slot.left || 50}%`,
        };
        return (
            <PlayerToken
              key={index}
              slot={slot}
              onSlotChange={(newSlot) => handleSlotChange(index, newSlot)}
              style={style}
              isSelected={movingTokenIndex === index}
              onMouseDown={(e) => handleTokenMouseDown(e, index)}
              idealBuilds={idealBuilds}
            />
        );
      })}
    </FootballPitch>
  );
}