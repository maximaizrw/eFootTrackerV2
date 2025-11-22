
"use client";

import * as React from "react";
import type { Position, FlatPlayer, DbIdealBuilds, PlayerBuild } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { PlayerStatsEditor } from "./player-stats-editor";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';


type PlayerDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flatPlayer: FlatPlayer | null;
  onSavePlayerBuild: (playerId: string, cardId: string, position: Position, build: PlayerBuild) => void;
  idealBuilds: DbIdealBuilds;
};

export function PlayerDetailDialog({ open, onOpenChange, flatPlayer, onSavePlayerBuild }: PlayerDetailDialogProps) {
  const [currentBuild, setCurrentBuild] = React.useState<PlayerBuild>({ stats: {}, progression: {} });
  
  const position = flatPlayer?.position;
  const card = flatPlayer?.card;
  const player = flatPlayer?.player;
  const buildForPosition = position && card?.buildsByPosition?.[position];
  const updatedAt = buildForPosition?.updatedAt;

  React.useEffect(() => {
    if (open && flatPlayer && position) {
      const build = card?.buildsByPosition?.[position] || { stats: {}, progression: {} };
      setCurrentBuild(build);
    } else {
      setCurrentBuild({ stats: {}, progression: {} });
    }
  }, [open, flatPlayer, card, position]);


  const handleSave = () => {
    if (player && card && position && currentBuild) {
      onSavePlayerBuild(player.id, card.id, position, currentBuild);
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
          <DialogTitle>Editor de Build para {player?.name} ({card?.name}) en <span className="text-primary">{position}</span></DialogTitle>
          <DialogDescription>
            Ajusta los puntos de progresión y las estadísticas base de tu jugador para esta posición. Última actualización: <span className="font-semibold text-foreground">{formattedDate}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow mt-4 overflow-hidden">
          <PlayerStatsEditor 
            playerBuild={currentBuild}
            onBuildChange={setCurrentBuild}
          />
        </div>
        <DialogFooter className="pt-4 border-t mt-4">
          <Button onClick={handleSave}>Guardar Build de {position}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
