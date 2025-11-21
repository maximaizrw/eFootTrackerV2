
"use client";

import * as React from "react";
import type { Position, FlatPlayer, PlayerStatsBuild } from "@/lib/types";
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

type PlayerDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flatPlayer: FlatPlayer | null;
  onSavePlayerBuild: (playerId: string, cardId: string, build: PlayerStatsBuild) => void;
  idealBuilds: Record<Position, PlayerStatsBuild>;
};

export function PlayerDetailDialog({ open, onOpenChange, flatPlayer, onSavePlayerBuild, idealBuilds }: PlayerDetailDialogProps) {
  const [currentBuild, setCurrentBuild] = React.useState<PlayerStatsBuild>({});

  React.useEffect(() => {
    if (open && flatPlayer) {
      setCurrentBuild(flatPlayer.card.build || {});
    } else {
      setCurrentBuild({});
    }
  }, [open, flatPlayer]);

  const card = flatPlayer?.card;
  const player = flatPlayer?.player;
  const position = flatPlayer?.position;

  const idealBuildForPosition = position ? idealBuilds[position] : undefined;

  const handleSave = () => {
    if (player && card && currentBuild) {
      onSavePlayerBuild(player.id, card.id, currentBuild);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Estadísticas de {player?.name} <span className="text-muted-foreground">({card?.name})</span></DialogTitle>
          <DialogDescription>
            Análisis detallado del rendimiento y la afinidad del jugador para esta carta en la posición de {position}.
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
              <CardTitle>Análisis de Afinidad vs. Build Ideal de {position}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
               <ScrollArea className="h-full w-full pr-6">
                {idealBuildForPosition ? (
                    <AffinityCalculationTable
                      playerBuild={currentBuild}
                      idealBuild={idealBuildForPosition}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground p-8">
                      No se ha definido una "Build Ideal" para la posición de {position}.
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
