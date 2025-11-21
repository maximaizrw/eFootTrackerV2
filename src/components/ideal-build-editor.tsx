
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
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
import { positions, getAvailableStylesForPosition } from "@/lib/types";
import { PlayerStatsEditor } from "./player-stats-editor";
import { ScrollArea } from "./ui/scroll-area";

type IdealBuildEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBuilds: IdealBuilds;
  onSave: (builds: IdealBuilds) => void;
};

// Simplified positions for the UI
const buildPositions = [
  { label: 'PT', value: 'PT' },
  { label: 'DFC', value: 'DFC' },
  { label: 'Laterales', value: 'Laterales' },
  { label: 'MCD', value: 'MCD' },
  { label: 'MC', value: 'MC' },
  { label: 'Interiores', value: 'Interiores' },
  { label: 'MO', value: 'MO' },
  { label: 'Extremos', value: 'Extremos' },
  { label: 'SD', value: 'SD' },
  { label: 'DC', value: 'DC' },
];

const positionMap: Record<string, Position[]> = {
  'PT': ['PT'],
  'DFC': ['DFC'],
  'Laterales': ['LI', 'LD'],
  'MCD': ['MCD'],
  'MC': ['MC'],
  'Interiores': ['MDI', 'MDD'],
  'MO': ['MO'],
  'Extremos': ['EXI', 'EXD'],
  'SD': ['SD'],
  'DC': ['DC'],
};

export function IdealBuildEditor({ open, onOpenChange, initialBuilds, onSave }: IdealBuildEditorProps) {
  const [selectedBuildPosition, setSelectedBuildPosition] = React.useState<string>("DC");
  const [selectedStyle, setSelectedStyle] = React.useState<PlayerStyle>("Cazagoles");
  const [builds, setBuilds] = React.useState<IdealBuilds>(initialBuilds);

  const representativePosition = positionMap[selectedBuildPosition]?.[0] || 'DC';

  const availableStyles = React.useMemo(() => getAvailableStylesForPosition(representativePosition, true), [representativePosition]);
  
  const form = useForm();

  React.useEffect(() => {
    if (open) {
      // Deep copy initialBuilds to avoid mutating the original prop
      setBuilds(JSON.parse(JSON.stringify(initialBuilds)));
    }
  }, [open, initialBuilds]);

  React.useEffect(() => {
    if (!availableStyles.includes(selectedStyle)) {
      setSelectedStyle(availableStyles[0] || "Ninguno");
    }
  }, [availableStyles, selectedStyle]);
  

  const onSubmit = () => {
    onSave(builds);
    onOpenChange(false);
  };
  
  const handleBuildChange = (newBuild: PlayerBuild) => {
    setBuilds(prevBuilds => {
        const newBuildsState = { ...prevBuilds };
        const targetPositions = positionMap[selectedBuildPosition];

        targetPositions.forEach(pos => {
            if (!newBuildsState[pos]) {
                newBuildsState[pos] = {};
            }
            newBuildsState[pos][selectedStyle] = newBuild.stats;
        });

        return newBuildsState;
    });
  };

  const currentBuild = builds[representativePosition]?.[selectedStyle] || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editor de "Builds" Ideales</DialogTitle>
          <DialogDescription>
            Configura la "build" ideal para cada combinación de posición y estilo de juego. Los cambios en posiciones simétricas (ej. Laterales) se aplicarán a ambos lados.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
            <div className="flex-shrink-0 mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Posición</label>
                <Select value={selectedBuildPosition} onValueChange={pos => setSelectedBuildPosition(pos as string)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una posición" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildPositions.map(pos => <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
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
            </div>
            
            <div className="flex-grow overflow-hidden">
                <ScrollArea className="h-full pr-6">
                    <PlayerStatsEditor
                      playerBuild={{stats: currentBuild, progression: {}}}
                      onBuildChange={handleBuildChange}
                    />
                </ScrollArea>
            </div>

            <DialogFooter className="flex-shrink-0 bg-background/95 py-4 border-t -mx-6 px-6 mt-4">
              <Button type="submit">Guardar Todas las Builds</Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}
