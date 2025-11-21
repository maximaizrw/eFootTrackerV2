
"use client";

import * as React from "react";
import type { Position, FlatPlayer, PlayerStatsBuild, IdealBuilds, PlayerBuild } from "@/lib/types";
import { getPositionGroup, positionGroups } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { PlayerStatsEditor } from "./player-stats-editor";
import { AffinityCalculationTable } from "./affinity-calculation-table";
import { ScrollArea } from "./ui/scroll-area";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';


type PlayerDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flatPlayer: FlatPlayer | null;
  onSavePlayerBuild: (playerId: string, cardId: string, build: PlayerBuild) => void;
  idealBuilds: IdealBuilds;
};

export function PlayerDetailDialog({ open, onOpenChange, flatPlayer, onSavePlayerBuild, idealBuilds }: PlayerDetailDialogProps) {
  const [currentBuild, setCurrentBuild] = React.useState<PlayerBuild>({ stats: {}, progression: {} });

  React.useEffect(() => {
    if (open && flatPlayer) {
      setCurrentBuild(flatPlayer.card.build || { stats: {}, progression: {} });
    } else {
      setCurrentBuild({ stats: {}, progression: {} });
    }
  }, [open, flatPlayer]);

  const card = flatPlayer?.card;
  const player = flatPlayer?.player;
  const position = flatPlayer?.position;
  const style = card?.style;
  const updatedAt = card?.build?.updatedAt;

  const idealBuildForPositionAndStyle = React.useMemo(() => {
    if (!position || !style) return undefined;
    // We don't need to look up the group here, because the useIdealBuilds hook
    // has already propagated the builds to all positions in the group.
    return idealBuilds[position]?.[style];
  }, [position, style, idealBuilds]);

  const handleSave = () => {
    if (player && card && currentBuild) {
      onSavePlayerBuild(player.id, card.id, currentBuild);
      onOpenChange(false);
    }
  };
  
  const formattedDate = updatedAt 
    ? format(new Date(updatedAt), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es }) 
    : 'N/A';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Estadísticas de {player?.name} <span className="text-muted-foreground">({card?.name})</span></DialogTitle>
          <DialogDescription>
            Análisis de afinidad para {position} ({style}). Última actualización: <span className="font-semibold text-foreground">{formattedDate}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4 flex-grow overflow-hidden">
          <Card className="flex flex-col lg:col-span-1">
            <CardHeader>
              <CardTitle>Build del Jugador</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden flex flex-col">
              <PlayerStatsEditor 
                playerBuild={currentBuild}
                onBuildChange={setCurrentBuild}
              />
            </CardContent>
          </Card>
          <Card className="flex flex-col lg:col-span-2 overflow-hidden">
            <CardHeader>
              <CardTitle>Análisis de Afinidad vs. Build Ideal de {position} ({style})</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col overflow-hidden">
               <ScrollArea className="h-full w-full pr-6 flex-grow">
                {idealBuildForPositionAndStyle ? (
                    <AffinityCalculationTable
                      playerBuild={currentBuild.stats}
                      idealBuild={idealBuildForPositionAndStyle}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground p-8">
                      No se ha definido una "Build Ideal" para la posición de {position} con el estilo {style}.
                    </div>
                  )}
               </ScrollArea>
            </CardContent>
          </Card>
        </div>
        <div className="flex justify-end pt-4 border-t mt-4 flex-shrink-0">
          <Button onClick={handleSave}>Guardar Build</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
