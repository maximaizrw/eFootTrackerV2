
"use client";

import * as React from "react";
import type { Position, FlatPlayer, PlayerBuild } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type PlayerDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flatPlayer: FlatPlayer | null;
  onSavePlayerBuild: (playerId: string, cardId: string, position: Position, build: PlayerBuild) => void;
};

export function PlayerDetailDialog({ open, onOpenChange, flatPlayer, onSavePlayerBuild }: PlayerDetailDialogProps) {
  const [manualAffinity, setManualAffinity] = React.useState<number | undefined>(undefined);
  
  const position = flatPlayer?.position;
  const card = flatPlayer?.card;
  const player = flatPlayer?.player;
  const buildForPosition = position && card?.buildsByPosition?.[position];
  const updatedAt = buildForPosition?.updatedAt;

  React.useEffect(() => {
    if (open && flatPlayer && position) {
      const build = card?.buildsByPosition?.[position];
      setManualAffinity(build?.manualAffinity || 0);
    } else {
      setManualAffinity(0);
    }
  }, [open, flatPlayer, card, position]);

  const handleSave = () => {
    if (player && card && position) {
      const newBuild: PlayerBuild = {
        manualAffinity: manualAffinity,
      };
      onSavePlayerBuild(player.id, card.id, position, newBuild);
      onOpenChange(false);
    }
  };
  
  const formattedDate = updatedAt 
    ? format(new Date(updatedAt), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es }) 
    : 'N/A';

  const handleAffinityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = value === '' ? undefined : parseInt(value, 10);
    
    if (numValue === undefined) {
      setManualAffinity(undefined);
    } else if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setManualAffinity(numValue);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Afinidad para {player?.name} ({card?.name}) en <span className="text-primary">{position}</span></DialogTitle>
          <DialogDescription>
            Define la afinidad de este jugador para esta posición específica (0-100). Última actualización: <span className="font-semibold text-foreground">{formattedDate}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow mt-4 space-y-2">
            <Label htmlFor="manualAffinity">Afinidad Manual</Label>
            <Input
              id="manualAffinity"
              type="number"
              value={manualAffinity ?? ''}
              onChange={handleAffinityChange}
              placeholder="Ej: 85"
              min="0"
              max="100"
            />
        </div>
        <DialogFooter className="pt-4 border-t mt-4">
          <Button onClick={handleSave}>Guardar Afinidad de {position}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
