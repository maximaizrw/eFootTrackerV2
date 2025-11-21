
"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import type { Position, PlayerStyle, IdealBuilds, PlayerBuild } from "@/lib/types";
import { getAvailableStylesForPosition } from "@/lib/types";
import { PlayerStatsEditor } from "./player-stats-editor";
import { ScrollArea } from "./ui/scroll-area";
import { getPositionGroup, positionGroups } from "@/lib/utils";


type PositionIdealBuildEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: Position;
  initialBuilds: IdealBuilds;
  onSave: (position: Position, buildsForPosition: IdealBuilds[Position]) => void;
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
  const relevantPositions = React.useMemo(() => positionGroups[positionGroup], [positionGroup]);
  const availableStyles = React.useMemo(() => getAvailableStylesForPosition(position, true), [position]);
  
  const [builds, setBuilds] = React.useState<IdealBuilds[Position]>({});

  React.useEffect(() => {
    if (open) {
        const representativePosition = relevantPositions[0];
        const styles = getAvailableStylesForPosition(representativePosition, true);
        const initialFilteredBuilds = initialBuilds[representativePosition] || {};
        
        const newBuilds: IdealBuilds[Position] = {};
        for(const style of styles) {
            newBuilds[style] = initialFilteredBuilds[style] || {};
        }

        setBuilds(newBuilds);
        
        if (styles.length > 0) {
            setSelectedStyle(styles[0]);
        }
    }
  }, [open, position, initialBuilds, relevantPositions]);
  
  React.useEffect(() => {
    if (!availableStyles.includes(selectedStyle) && availableStyles.length > 0) {
      setSelectedStyle(availableStyles[0]);
    }
  }, [availableStyles, selectedStyle]);
  

  const onSubmit = () => {
    onSave(position, builds);
    onOpenChange(false);
  };
  
  const handleBuildChange = (newBuild: PlayerBuild) => {
    setBuilds(prevBuilds => ({
      ...prevBuilds,
      [selectedStyle]: newBuild.stats,
    }));
  };

  const currentBuildStats = builds[selectedStyle] || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editor de Builds Ideales para {positionGroup}</DialogTitle>
          <DialogDescription>
            Configura la "build" ideal para cada estilo de juego de esta posición. Los cambios se aplicarán a todas las posiciones del grupo ({relevantPositions.join(', ')}).
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

    