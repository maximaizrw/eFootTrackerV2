"use client";

import type { IdealTeamPlayer, IdealTeamSlot, FormationStats, Position, LiveUpdateRating, PlayerBuild } from '@/lib/types';
import Image from 'next/image';
import { Users, Shirt, X, Info } from 'lucide-react';
import { Button } from './ui/button';
import { FootballPitch } from './football-pitch';
import { cn, getProxiedImageUrl, calculatePointsSpent } from '@/lib/utils';
import { memo, useState } from 'react';
import { LiveUpdateRatingSelector } from './live-update-rating-selector';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Badge } from './ui/badge';

const buildLabels: { key: keyof PlayerBuild; label: string }[] = [
  { key: 'shooting', label: 'Tiro' },
  { key: 'passing', label: 'Pase' },
  { key: 'dribbling', label: 'Regate' },
  { key: 'dexterity', label: 'Destreza' },
  { key: 'lowerBodyStrength', label: 'Fuerza Inferior' },
  { key: 'aerialStrength', label: 'Fuerza Aérea' },
  { key: 'defending', label: 'Defensa' },
  { key: 'gk1', label: 'PT - Actitud' },
  { key: 'gk2', label: 'PT - Parada' },
  { key: 'gk3', label: 'PT - Reflejos' },
];

const PlayerToken = memo(function PlayerToken({
  player, style, hoveredId, onHover, onDiscard, onUpdateLiveUpdateRating, onPlayerClick
}: any) {
  if (!player || player.player.id.startsWith('ph')) {
    return (
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={style}>
        <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/20 border-2 border-dashed border-white/20">
          <Shirt className="w-5 h-5 text-white/30" />
        </div>
      </div>
    );
  }

  const isHovered = hoveredId === player.card.id;

  return (
    <div
      className={cn("absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-150 cursor-pointer", isHovered ? "z-50 scale-110" : "z-10")}
      style={style}
      onPointerEnter={() => onHover(player.card.id)}
      onPointerLeave={() => onHover(null)}
      onClick={() => onPlayerClick(player)}
    >
      <Button
        variant="destructive" size="icon" className={cn("absolute -top-1 -right-1 h-5 w-5 rounded-full z-[60] transition-opacity", isHovered ? "opacity-100" : "opacity-0")}
        onClick={(e) => { e.stopPropagation(); onDiscard(player.card.id); }}
      >
        <X className="h-2.5 w-2.5" />
      </Button>

      <div className="relative w-12 h-12 md:w-14 md:h-14 drop-shadow-lg">
        {player.card.imageUrl ? (
          <Image src={getProxiedImageUrl(player.card.imageUrl)} alt={player.card.name} fill sizes="56px" className="object-contain" unoptimized referrerPolicy="no-referrer" />
        ) : <div className="w-full h-full flex items-center justify-center bg-black/30 rounded-full"><Users className="w-6 h-6 text-white/50" /></div>}
        <div className={cn("absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-px rounded-full text-[10px] font-bold shadow-md bg-sky-500 text-white")}>
          {player.assignedPosition}
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1">
        <LiveUpdateRatingSelector value={player.player.liveUpdateRating} onValueChange={(v: LiveUpdateRating | null) => onUpdateLiveUpdateRating(player.player.id, v)} />
        <span className="text-[10px] md:text-xs font-bold text-white whitespace-nowrap" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
            {player.player.name} <span className="ml-0.5 text-accent">{player.overall?.toFixed(0) || '-'}</span>
        </span>
      </div>
    </div>
  );
});

const BenchCard = memo(function BenchCard({ player, onDiscard, onUpdateLiveUpdateRating, onPlayerClick }: any) {
  if (!player || player.player.id.startsWith('ph')) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/20 border border-dashed border-foreground/10 min-h-[2.75rem]">
        <div className="w-8 h-8 flex items-center justify-center bg-muted/30 rounded-full"><Shirt className="w-3.5 h-3.5 text-foreground/30" /></div>
        <span className="text-[10px] text-muted-foreground/50">Vacante</span>
      </div>
    );
  }

  return (
    <div
      className="group/bench relative flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card border border-border/50 min-h-[2.75rem] hover:bg-accent/10 cursor-pointer"
      onClick={() => onPlayerClick(player)}
    >
      <Button
        variant="destructive" size="icon" className="absolute -top-1 -right-1 h-4 w-4 rounded-full opacity-0 group-hover/bench:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onDiscard(player.card.id); }}
      >
        <X className="h-2.5 w-2.5" />
      </Button>

      <div className="relative w-8 h-8 flex-shrink-0">
        {player.card.imageUrl ? <Image src={getProxiedImageUrl(player.card.imageUrl)} alt={player.card.name} fill sizes="32px" className="object-contain" unoptimized referrerPolicy="no-referrer" /> 
        : <div className="w-full h-full flex items-center justify-center bg-muted rounded-full"><Users className="w-3.5 h-3.5" /></div>}
      </div>

      <div className="flex-grow min-w-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-sky-500">{player.assignedPosition}</span>
            <LiveUpdateRatingSelector value={player.player.liveUpdateRating} onValueChange={(v: LiveUpdateRating | null) => onUpdateLiveUpdateRating(player.player.id, v)} />
            <span className="text-[10px] font-semibold truncate">{player.player.name}</span>
            <span className="text-[10px] font-black ml-auto text-accent">{player.overall?.toFixed(0) || '-'}</span>
          </div>
          <p className="text-[8px] text-muted-foreground leading-none">Convocado como {player.assignedPosition}</p>
        </div>
      </div>
    </div>
  );
});

function BuildViewerDialog({
  player,
  open,
  onOpenChange,
}: {
  player: IdealTeamPlayer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!player) return null;

  const pos = player.position as Position;
  const build: PlayerBuild | undefined = player.card.buildsByPosition?.[pos];
  const hasAnyLevel = build && buildLabels.some(({ key }) => {
    const val = build[key];
    return typeof val === 'number' && val > 0;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="secondary" className="font-bold">{player.assignedPosition}</Badge>
            {player.player.name}
          </DialogTitle>
          <DialogDescription>
            {player.card.style !== 'Ninguno' ? `Rol: ${player.card.style}` : 'Sin rol asignado'}
            {' · '}Carta: {player.card.name}
          </DialogDescription>
        </DialogHeader>

        {!build || !hasAnyLevel ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <Info className="h-8 w-8 opacity-30" />
            <p className="text-sm font-medium">Sin build asignada</p>
            <p className="text-xs text-center">Este jugador no tiene puntos de progresión asignados para la posición {pos}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              {buildLabels.map(({ key, label }) => {
                const val = build[key];
                if (typeof val !== 'number' || val <= 0) return null;
                return (
                  <div key={key} className="flex items-center justify-between px-3 py-2 rounded-md border bg-card border-border text-sm">
                    <span className="font-medium">{label}</span>
                    <span className="text-lg font-black tabular-nums text-accent">{val}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/30 text-sm border border-border/50">
              <span className="text-muted-foreground">Puntos gastados</span>
              <span className="font-bold tabular-nums">{calculatePointsSpent(build)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function IdealTeamDisplay({ teamSlots, formation, onDiscardPlayer, onUpdateLiveUpdateRating }: any) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<IdealTeamPlayer | null>(null);
  const [isBuildDialogOpen, setBuildDialogOpen] = useState(false);

  const handlePlayerClick = (player: IdealTeamPlayer) => {
    setSelectedPlayer(player);
    setBuildDialogOpen(true);
  };

  if (teamSlots.length === 0 || !formation) return <div className="mt-8 text-center text-muted-foreground p-8 bg-card border border-dashed rounded-lg">Configura tu táctica y genera el equipo.</div>;

  const starters = teamSlots.slice(0, 11).map((s: any) => s.starter);
  
  const positionOrder: Record<string, number> = {
    PT: 1, DFC: 2, LI: 3, LD: 4, MCD: 5, MC: 6, II: 7, ID: 8, MO: 9, EXI: 10, EXD: 11, SD: 12, DC: 13
  };

  const rawSubs = teamSlots.map((s: any) => s.substitute).filter((s: any) => s !== null);
  const validSubs = rawSubs.filter((s: any) => !s.player.id.startsWith('ph'));
  validSubs.sort((a: any, b: any) => (positionOrder[a.assignedPosition] || 99) - (positionOrder[b.assignedPosition] || 99));
  
  const emptySlotsCount = Math.max(0, 12 - validSubs.length);
  const substitutes = [...validSubs, ...Array(emptySlotsCount).fill(null)].slice(0, 12);

  return (
    <div className="mt-4 flex flex-col lg:flex-row gap-3">
      <div className="flex-1">
        <FootballPitch className="aspect-[4/3] lg:aspect-[3/2]">
          {starters.map((starter: any, index: number) => {
            const slot = formation.slots[index];
            return <PlayerToken key={starter?.card.id || `empty-${index}`} player={starter} style={{ top: `${slot?.top}%`, left: `${slot?.left}%` }} hoveredId={hoveredId} onHover={setHoveredId} onDiscard={onDiscardPlayer} onUpdateLiveUpdateRating={onUpdateLiveUpdateRating} onPlayerClick={handlePlayerClick} />;
          })}
        </FootballPitch>
      </div>
      <div className="lg:w-72 flex-shrink-0">
        <h3 className="text-sm font-semibold mb-2 px-1">Banquillo (Rotación Jerárquica)</h3>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
          {substitutes.map((sub: any, index: number) => (
            <BenchCard key={sub?.card.id ? `sub-${sub.card.id}-${index}` : `vacante-${index}`} player={sub} onDiscard={onDiscardPlayer} onUpdateLiveUpdateRating={onUpdateLiveUpdateRating} onPlayerClick={handlePlayerClick} />
          ))}
        </div>
      </div>

      <BuildViewerDialog
        player={selectedPlayer}
        open={isBuildDialogOpen}
        onOpenChange={setBuildDialogOpen}
      />
    </div>
  );
}
