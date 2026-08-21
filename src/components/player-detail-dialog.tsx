
"use client";

import * as React from "react";
import type { Position, FlatPlayer, PhysicalAttribute, Nationality, League, PlayerStyle, PlayerTier } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import Image from 'next/image';
import { Dumbbell, Image as ImageIcon, Globe, Trophy, LayersIcon } from "lucide-react";
import { getProxiedImageUrl, normalizePlayerTier, normalizeTierPlacements } from '@/lib/utils';
import { Badge } from "./ui/badge";
import { defensivePlayerStyles, defensiveStylePositions, getPlayerStylesForPosition, nationalities, leagues, offensivePlayerStyles, playerTiers } from "@/lib/types";
import { cn } from "@/lib/utils";

type PlayerDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flatPlayer: FlatPlayer | null;
  onSaveFullData: (playerId: string, cardId: string, position: Position, data: {
    imageUrl?: string;
    efhubUrl?: string;
    cardName: string;
    style: PlayerStyle;
    offensiveStyle: PlayerStyle;
    defensiveStyle: PlayerStyle;
    tier: PlayerTier;
  tierPlacements: number;
    isSecondaryPosition: boolean;
    physical: PhysicalAttribute;
    nationality?: Nationality;
    league?: League;
  }) => void;
};



export function PlayerDetailDialog({ open, onOpenChange, flatPlayer, onSaveFullData }: PlayerDetailDialogProps) {
  const [imageUrl, setImageUrl] = React.useState('');
  const [efhubUrl, setEfhubUrl] = React.useState('');
  const [cardName, setCardName] = React.useState('');
  const [offensiveStyle, setOffensiveStyle] = React.useState<PlayerStyle>('Básico');
  const [defensiveStyle, setDefensiveStyle] = React.useState<PlayerStyle>('Básico');
  const [tier, setTier] = React.useState<PlayerTier>('SIN TIER');
  const [tierPlacements, setTierPlacements] = React.useState(0);
  const [isSecondaryPosition, setIsSecondaryPosition] = React.useState(false);
  const [height, setHeight] = React.useState<number | ''>('');
  const [weight, setWeight] = React.useState<number | ''>('');
  const [nationality, setNationality] = React.useState<Nationality>('Sin Nacionalidad');
  const [league, setLeague] = React.useState<League>('Sin Liga');

  const position = flatPlayer?.position;
  const card = flatPlayer?.card;
  const player = flatPlayer?.player;

  React.useEffect(() => {
    if (open && flatPlayer && position && card) {
      setImageUrl(card.imageUrl || '');
      setEfhubUrl(card.tierlistUrl || player?.efhubUrl || '');
      setCardName(card.name);
      const cardStyles = getPlayerStylesForPosition(card, position);
      setOffensiveStyle(cardStyles.offensiveStyle);
      setDefensiveStyle(cardStyles.defensiveStyle);
      const currentTier = normalizePlayerTier(card.tierByPosition?.[position] ?? card.tier);
      setTier(currentTier);
      setTierPlacements(normalizeTierPlacements(currentTier, card.tierPlacementsByPosition?.[position] ?? card.tierPlacements));
      setIsSecondaryPosition(card.secondaryPositions?.includes(position) || false);
      setHeight(card.physicalAttributes?.height ?? '');
      setWeight(card.physicalAttributes?.weight ?? '');
      setNationality(player?.nationality || 'Sin Nacionalidad');
      setLeague(card.league || 'Sin Liga');
    }
  }, [open, flatPlayer, card, position, player]);

  const handleSave = () => {
    if (player && card && position) {
      onSaveFullData(player.id, card.id, position, {
        imageUrl,
        efhubUrl,
        cardName: cardName.trim(),
        style: defensiveStylePositions.includes(position) ? defensiveStyle : offensiveStyle,
        offensiveStyle,
        defensiveStyle,
        tier,
        tierPlacements,
        isSecondaryPosition,
        physical: { height: height === '' ? undefined : Number(height), weight: weight === '' ? undefined : Number(weight) },
        nationality,
        league,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-2">
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
                <Dumbbell className="h-6 w-6 text-accent" /> Ficha Maestra de {player?.name}
                {flatPlayer?.overall !== undefined && (
                  <Badge variant="outline" className="ml-2 font-mono">
                    Overall: <span className="text-primary ml-1">{flatPlayer.overall.toFixed(1)}</span>
                  </Badge>
                )}
            </DialogTitle>
            <DialogDescription>Edita los datos manuales de esta carta para la posición {position}.</DialogDescription>
            </DialogHeader>
        </div>
        
        <div className="flex-grow flex flex-col md:flex-row overflow-hidden border-t">
            <ScrollArea className="flex-grow p-6 h-full">
                <div className="space-y-8 pb-10">
                    {/* Sección de Metadatos: Imagen, Liga, País y Físico */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" /> Datos de Identidad y Carta
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nombre de la Carta</Label>
                                    <Input value={cardName} onChange={(e) => setCardName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>URL de Imagen (eFootballHub / ImgBB)</Label>
                                    <Input placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Link de eFHUB / Tierlist de esta carta</Label>
                                    <Input type="url" placeholder="https://efootballhub.net/..." value={efhubUrl} onChange={(e) => setEfhubUrl(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-1"><Globe className="h-3 w-3" /> País</Label>
                                        <Select value={nationality} onValueChange={(v) => setNationality(v as Nationality)}>
                                            <SelectTrigger className="h-9 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {nationalities.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-1"><Trophy className="h-3 w-3" /> Liga</Label>
                                        <Select value={league} onValueChange={(v) => setLeague(v as League)}>
                                            <SelectTrigger className="h-9 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {leagues.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>Estilo ofensivo</Label>
                                        <Select value={offensiveStyle} onValueChange={(value) => setOffensiveStyle(value as PlayerStyle)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{offensivePlayerStyles.map(playerStyle => <SelectItem key={playerStyle} value={playerStyle}>{playerStyle}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Estilo defensivo</Label>
                                        <Select value={defensiveStyle} onValueChange={(value) => setDefensiveStyle(value as PlayerStyle)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{defensivePlayerStyles.map(playerStyle => <SelectItem key={playerStyle} value={playerStyle}>{playerStyle}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 content-start pb-1">
                                <div className="col-span-2 rounded-md border border-border/60 bg-muted/20 p-3 space-y-2">
                                    <Button
                                        type="button"
                                        variant={isSecondaryPosition ? "secondary" : "outline"}
                                        className="w-full"
                                        aria-pressed={isSecondaryPosition}
                                        onClick={() => setIsSecondaryPosition(current => !current)}
                                    >
                                        {isSecondaryPosition ? "Usar para selección" : "Marcar como secundaria"}
                                    </Button>
                                    <p className="text-xs text-muted-foreground">
                                        {isSecondaryPosition
                                            ? "Solo se usará como posición de apoyo en formaciones fluidas y no recibirá TIER."
                                            : "Una posición secundaria no puede elegir al jugador como titular o suplente."}
                                    </p>
                                </div>
                                {!isSecondaryPosition && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Tier en {position}</Label>
                                            <Select
                                                value={tier}
                                                onValueChange={(value) => {
                                                    const nextTier = value as PlayerTier;
                                                    setTier(nextTier);
                                                    setTierPlacements(nextTier === 'SIN TIER' ? 0 : Math.max(1, tierPlacements));
                                                }}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {playerTiers.map(playerTier => <SelectItem key={playerTier} value={playerTier}>{playerTier}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Placements</Label>
                                            <Input
                                                type="number"
                                                min={tier === 'SIN TIER' ? 0 : 1}
                                                disabled={tier === 'SIN TIER'}
                                                value={tierPlacements}
                                                onChange={(e) => setTierPlacements(Number(e.target.value))}
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="space-y-2">
                                    <Label>Altura (cm)</Label>
                                    <Input type="number" value={height} onChange={(e) => setHeight(e.target.value === '' ? '' : Number(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Peso (kg)</Label>
                                    <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Otras cartas del jugador */}
                    {player && player.cards && player.cards.length > 1 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                          <LayersIcon className="h-4 w-4" /> Todas las Cartas del Jugador
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {player.cards.map((c) => {
                            const isCurrent = c.id === card?.id;
                            const positions = Object.entries(c.ratingsByPosition || {}).filter(([, ratings]) => ratings && (ratings as number[]).length > 0);
                            return (
                              <div
                                key={c.id}
                                className={cn(
                                  "flex items-center gap-3 p-2.5 rounded-lg border text-sm",
                                  isCurrent
                                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                                    : "border-border bg-muted/20"
                                )}
                              >
                                <div className="relative w-10 h-10 flex-shrink-0">
                                  {c.imageUrl ? (
                                    <Image
                                      src={getProxiedImageUrl(c.imageUrl)}
                                      alt={c.name}
                                      fill
                                      sizes="40px"
                                      className="object-contain"
                                      unoptimized
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-muted rounded-full flex items-center justify-center">
                                      <Dumbbell className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="font-semibold truncate text-xs">{c.name}</span>
                                    {isCurrent && <Badge variant="default" className="text-[9px] px-1 py-0 leading-tight">Actual</Badge>}
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                    {c.style && c.style !== 'Ninguno' && (
                                      <Badge variant="secondary" className="text-[9px] px-1 py-0">{c.style}</Badge>
                                    )}
                                    {c.league && c.league !== 'Sin Liga' && (
                                      <span className="text-[9px] text-muted-foreground">{c.league}</span>
                                    )}
                                  </div>
                                  {positions.length > 0 && (
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                      {positions.map(([pos, ratings]) => (
                                        <span key={pos} className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-mono">
                                          {pos}{c.secondaryPositions?.includes(pos as Position) ? " · Sec." : ""} <span className="text-muted-foreground">({(ratings as number[]).length}P)</span>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                </div>
            </ScrollArea>
        </div>

        <DialogFooter className="p-6 border-t bg-background">
          <Button onClick={handleSave} disabled={cardName.trim().length < 2} className="w-full md:w-auto px-10">Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
