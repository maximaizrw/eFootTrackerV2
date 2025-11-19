
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import type { Position, PlayerAttribute } from "@/lib/types";
import { getRelevantAttributesForPosition, normalizeText } from "@/lib/utils";

type IdealBuildEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: Position;
  idealBuild: Partial<Record<PlayerAttribute, number>>;
  onSave: (position: Position, newBuild: Partial<Record<PlayerAttribute, number>>) => void;
  idealBuilds: Record<Position, Partial<Record<PlayerAttribute, number>>>;
};

export function IdealBuildEditor({ open, onOpenChange, position, idealBuild, onSave, idealBuilds }: IdealBuildEditorProps) {
  const [build, setBuild] = React.useState(idealBuild);

  React.useEffect(() => {
    setBuild(idealBuild);
  }, [idealBuild, open]);

  const relevantAttributes = getRelevantAttributesForPosition(position, idealBuilds);
  
  const handleStatChange = (attribute: PlayerAttribute, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 99) {
        setBuild(prev => ({ ...prev, [attribute]: numValue }));
    } else if (value === '') {
        setBuild(prev => {
            const newBuild = { ...prev };
            delete newBuild[attribute];
            return newBuild;
        });
    }
  };
  
  const handleSave = () => {
    onSave(position, build);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Build Ideal para {position}</DialogTitle>
          <DialogDescription>
            Define las estadísticas objetivo para esta posición. Estos valores se usarán para calcular la afinidad de tus jugadores.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 pr-6">
            <div className="space-y-3">
            {relevantAttributes.map(attr => (
                <div key={attr} className="grid grid-cols-3 items-center gap-2">
                    <Label htmlFor={attr} className="col-span-2 text-sm capitalize truncate text-muted-foreground">{normalizeText(attr).replace(/([A-Z])/g, ' $1')}</Label>
                    <Input
                        id={attr}
                        type="number"
                        min="0"
                        max="99"
                        value={build[attr] || ''}
                        onChange={(e) => handleStatChange(attr, e.target.value)}
                        className="h-9 text-center font-bold"
                        placeholder="-"
                    />
                </div>
            ))}
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={handleSave}>Guardar Build Ideal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
