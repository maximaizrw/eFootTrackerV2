"use client";

import type { IdealTeamPlayer, IdealTeamSlot, FormationStats, Position, LiveUpdateRating } from '@/lib/types';
import Image from 'next/image';
import { Users, Shirt, X, Crown } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { PerformanceBadges } from './performance-badges';
import { FootballPitch } from './football-pitch';
import { cn, isProfileIncomplete } from '@/lib/utils';
import { AffinityStatusIndicator } from './affinity-status-indicator';
import { memo } from 'react';
import { LiveUpdateRatingSelector } from './live-update-rating-selector';

// --- Pitch PlayerToken (starters) ---

const PlayerToken = ({ player, style, onDiscard, onViewBuild, onUpdateLiveUpdateRating }: { player: IdealTeamPlayer | null, style: React.CSSProperties, onDiscard: (cardId: string) => void, onViewBuild: (player: IdealTeamPlayer) => void, onUpdateLiveUpdateRating: (playerId: string, rating: LiveUpdateRating | null) => void; }) => {
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
  const originalPosition = player.position;
  const isFlex = displayPosition !== originalPosition;
  const incomplete = isProfileIncomplete(player.card);
  const nameColorClass = incomplete ? "text-red-500" : "";

  return (
    <div
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 w-24 flex flex-col items-center justify-between text-center transition-all duration-200",
        "group/token z-10 hover:z-30"
      )}
      style={style}
    >
      {/* Discard button - visible on hover/touch, elevated z-index */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              className={cn(
                "absolute -top-1 -right-1 h-6 w-6 rounded-full z-40 transition-opacity shadow-md",
                "opacity-0 group-hover/token:opacity-100",
                // Always visible on touch devices
                "touch-action-none [@media(hover:none)]:opacity-80"
              )}
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
            {displayPosition} {isFlex && <span className="text-xs font-normal">({originalPosition})</span>}
          </p>
          <div className="flex items-center justify-center gap-1">
            <div className={cn(incomplete && "text-red-500")}>
              <LiveUpdateRatingSelector
                value={player.player.liveUpdateRating}
                onValueChange={(newValue) => onUpdateLiveUpdateRating(player.player.id, newValue)}
              />
            </div>
            <button className="flex items-center justify-center gap-1 group/name" onClick={() => onViewBuild(player)}>
              <AffinityStatusIndicator player={player} />
              <p className={cn("font-semibold text-xs truncate group-hover/name:underline", nameColorClass)} title={player.player.name}>
                {player.player.name}
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Compact SubstitutePlayerRow ---

const SubstitutePlayerRow = ({ player, onDiscard, onViewBuild, onUpdateLiveUpdateRating }: { player: IdealTeamPlayer | null, onDiscard: (cardId: string) => void, onViewBuild: (player: IdealTeamPlayer) => void, onUpdateLiveUpdateRating: (playerId: string, rating: LiveUpdateRating | null) => void; }) => {
  if (!player || player.player.id.startsWith('placeholder')) {
    return (
      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30 border border-dashed border-foreground/20 h-12">
        <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-md flex-shrink-0">
          <Shirt className="w-4 h-4 text-foreground/40" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">Vacante</span>
      </div>
    );
  }

  const displayPosition = player.assignedPosition;
  const originalPosition = player.position;
  const isFlex = displayPosition !== originalPosition;
  const incomplete = isProfileIncomplete(player.card);
  const nameColorClass = incomplete ? "text-red-500" : "";

  return (
    <div className="group/sub relative flex items-center gap-2 p-1.5 rounded-lg bg-card border h-12 overflow-hidden hover:bg-accent/50 transition-colors">
      {/* Position badge - top-right */}
      <div className="absolute top-0 right-0 px-1 py-px text-[10px] font-bold bg-accent text-accent-foreground rounded-bl-md leading-tight">
        {displayPosition}{isFlex && <span className="font-normal text-[9px]"> ({originalPosition})</span>}
      </div>

      {/* Player image */}
      <div className="relative w-10 h-10 flex-shrink-0">
        {player.card.imageUrl ? (
          <Image
            src={player.card.imageUrl}
            alt={player.card.name}
            fill
            sizes="40px"
            className="object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted rounded-md">
            <Users className="w-4 h-4 text-muted-foreground/60" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-grow overflow-hidden min-w-0">
        <div className="flex items-center gap-1">
          <div className={cn(incomplete && "text-red-500")}>
            <LiveUpdateRatingSelector
              value={player.player.liveUpdateRating}
              onValueChange={(newValue) => onUpdateLiveUpdateRating(player.player.id, newValue)}
            />
          </div>
          <button className="flex items-center gap-1 group/name min-w-0" onClick={() => onViewBuild(player)}>
            <AffinityStatusIndicator player={player} />
            <span className={cn("font-semibold text-xs truncate group-hover/name:underline", nameColorClass)} title={player.player.name}>
              {player.player.name}
            </span>
          </button>
        </div>
        <PerformanceBadges performance={player.performance} className="mt-0.5 [&_svg]:h-3 [&_svg]:w-3 [&_span]:text-[10px]" />
      </div>

      {/* Discard button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              className={cn(
                "h-5 w-5 rounded-full flex-shrink-0 transition-opacity",
                "opacity-0 group-hover/sub:opacity-100",
                "[@media(hover:none)]:opacity-80"
              )}
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
    </div>
  );
};

type IdealTeamDisplayProps = {
  teamSlots: IdealTeamSlot[];
  formation: FormationStats | undefined;
  onDiscardPlayer: (cardId: string) => void;
  onViewBuild: (player: IdealTeamPlayer) => void;
  onUpdateLiveUpdateRating: (playerId: string, rating: LiveUpdateRating | null) => void;
};


const substituteOrder: Position[] = [
  'PT', 'DFC', 'LI', 'LD', 'MCD', 'MC', 'MDI', 'MDD', 'MO', 'EXI', 'EXD', 'SD', 'DC'
];

const IdealTeamDisplayMemo = memo(function IdealTeamDisplay({ teamSlots, formation, onDiscardPlayer, onViewBuild, onUpdateLiveUpdateRating }: IdealTeamDisplayProps) {
  if (teamSlots.length === 0 || !formation) {
    return (
      <div className="mt-8 text-center text-muted-foreground p-8 bg-card rounded-lg border border-dashed">
        {"Configura una formación y haz clic en \"Generar 11 Ideal\" para ver los resultados aquí."}
      </div>
    );
  }

  const starters = teamSlots.slice(0, 11).map(slot => slot.starter);

  const regularSubstitutes = teamSlots
    .slice(0, 11)
    .map(slot => slot.substitute)
    .filter((sub): sub is IdealTeamPlayer => sub !== null && !sub.player.id.startsWith('placeholder'))
    .sort((a, b) => {
      const posA = a.assignedPosition;
      const posB = b.assignedPosition;
      const indexA = substituteOrder.indexOf(posA);
      const indexB = substituteOrder.indexOf(posB);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

  const extraSubSlot = teamSlots.length > 11 ? teamSlots[11] : null;
  const extraSub = extraSubSlot ? extraSubSlot.substitute : null;

  const finalSubstitutes: (IdealTeamPlayer | null)[] = [...regularSubstitutes];
  if (extraSub && !extraSub.player.id.startsWith('placeholder')) {
    finalSubstitutes.push(extraSub);
  }

  // Pad to 12 slots for visual consistency
  while (finalSubstitutes.length < 12) {
    finalSubstitutes.push(null);
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Starters on pitch - constrained height */}
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Crown className="h-4 w-4" /> Titulares
        </h3>
        <FootballPitch>
          {starters.map((starter, index) => {
            const formationSlot = formation.slots[index];
            const style: React.CSSProperties = {
              top: `${formationSlot?.top || 50}%`,
              left: `${formationSlot?.left || 50}%`,
            };
            return (
              <PlayerToken
                key={starter?.card.id || `starter-${index}`}
                player={starter}
                style={style}
                onDiscard={onDiscardPlayer}
                onViewBuild={onViewBuild}
                onUpdateLiveUpdateRating={onUpdateLiveUpdateRating}
              />
            );
          })}
        </FootballPitch>
      </div>

      {/* Substitutes - compact grid below the pitch */}
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Users className="h-4 w-4" /> Banquillo
          <span className="text-xs font-normal text-muted-foreground">
            ({finalSubstitutes.filter(s => s !== null).length})
          </span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
          {finalSubstitutes.map((sub, index) => (
            <SubstitutePlayerRow
              key={sub?.card.id || `sub-${index}`}
              player={sub}
              onDiscard={onDiscardPlayer}
              onViewBuild={onViewBuild}
              onUpdateLiveUpdateRating={onUpdateLiveUpdateRating}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export { IdealTeamDisplayMemo as IdealTeamDisplay };
