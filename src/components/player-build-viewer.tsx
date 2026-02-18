"use client";

import * as React from "react";
import type { IdealTeamPlayer, OutfieldBuild, GoalkeeperBuild } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from "./ui/scroll-area";
import { Target, Footprints, Dribbble, Zap, Beef, ChevronsUp, Shield, Hand, Star } from "lucide-react";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

type PlayerBuildViewerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: IdealTeamPlayer | null;
  buildType?: 'tactical' | 'average';
};

const outfieldCategories: { key: keyof OutfieldBuild; label: string, icon: React.ElementType }[] = [
    { key: 'shooting', label: 'Tiro', icon: Target },
    { key: 'passing', label: 'Pase', icon: Footprints },
    { key: 'dribbling', label: 'Regate', icon: Dribbble },
    { key: 'dexterity', label: 'Destreza', icon: Zap },
    { key: 'lowerBodyStrength', label: 'Fuerza inferior', icon: Beef },
    { key: 'aerialStrength', label: 'Juego aéreo', icon: ChevronsUp },
    { key: 'defending', label: 'Defensa', icon: Shield },
];

const goalkeeperCategories: { key: keyof GoalkeeperBuild; label: string, icon: React.ElementType }[] = [
    { key: 'gk1', label: 'Portero 1', icon: Hand },
    { key: 'gk2', label: 'Parada', icon: Hand },
    { key: 'gk3', label: 'Portero 3', icon: Hand },
];


export function PlayerBuildViewer({ open, onOpenChange, player, buildType = 'tactical' }: PlayerBuildViewerProps) {
  if (!player) return null;

  const { player: playerData, card, position } = player;
  
  // Use the build based on the context (tactical or average)
  const fieldName = buildType === 'tactical' ? 'buildsByPosition' : 'averageBuildsByPosition';
  const build = (card as any)[fieldName]?.[position];
  
  const isGoalkeeper = position === 'PT';

  const updatedAt = build?.updatedAt;
  const formattedDate = updatedAt 
    ? format(new Date(updatedAt), "d 'de' MMMM 'de' yyyy", { locale: es }) 
    : 'Nunca';

  const affinity = build?.manualAffinity || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Build de {playerData.name}
            {buildType === 'average' && <Badge variant="secondary">Promedio</Badge>}
            {buildType === 'tactical' && <Badge variant="outline" className="border-primary text-primary">Táctica</Badge>}
          </DialogTitle>
          <DialogDescription>
             Build para <span className="font-semibold text-foreground">{position}</span> ({card.name}).
             <br />
             <span className="text-xs">Última actualización: {formattedDate}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
             <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-center gap-4 border border-border">
                <div className="flex items-center gap-2 text-lg font-bold">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <span>Afinidad:</span>
                </div>
                <span className="text-2xl font-bold text-primary">{affinity.toFixed(2)}</span>
             </div>
            
            <p className="font-medium text-xs text-muted-foreground pt-2 text-center uppercase tracking-widest">Distribución de Puntos</p>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {(isGoalkeeper ? goalkeeperCategories : outfieldCategories).map(({key, label, icon: Icon}) => {
                    const value = (build as any)?.[key] || 0;
                    return (
                        <div key={key} className={cn("flex items-center justify-between text-sm", value === 0 && "opacity-30")}>
                            <span className="flex items-center gap-2 text-muted-foreground">
                                <Icon className="w-4 h-4"/>
                                {label}
                            </span>
                            <span className="font-bold text-lg">{value}</span>
                        </div>
                    );
                })}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
