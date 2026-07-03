"use client";

import Image from "next/image";
import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PositionIcon } from "@/components/position-icon";
import type { FlatPlayer, Player, PlayerCard, Position } from "@/lib/types";
import { getPlayerTierBonus, getProxiedImageUrl, isPlayerTierStale, normalizePlayerTier, normalizeTierPlacements, TIER_STALE_DAYS } from "@/lib/utils";

const SIN_TIER_STALE_DAYS = 3;

type TierlistUpdatesProps = {
  players: Player[];
  flatPlayers: FlatPlayer[];
  onOpenEditCard: (player: Player, card: PlayerCard, position?: Position) => void;
};

type PendingTierCard = {
  flatPlayer: FlatPlayer;
  player: Player;
  card: PlayerCard;
  position: Position;
  reason: "missing" | "stale";
  daysSinceUpdate: number;
  tierUpdatedAt: string | undefined;
};

function getDaysSinceUpdate(tierUpdatedAt?: string): number | null {
  if (!tierUpdatedAt) return null;
  const updatedAt = new Date(tierUpdatedAt);
  if (Number.isNaN(updatedAt.getTime())) return null;
  const diffMs = Date.now() - updatedAt.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

function isPastReviewWindow(tierUpdatedAt: string | undefined, days: number): boolean {
  const daysSinceUpdate = getDaysSinceUpdate(tierUpdatedAt);
  return daysSinceUpdate !== null && daysSinceUpdate >= days;
}

function formatLastUpdate(tierUpdatedAt?: string): string {
  const days = getDaysSinceUpdate(tierUpdatedAt);
  if (days === null) return "Sin revisar";
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  return `Hace ${days} dias`;
}

function getTierBadgeClass(tier: string): string {
  switch (tier) {
    case "S+":
      return "border-amber-500/40 bg-amber-500/10 text-amber-500";
    case "S":
      return "border-violet-500/40 bg-violet-500/10 text-violet-500";
    case "A":
      return "border-sky-500/40 bg-sky-500/10 text-sky-500";
    case "B":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-500";
    case "C":
      return "border-cyan-500/40 bg-cyan-500/10 text-cyan-500";
    case "D":
      return "border-orange-500/40 bg-orange-500/10 text-orange-500";
    case "E":
      return "border-red-500/40 bg-red-500/10 text-red-500";
    default:
      return "border-muted-foreground/25 bg-muted text-muted-foreground";
  }
}

export function getPendingTierlistCards(players: Player[], flatPlayers: FlatPlayer[]): PendingTierCard[] {
  return flatPlayers
    .map(flatPlayer => {
        const hasPositionTier = flatPlayer.card.tierByPosition?.[flatPlayer.position] !== undefined;
        const tier = normalizePlayerTier(
          hasPositionTier
            ? flatPlayer.card.tierByPosition?.[flatPlayer.position]
            : flatPlayer.card.tier
        );
        const tierUpdatedAt = flatPlayer.card.tierUpdatedAtByPosition?.[flatPlayer.position] ?? flatPlayer.card.tierUpdatedAt;
        const daysSinceUpdate = getDaysSinceUpdate(tierUpdatedAt);
        if (daysSinceUpdate === null) return null;

        const reason: PendingTierCard["reason"] | null =
          tier === "SIN TIER" && isPastReviewWindow(tierUpdatedAt, SIN_TIER_STALE_DAYS)
            ? "missing"
            : tier !== "SIN TIER" && isPlayerTierStale(tierUpdatedAt)
              ? "stale"
              : null;

        if (!reason) return null;

        return {
          flatPlayer,
          player: flatPlayer.player,
          card: flatPlayer.card,
          position: flatPlayer.position,
          reason,
          daysSinceUpdate,
          tierUpdatedAt,
        };
      })
    .filter((item): item is PendingTierCard => item !== null)
    .sort((a, b) => {
      if (a.reason !== b.reason) return a.reason === "missing" ? -1 : 1;
      return (b.daysSinceUpdate ?? Number.MAX_SAFE_INTEGER) - (a.daysSinceUpdate ?? Number.MAX_SAFE_INTEGER);
    });
}

export function TierlistUpdates({ players, flatPlayers, onOpenEditCard }: TierlistUpdatesProps) {
  const pendingCards = useMemo(
    () => getPendingTierlistCards(players, flatPlayers),
    [players, flatPlayers],
  );

  const missingCount = pendingCards.filter(item => item.reason === "missing").length;
  const staleCount = pendingCards.length - missingCount;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-accent">
              <AlertTriangle className="h-5 w-5" />
              Tierlist por actualizar
            </CardTitle>
            <CardDescription>
              SIN TIER aparece tras {SIN_TIER_STALE_DAYS}+ dias sin revision; el resto tras {TIER_STALE_DAYS}+ dias.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-muted-foreground/30">
              {missingCount} sin tier
            </Badge>
            <Badge variant="outline" className="border-amber-500/40 text-amber-500">
              {staleCount} vencidos
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {pendingCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-10 text-center">
            <CheckCircle2 className="mb-3 h-8 w-8 text-emerald-500" />
            <p className="font-medium">Todos los tiers estan al dia.</p>
            <p className="text-sm text-muted-foreground">No hay cartas pendientes para revisar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jugador</TableHead>
                  <TableHead>Carta</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="hidden md:table-cell">Posiciones</TableHead>
                  <TableHead className="hidden sm:table-cell">Ultima revision</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingCards.map(({ flatPlayer, player, card, position, reason, tierUpdatedAt }) => {
                  const tier = normalizePlayerTier(flatPlayer.tier);
                  const tierPlacements = normalizeTierPlacements(tier, flatPlayer.tierPlacements);
                  const tierBonus = getPlayerTierBonus(tier, flatPlayer.tierPlacements);

                  return (
                    <TableRow key={`${player.id}-${card.id}-${position}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {card.imageUrl ? (
                            <Image
                              src={getProxiedImageUrl(card.imageUrl)}
                              alt={card.name}
                              width={44}
                              height={44}
                              className="h-11 w-11 shrink-0 rounded-md object-contain bg-muted"
                              unoptimized
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="h-11 w-11 shrink-0 rounded-md bg-muted" />
                          )}
                          <span className="font-medium">{player.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{card.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTierBadgeClass(tier)}>
                          {tier}{tierBonus > 0 ? ` +${tierBonus.toFixed(1)} · ${tierPlacements}p` : ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="gap-1">
                          <PositionIcon position={position} className="h-3.5 w-3.5" />
                          {position}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatLastUpdate(tierUpdatedAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            reason === "missing"
                              ? "border-red-500/40 bg-red-500/10 text-red-500"
                              : "border-amber-500/40 bg-amber-500/10 text-amber-500"
                          }
                        >
                          {reason === "missing" ? "Sin tier" : "Revisar tier"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => onOpenEditCard(player, card, position)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
