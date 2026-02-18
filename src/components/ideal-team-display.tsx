"use client";

import type { IdealTeamPlayer, IdealTeamSlot, FormationStats, Position, LiveUpdateRating } from '@/lib/types';
import Image from 'next/image';
import { Users, Shirt, X, ArrowRightLeft } from 'lucide-react';
import { Button } from './ui/button';
import { PerformanceBadges } from './performance-badges';
import { FootballPitch } from './football-pitch';
import { cn, isProfileIncomplete } from '@/lib/utils';
import { AffinityStatusIndicator } from './affinity-status-indicator';
import { memo, useState, useCallback } from 'react';
import { LiveUpdateRatingSelector } from './live-update-rating-selector';

// --- Pitch PlayerToken (starters on the field) ---

const PlayerToken = memo(function PlayerToken({
  player, style, index, hoveredId, onHover, onDiscard, onViewBuild, onUpdateLiveUpdateRating
}: {
  player: IdealTeamPlayer | null;
  style: React.CSSProperties;
  index: number;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onDiscard: (cardId: string) => void;
  onViewBuild: (player: IdealTeamPlayer) => void;
  onUpdateLiveUpdateRating: (playerId: string, rating: LiveUpdateRating | null) => void;
}) {
  if (!player || player.player.id.startsWith('placeholder')) {
    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center"
        style={style}
      >
        <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/20 border-2 border-dashed border-white/20">
          <Shirt className="w-5 h-5 text-white/30" />
        </div>
      </div>
    );
  }

  const displayPosition = player.assignedPosition;
  const originalPosition = player.position;
  const isFlex = displayPosition !== originalPosition;
  const incomplete = isProfileIncomplete(player.card);
  const isHovered = hoveredId === player.card.id;

  return (
    <div
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center transition-all duration-150",
        isHovered ? "z-50 scale-110" : "z-10"
      )}
      style={style}
      onPointerEnter={() => onHover(player.card.id)}
      onPointerLeave={() => onHover(null)}
    >
      {/* Discard button */}
      <Button
        variant="destructive"
        size="icon"
        className={cn(
          "absolute -top-1 -right-1 h-5 w-5 rounded-full z-[60] shadow-md transition-opacity",
          isHovered ? "opacity-100" : "opacity-0",
          "[@media(hover:none)]:opacity-80"
        )}
        onClick={(e) => { e.stopPropagation(); onDiscard(player.card.id); }}
        aria-label={`Descartar ${player.player.name}`}
      >
        <X className="h-2.5 w-2.5" />
      </Button>

      {/* Player avatar */}
      <div className="relative w-12 h-12 md:w-14 md:h-14 flex-shrink-0 drop-shadow-lg">
        {player.card.imageUrl ? (
          <Image
            src={player.card.imageUrl}
            alt={player.card.name}
            fill
            sizes="56px"
            className="object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black/30 rounded-full">
            <Users className="w-6 h-6 text-white/50" />
          </div>
        )}
        {/* Position badge circle */}
        <div className={cn(
          "absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-px rounded-full text-[9px] md:text-[10px] font-bold leading-tight shadow-md",
          isFlex ? "bg-amber-500 text-amber-950" : "bg-sky-500 text-white"
        )}>
          {displayPosition}
        </div>
      </div>

      {/* Name label */}
      <div className="mt-1.5 max-w-[5rem]">
        <button
          className="group/name flex items-center justify-center gap-0.5"
          onClick={() => onViewBuild(player)}
        >
          <div className={cn("flex-shrink-0", incomplete && "text-red-500")}>
            <LiveUpdateRatingSelector
              value={player.player.liveUpdateRating}
              onValueChange={(newValue) => onUpdateLiveUpdateRating(player.player.id, newValue)}
            />
          </div>
          <AffinityStatusIndicator player={player} />
          <span
            className={cn(
              "text-[10px] md:text-xs font-semibold truncate text-white group-hover/name:underline",
              incomplete && "text-red-400"
            )}
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
            title={player.player.name}
          >
            {player.player.name}
          </span>
        </button>
      </div>
    </div>
  );
});

// --- Bench substitute card (eFootball style: small vertical card) ---

const BenchCard = memo(function BenchCard({
  player, index, onDiscard, onViewBuild, onUpdateLiveUpdateRating
}: {
  player: IdealTeamPlayer | null;
  index: number;
  onDiscard: (cardId: string) => void;
  onViewBuild: (player: IdealTeamPlayer) => void;
  onUpdateLiveUpdateRating: (playerId: string, rating: LiveUpdateRating | null) => void;
}) {
  if (!player || player.player.id.startsWith('placeholder')) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/20 border border-dashed border-foreground/10 min-h-[2.75rem]">
        <div className="w-8 h-8 flex items-center justify-center bg-muted/30 rounded-full flex-shrink-0">
          <Shirt className="w-3.5 h-3.5 text-foreground/30" />
        </div>
        <span className="text-[10px] text-muted-foreground/50">Vacante</span>
      </div>
    );
  }

  const displayPosition = player.assignedPosition;
  const originalPosition = player.position;
  const isFlex = displayPosition !== originalPosition;
  const incomplete = isProfileIncomplete(player.card);

  return (
    <div className="group/bench relative flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card/80 border border-border/50 min-h-[2.75rem] hover:bg-accent/10 transition-colors">
      {/* Discard */}
      <Button
        variant="destructive"
        size="icon"
        className={cn(
          "absolute -top-1 -right-1 h-4 w-4 rounded-full z-10 shadow transition-opacity",
          "opacity-0 group-hover/bench:opacity-100",
          "[@media(hover:none)]:opacity-70"
        )}
        onClick={() => onDiscard(player.card.id)}
        aria-label={`Descartar ${player.player.name}`}
      >
        <X className="h-2.5 w-2.5" />
      </Button>

      {/* Mini avatar */}
      <div className="relative w-8 h-8 flex-shrink-0">
        {player.card.imageUrl ? (
          <Image
            src={player.card.imageUrl}
            alt={player.card.name}
            fill
            sizes="32px"
            className="object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted rounded-full">
            <Users className="w-3.5 h-3.5 text-muted-foreground/60" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-grow overflow-hidden min-w-0">
        <div className="flex items-center gap-1">
          <span className={cn(
            "text-[10px] font-bold px-1 rounded",
            isFlex ? "bg-amber-500/20 text-amber-500" : "bg-sky-500/20 text-sky-500"
          )}>
            {displayPosition}
          </span>
          <div className={cn("flex-shrink-0", incomplete && "text-red-500")}>
            <LiveUpdateRatingSelector
              value={player.player.liveUpdateRating}
              onValueChange={(newValue) => onUpdateLiveUpdateRating(player.player.id, newValue)}
            />
          </div>
          <button className="group/name flex items-center gap-0.5 min-w-0" onClick={() => onViewBuild(player)}>
            <AffinityStatusIndicator player={player} />
            <span className={cn(
              "text-[10px] font-semibold truncate group-hover/name:underline",
              incomplete ? "text-red-500" : "text-foreground"
            )} title={player.player.name}>
              {player.player.name}
            </span>
          </button>
        </div>
        <PerformanceBadges performance={player.performance} className="mt-0.5 [&_svg]:h-2.5 [&_svg]:w-2.5 [&_span]:text-[9px]" />
      </div>
    </div>
  );
});


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

const IdealTeamDisplayMemo = memo(function IdealTeamDisplay({
  teamSlots, formation, onDiscardPlayer, onViewBuild, onUpdateLiveUpdateRating
}: IdealTeamDisplayProps) {
  const [hoveredTokenId, setHoveredTokenId] = useState<string | null>(null);

  const handleHover = useCallback((id: string | null) => setHoveredTokenId(id), []);

  if (teamSlots.length === 0 || !formation) {
    return (
      <div className="mt-8 text-center text-muted-foreground p-8 bg-card rounded-lg border border-dashed">
        {"Configura una formacion y haz clic en \"Generar 11 Ideal\" para ver los resultados aqui."}
      </div>
    );
  }

  const starters = teamSlots.slice(0, 11).map(slot => slot.starter);

  const regularSubstitutes = teamSlots
    .slice(0, 11)
    .map(slot => slot.substitute)
    .filter((sub): sub is IdealTeamPlayer => sub !== null && !sub.player.id.startsWith('placeholder'))
    .sort((a, b) => {
      const indexA = substituteOrder.indexOf(a.assignedPosition);
      const indexB = substituteOrder.indexOf(b.assignedPosition);
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

  while (finalSubstitutes.length < 12) {
    finalSubstitutes.push(null);
  }

  const filledSubCount = finalSubstitutes.filter(s => s !== null).length;

  return (
    <div className="mt-4">
      {/* eFootball-style layout: pitch left, bench panel right */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Pitch area - takes most space */}
        <div className="flex-1 min-w-0">
          <FootballPitch className="aspect-[4/3] lg:aspect-[3/2]">
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
                  index={index}
                  hoveredId={hoveredTokenId}
                  onHover={handleHover}
                  onDiscard={onDiscardPlayer}
                  onViewBuild={onViewBuild}
                  onUpdateLiveUpdateRating={onUpdateLiveUpdateRating}
                />
              );
            })}
          </FootballPitch>
        </div>

        {/* Bench panel - narrow sidebar on right */}
        <div className="lg:w-56 xl:w-64 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2 px-1">
            <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Banquillo</h3>
            <span className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {filledSubCount}/12
            </span>
          </div>

          {/* Substitute list - 2-col grid on mobile, single col sidebar on lg+ */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pr-1 scrollbar-thin">
            {finalSubstitutes.map((sub, index) => (
              <BenchCard
                key={sub?.card.id || `sub-${index}`}
                player={sub}
                index={index}
                onDiscard={onDiscardPlayer}
                onViewBuild={onViewBuild}
                onUpdateLiveUpdateRating={onUpdateLiveUpdateRating}
              />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
});

export { IdealTeamDisplayMemo as IdealTeamDisplay };
