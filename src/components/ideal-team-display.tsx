
"use client";

import type { IdealTeamPlayer, IdealTeamSlot, FormationStats, Position, PlayerBuild } from '@/lib/types';
import Image from 'next/image';
import { Users, Shirt, X, Crown, NotebookPen } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { PerformanceBadges } from './performance-badges';
import { FootballPitch } from './football-pitch';
import { cn } from '@/lib/utils';
import { Card } from './ui/card';
import { AffinityStatusIndicator } from './affinity-status-indicator';

type IdealTeamDisplayProps = {
  teamSlots: IdealTeamSlot[];
  formation?: FormationStats;
  onDiscardPlayer: (cardId: string) => void;
  onViewBuild: (player: IdealTeamPlayer) => void;
};

const hasProgressionPoints = (build: PlayerBuild | undefined): boolean => {
    if (!build) return false;
    // Check if any of the progression keys have a value greater than 0
    const keys: (keyof PlayerBuild)[] = ['shooting', 'passing', 'dribbling', 'dexterity', 'lowerBodyStrength', 'aerialStrength', 'defending', 'gk1', 'gk2', 'gk3'];
    return keys.some(key => {
        const value = build[key];
        return typeof value === 'number' && value > 0;
    });
};


const PlayerToken = ({ player, style, onDiscard, onViewBuild }: { player: IdealTeamPlayer | null, style: React.CSSProperties, onDiscard: (cardId: string) => void, onViewBuild: (player: IdealTeamPlayer) => void }) => {
  if (!player || player.player.id.startsWith('placeholder')) {
    return (
      <div 
        className="absolute -translate-x-1/2 -translate-y-1/2 w-20 h-24 flex flex-col items-center justify-center transition-all duration-200"
        style={style}
      >
        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-background/20 border-2 border-dashed border-foreground/30">
          <Shirt className="w-8 h-8 text-foreground/40" />
        </div>
      </div>
    );
  }

  const displayPosition = player.assignedPosition;
  const build = player.card.buildsByPosition?.[player.assignedPosition];
  const isPotw = player.card.name.toLowerCase().includes('potw');
  const hasNoStats = !player.card.attributeStats || Object.keys(player.card.attributeStats).length === 0;
  const hasNoProgression = !isPotw && (!build || !hasProgressionPoints(build));
  
  const nameColorClass = 
    hasNoStats ? 'text-red-500' :
    hasNoProgression ? 'text-violet-400' :
    '';


  return (
    <div 
      className="absolute -translate-x-1/2 -translate-y-1/2 w-24 flex flex-col items-center justify-between text-center transition-all duration-200 group"
      style={style}
    >
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        onClick={(e) => { e.stopPropagation(); onDiscard(player.card.id); }}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                    <p>Descartar jugador</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>

      <div className="relative w-16 h-16 flex-shrink-0 drop-shadow-lg">
        {player.card.imageUrl ? (
          <Image
            src={player.card.imageUrl}
            alt={player.card.name}
            fill
            sizes="64px"
            className="object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/40 rounded-full">
            <Users className="w-8 h-8 text-muted-foreground/60" />
          </div>
        )}
      </div>
       <div className="w-full relative -mt-3 text-white">
        <div className="inline-block bg-black/50 rounded-sm px-1.5 py-0.5" style={{textShadow: '0 1px 3px black'}}>
            <p className="font-bold text-sm leading-tight text-primary">
            {displayPosition}
            </p>
            <button className="flex items-center justify-center gap-1 group/name" onClick={() => onViewBuild(player)}>
                <AffinityStatusIndicator player={player} />
                <p className={cn("font-semibold text-xs truncate group-hover/name:underline", nameColorClass)} title={player.player.name}>
                    {player.player.name}
                </p>
            </button>
        </div>
      </div>
    </div>
  );
};

const SubstitutePlayerRow = ({ player, onDiscard, onViewBuild }: { player: IdealTeamPlayer | null, onDiscard: (cardId: string) => void, onViewBuild: (player: IdealTeamPlayer) => void }) => {
  if (!player || player.player.id.startsWith('placeholder')) {
    return (
      <Card className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border-2 border-dashed border-foreground/30 h-20">
        <div className="w-16 h-full flex items-center justify-center bg-muted rounded-md">
          <Shirt className="w-6 h-6 text-foreground/40" />
        </div>
        <div className="font-semibold text-muted-foreground">Vacante</div>
      </Card>
    );
  }

  const displayPosition = player.assignedPosition;
  const build = player.card.buildsByPosition?.[player.assignedPosition];
  const isPotw = player.card.name.toLowerCase().includes('potw');
  const hasNoStats = !player.card.attributeStats || Object.keys(player.card.attributeStats).length === 0;
  const hasNoProgression = !isPotw && (!build || !hasProgressionPoints(build));
  
  const nameColorClass = 
    hasNoStats ? 'text-red-500' :
    hasNoProgression ? 'text-violet-400' :
    '';


  return (
    <Card className="group relative flex items-center gap-2 p-2 rounded-lg bg-card h-20 overflow-hidden">
      <div className="absolute top-0 right-0 p-1.5 leading-none text-xs font-bold bg-accent text-accent-foreground rounded-bl-lg">
          {displayPosition}
      </div>
      <div className="relative w-16 h-full flex-shrink-0">
        {player.card.imageUrl && (
          <Image
            src={player.card.imageUrl}
            alt={player.card.name}
            fill
            sizes="64px"
            className="object-contain -translate-y-1 scale-110"
          />
        )}
      </div>
      <div className="flex-grow overflow-hidden">
        <button className="flex items-center gap-2 group/name" onClick={() => onViewBuild(player)}>
            <AffinityStatusIndicator player={player} />
            <p className={cn("font-semibold text-base text-foreground truncate group-hover/name:underline", nameColorClass)} title={player.player.name}>
                {player.player.name}
            </p>
        </button>
        <PerformanceBadges performance={player.performance} className="mt-1" />
      </div>
      <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1/2 -translate-y-1/2 right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={() => onDiscard(player.card.id)}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                    <p>Descartar jugador</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </Card>
  );
};

const substituteOrder: Position[] = [
    'PT', 'DFC', 'LI', 'LD', 'MCD', 'MC', 'MDI', 'MDD', 'MO', 'EXI', 'EXD', 'SD', 'DC'
];

export function IdealTeamDisplay({ teamSlots, formation, onDiscardPlayer, onViewBuild }: IdealTeamDisplayProps) {
  if (teamSlots.length === 0 || !formation) {
    return (
      <div className="mt-8 text-center text-muted-foreground p-8 bg-card rounded-lg border border-dashed">
        Configura una formación y haz clic en "Generar 11 Ideal" para ver los resultados aquí.
      </div>
    );
  }
  
  const substitutes = teamSlots
    .map(slot => slot.substitute)
    .filter((sub): sub is IdealTeamPlayer => sub !== null && !sub.player.id.startsWith('placeholder'))
    .sort((a, b) => {
        const posA = a.assignedPosition;
        const posB = b.assignedPosition;
        const indexA = substituteOrder.indexOf(posA);
        const indexB = substituteOrder.indexOf(posB);
        if(indexA === -1 && indexB === -1) return 0;
        if(indexA === -1) return 1;
        if(indexB === -1) return -1;
        return indexA - indexB;
    });

  return (
    <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
      <div className="xl:col-span-2">
        <h3 className="text-xl font-semibold mb-4 text-center flex items-center justify-center gap-2"><Crown /> Titulares</h3>
        <FootballPitch>
          {teamSlots.map((slot, index) => {
             const formationSlot = formation.slots[index];
             const style: React.CSSProperties = {
                top: `${formationSlot?.top || 50}%`,
                left: `${formationSlot?.left || 50}%`,
             };
             return <PlayerToken key={slot.starter?.card.id || `starter-${index}`} player={slot.starter} style={style} onDiscard={onDiscardPlayer} onViewBuild={onViewBuild} />;
          })}
        </FootballPitch>
      </div>
      
      <div className="xl:col-span-1">
        <h3 className="text-xl font-semibold mb-4 text-center flex items-center justify-center gap-2"><Users /> Banquillo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
          {substitutes.map((sub, index) => (
             <SubstitutePlayerRow key={sub?.card.id || `sub-${index}`} player={sub} onDiscard={onDiscardPlayer} onViewBuild={onViewBuild}/>
          ))}
        </div>
      </div>
    </div>
  );
}
