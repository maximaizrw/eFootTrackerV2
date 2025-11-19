
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
import type { Position, IdealBuilds, PlayerAttribute, StatGroup } from "@/lib/types";
import { attributeGroups } from "@/lib/utils";

type IdealBuildEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: Position;
  idealBuilds: IdealBuilds;
  onIdealBuildsChange: (builds: IdealBuilds) => void;
};

export function IdealBuildEditor({
  open,
  onOpenChange,
  position,
  idealBuilds,
  onIdealBuildsChange,
}: IdealBuildEditorProps) {
  const [currentBuild, setCurrentBuild] = React.useState(idealBuilds[position] || {});

  React.useEffect(() => {
    setCurrentBuild(idealBuilds[position] || {});
  }, [idealBuilds, position, open]);

  const handleStatChange = (attr: PlayerAttribute, value: string) => {
    const numValue = parseInt(value, 10);
    setCurrentBuild(prev => ({
      ...prev,
      [attr]: isNaN(numValue) ? undefined : numValue,
    }));
  };

  const handleSave = () => {
    onIdealBuildsChange({
      ...idealBuilds,
      [position]: currentBuild,
    });
    onOpenChange(false);
  };
  
  const relevantGroups = Object.keys(attributeGroups) as StatGroup[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar Build Ideal para {position}</DialogTitle>
          <DialogDescription>
            Define las estadísticas objetivo para esta posición. Estos valores se usarán para calcular la puntuación de Afinidad de cada jugador.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
                {relevantGroups.map(group => (
                    <div key={group} className="space-y-3">
                        <h4 className="font-semibold text-primary">{group}</h4>
                        <div className="space-y-2">
                        {attributeGroups[group].map(attr => (
                            <div key={attr} className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor={`ideal-${attr}`} className="text-xs col-span-2 capitalize">
                                    {attr.replace(/([A-Z])/g, ' $1')}
                                </Label>
                                <Input
                                    id={`ideal-${attr}`}
                                    type="number"
                                    min="40"
                                    max="99"
                                    value={currentBuild[attr] || ''}
                                    onChange={(e) => handleStatChange(attr, e.target.value)}
                                    className="h-8 text-center"
                                    placeholder="--"
                                />
                            </div>
                        ))}
                        </div>
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
