
"use client";

import * as React from "react";
import type { Position, FlatPlayer, IdealBuilds, PlayerBuild } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { PlayerStatsEditor } from "./player-stats-editor";
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
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editor de Build para {player?.name} <span className="text-muted-foreground">({card?.name})</span></DialogTitle>
          <DialogDescription>
            Ajusta los puntos de progresión y las estadísticas base de tu jugador. Última actualización: <span className="font-semibold text-foreground">{formattedDate}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow mt-4 overflow-hidden">
          <PlayerStatsEditor 
            playerBuild={currentBuild}
            onBuildChange={setCurrentBuild}
          />
        </div>
        <DialogFooter className="pt-4 border-t mt-4">
          <Button onClick={handleSave}>Guardar Build</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
