
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Position, PlayerStyle, IdealBuilds, PlayerBuild, PlayerStatsBuild, PositionGroupName } from "@/lib/types";
import { positionGroups, getPositionGroup } from "@/lib/types";
import { getAvailableStylesForPosition } from "@/lib/utils";
import { PlayerStatsEditor } from "./player-stats-editor";
import { ScrollArea } from "./ui/scroll-area";


type PositionIdealBuildEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: Position;
  initialBuilds: IdealBuilds;
  onSave: (groupName: PositionGroupName, buildsForGroup: IdealBuilds[Position]) => void;
};

export function PositionIdealBuildEditor({ 
    open, 
    onOpenChange, 
    position, 
    initialBuilds, 
    onSave 
}: PositionIdealBuildEditorProps) {
  const [selectedStyle, setSelectedStyle] = React.useState<PlayerStyle>("Ninguno");
  
  const positionGroup = React.useMemo(() => getPositionGroup(position), [position]);
  const relevantPositions = React.useMemo(() => {
    const group = getPositionGroup(position);
    const positions = (positionGroups as any)[group] || [position];
    return positions.join(', ');
  }, [position]);
  const availableStyles = React.useMemo(() => getAvailableStylesForPosition(position, true), [position]);
  
  const [builds, setBuilds] = React.useState<IdealBuilds[Position]>({});

  React.useEffect(() => {
    if (open) {
        const currentGroup = getPositionGroup(position);
        const positionsInGroup = positionGroups[currentGroup];

        const mergedBuilds = positionsInGroup.reduce<IdealBuilds[Position]>((acc, pos) => {
          const buildsForPos = initialBuilds[pos] || {};

          for (const styleKey of Object.keys(buildsForPos) as PlayerStyle[]) {
            const stats = buildsForPos[styleKey];

            // Reutilizamos el primer set de stats no vacío que encontremos
            // para cada estilo del grupo, evitando perder builds guardadas
            // en cualquiera de las posiciones (p. ej., LD o LI).
            if (!acc[styleKey] || Object.keys(acc[styleKey] ?? {}).length === 0) {
              acc[styleKey] = stats ?? {};
            }
          }

          return acc;
        }, {} as IdealBuilds[Position]);

        setBuilds(mergedBuilds);

        if (availableStyles.length > 0 && !availableStyles.includes(selectedStyle)) {
            setSelectedStyle(availableStyles[0]);
        }
    }
  }, [open, position, initialBuilds, availableStyles, selectedStyle]);
  
  React.useEffect(() => {
    if (open && !availableStyles.includes(selectedStyle) && availableStyles.length > 0) {
      setSelectedStyle(availableStyles[0]);
    }
  }, [open, availableStyles, selectedStyle]);
  

  const onSubmit = () => {
    const groupName = getPositionGroup(position);
    onSave(groupName, builds);
    onOpenChange(false);
  };
  
  const handleBuildChange = (changedBuild: PlayerBuild) => {
    setBuilds(prevBuilds => ({
      ...prevBuilds,
      [selectedStyle]: changedBuild.stats,
    }));
  };

  const currentBuildStats: PlayerStatsBuild = builds[selectedStyle] || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editor de Builds Ideales para {positionGroup}</DialogTitle>
          <DialogDescription>
            Configura la "build" ideal para cada estilo de juego de esta posición. Los cambios se aplicarán a todas las posiciones del grupo ({relevantPositions}).
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow flex flex-col overflow-hidden">
            <div className="flex-shrink-0 mb-4">
                <label className="text-sm font-medium">Estilo de Juego</label>
                 <Select value={selectedStyle} onValueChange={style => setSelectedStyle(style as PlayerStyle)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estilo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStyles.map(style => <SelectItem key={style} value={style}>{style}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
            
            <div className="flex-grow overflow-hidden">
                <ScrollArea className="h-full pr-6">
                    <PlayerStatsEditor
                      playerBuild={{stats: currentBuildStats, progression: {}}}
                      onBuildChange={handleBuildChange}
                    />
                </ScrollArea>
            </div>

            <DialogFooter className="flex-shrink-0 bg-background/95 py-4 border-t -mx-6 px-6 mt-4">
              <Button type="button" onClick={onSubmit}>Guardar Builds de {positionGroup}</Button>
            </DialogFooter>
          </div>
      </DialogContent>
    </Dialog>
  );
}
