
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
import type { FormationSlot, Position, PlayerStyle } from "@/lib/types";
import { positions, playerStyles } from "@/lib/types";
import { cn, getAvailableStylesForPosition } from "@/lib/utils";

type VisualFormationEditorProps = {
  value: FormationSlot[];
  onChange: (value: FormationSlot[]) => void;
};

const PlayerToken = ({
  slot,
  onSlotChange,
  style,
  isSelected,
  onMouseDown,
}: {
  slot: FormationSlot;
  onSlotChange: (newSlot: FormationSlot) => void;
  style: React.CSSProperties;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const handleStyleToggle = (styleToToggle: PlayerStyle) => {
    const currentValues = slot.styles || [];
    const isSelected = currentValues.includes(styleToToggle);
    const newValues = isSelected
      ? currentValues.filter((s) => s !== styleToToggle)
      : [...currentValues, styleToToggle];
    onSlotChange({ ...slot, styles: newValues });
  };
  
  return (
    <div
        className={cn(
            "absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-grab",
            "bg-primary/90 border-2 border-primary text-primary-foreground shadow-md",
            "hover:bg-primary hover:scale-105",
             isSelected && "ring-4 ring-accent scale-110 z-10 cursor-grabbing shadow-lg"
        )}
        style={{...style, textShadow: '0 1px 2px rgba(0,0,0,0.2)'}}
        onMouseDown={onMouseDown}
    >
      <span className="font-bold text-lg">{slot.position}</span>
      <div className="absolute top-0.5 right-0.5 flex gap-0.5">
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className="p-1 rounded-full bg-background/80 hover:bg-accent backdrop-blur-sm text-foreground hover:text-accent-foreground"
                onClick={(e) => { e.stopPropagation(); setIsPopoverOpen(true); }}
                onMouseDown={(e) => e.stopPropagation()} // Prevent drag from starting here
                aria-label="Configurar posición"
              >
                <Settings className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium">Posición</label>
                    <Select
                      value={slot.position}
                      onValueChange={(newPos) => onSlotChange({ ...slot, position: newPos as Position, styles: [] })}
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
                                      {playerStyles.map((style) => (
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
              </div>
            </PopoverContent>
          </Popover>
      </div>
    </div>
  );
};


export function VisualFormationEditor({ value, onChange }: VisualFormationEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [movingTokenIndex, setMovingTokenIndex] = React.useState<number | null>(null);

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (movingTokenIndex === null) return;

    const fieldRect = editorRef.current?.getBoundingClientRect();
    if (!fieldRect) return;

    // Use movementX/Y for smoother dragging, but fall back to clientX/Y
    const x = e.clientX - fieldRect.left;
    const y = e.clientY - fieldRect.top;
    
    let leftPercent = (x / fieldRect.width) * 100;
    let topPercent = (y / fieldRect.height) * 100;
    
    // Clamp values to stay within the field
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
    // Attach listeners to the window to capture mouse events anywhere on the page
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  const handleTokenMouseDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault(); // Prevent text selection during drag
    setMovingTokenIndex(index);
  };

  const handleSlotChange = (index: number, newSlot: FormationSlot) => {
    const newSlots = [...value];
    newSlots[index] = newSlot;
    onChange(newSlots);
  };
  
  return (
    <div 
        ref={editorRef}
        className={cn(
            "relative w-full aspect-video bg-field-gradient rounded-lg border border-primary/20 shadow-inner overflow-hidden",
            movingTokenIndex !== null && "cursor-grabbing"
        )}
    >
      {/* Field markings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 md:w-48 md:h-48 border-2 border-black/10 rounded-full pointer-events-none" />
      <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-px bg-black/10 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-[calc(100%-40px)] md:w-[calc(100%-80px)] border-l-2 border-r-2 border-black/10 pointer-events-none">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 h-14 w-28 md:h-20 md:w-40 border-b-2 border-l-2 border-r-2 border-black/10 rounded-b-lg md:rounded-b-xl pointer-events-none" />
         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-14 w-28 md:h-20 md:w-40 border-t-2 border-l-2 border-r-2 border-black/10 rounded-t-lg md:rounded-t-xl pointer-events-none" />
      </div>

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
            />
        );
      })}
    </div>
  );
}
