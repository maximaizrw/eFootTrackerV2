"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PositionIcon } from "@/components/position-icon";
import type { FlatPlayer, Player, PlayerCard, Position } from "@/lib/types";
import { getPlayerTierBonus, getProxiedImageUrl, normalizePlayerTier, normalizeTierPlacements } from "@/lib/utils";

const SIN_TIER_STALE_DAYS = 3;
const INITIAL_VISIBLE_GROUPS = 10;

type TierlistUpdatesProps = {
  players: Player[];
  flatPlayers: FlatPlayer[];
  onOpenEditCard: (player: Player, card: PlayerCard, position?: Position) => void;
  onMarkReviewed: (player: Player, card: PlayerCard, positions: Position[]) => Promise<void> | void;
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

type PendingTierGroup = {
  player: Player;
  card: PlayerCard;
  items: PendingTierCard[];
  primaryItem: PendingTierCard;
  reason: PendingTierCard["reason"];
  daysSinceUpdate: number;
  positions: Position[];
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

export function getTierReviewWindowDays(tier: string): number {
  switch (normalizePlayerTier(tier)) {
    case "SIN TIER":
      return SIN_TIER_STALE_DAYS;
    case "S+":
    case "S":
      return 7;
    case "A":
      return 10;
    case "B":
    case "C":
      return 14;
    default:
      return 21;
  }
}

function getTierUrgency(tier: string): number {
  switch (normalizePlayerTier(tier)) {
    case "S+":
      return 7;
    case "S":
      return 6;
    case "A":
      return 5;
    case "B":
      return 4;
    case "C":
      return 3;
    case "D":
      return 2;
    case "E":
      return 1;
    default:
      return 0;
  }
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

      const reviewWindowDays = getTierReviewWindowDays(tier);
      const reason: PendingTierCard["reason"] | null =
        tier === "SIN TIER" && isPastReviewWindow(tierUpdatedAt, reviewWindowDays)
          ? "missing"
          : tier !== "SIN TIER" && isPastReviewWindow(tierUpdatedAt, reviewWindowDays)
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
      const ageDiff = b.daysSinceUpdate - a.daysSinceUpdate;
      if (ageDiff !== 0) return ageDiff;
      return getTierUrgency(b.flatPlayer.tier) - getTierUrgency(a.flatPlayer.tier);
    });
}

export function getPendingTierlistGroups(players: Player[], flatPlayers: FlatPlayer[]): PendingTierGroup[] {
  const groups = new Map<string, PendingTierCard[]>();

  for (const item of getPendingTierlistCards(players, flatPlayers)) {
    const key = `${item.player.id}-${item.card.id}`;
    groups.set(key, [...(groups.get(key) || []), item]);
  }

  return Array.from(groups.values())
    .map(items => {
      const sortedItems = [...items].sort((a, b) => {
        if (a.reason !== b.reason) return a.reason === "missing" ? -1 : 1;
        const ageDiff = b.daysSinceUpdate - a.daysSinceUpdate;
        if (ageDiff !== 0) return ageDiff;
        return getTierUrgency(b.flatPlayer.tier) - getTierUrgency(a.flatPlayer.tier);
      });
      const primaryItem = sortedItems[0];

      return {
        player: primaryItem.player,
        card: primaryItem.card,
        items: sortedItems,
        primaryItem,
        reason: (sortedItems.some(item => item.reason === "missing") ? "missing" : "stale") as PendingTierCard["reason"],
        daysSinceUpdate: Math.max(...sortedItems.map(item => item.daysSinceUpdate)),
        positions: sortedItems.map(item => item.position),
      };
    })
    .sort((a, b) => {
      if (a.reason !== b.reason) return a.reason === "missing" ? -1 : 1;
      const ageDiff = b.daysSinceUpdate - a.daysSinceUpdate;
      if (ageDiff !== 0) return ageDiff;
      return getTierUrgency(b.primaryItem.flatPlayer.tier) - getTierUrgency(a.primaryItem.flatPlayer.tier);
    });
}

export function TierlistUpdates({ players, flatPlayers, onOpenEditCard, onMarkReviewed }: TierlistUpdatesProps) {
  const [showAll, setShowAll] = useState(false);
  const [reviewingKey, setReviewingKey] = useState<string | null>(null);
  const pendingCards = useMemo(
    () => getPendingTierlistCards(players, flatPlayers),
    [players, flatPlayers],
  );
  const pendingGroups = useMemo(
    () => getPendingTierlistGroups(players, flatPlayers),
    [players, flatPlayers],
  );

  const missingCount = pendingGroups.filter(item => item.reason === "missing").length;
  const staleCount = pendingGroups.length - missingCount;
  const visibleGroups = showAll ? pendingGroups : pendingGroups.slice(0, INITIAL_VISIBLE_GROUPS);
  const hiddenGroupCount = Math.max(0, pendingGroups.length - visibleGroups.length);

  async function handleMarkReviewed(group: PendingTierGroup) {
    const key = `${group.player.id}-${group.card.id}`;
    setReviewingKey(key);
    try {
      await onMarkReviewed(group.player, group.card, group.positions);
    } finally {
      setReviewingKey(null);
    }
  }

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
              {pendingGroups.length} cartas pendientes ({pendingCards.length} posiciones). SIN TIER vence a los {SIN_TIER_STALE_DAYS} dias; tiers bajos esperan mas.
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
        {pendingGroups.length === 0 ? (
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
                  <TableHead>Posiciones</TableHead>
                  <TableHead className="hidden sm:table-cell">Ultima revision</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleGroups.map(group => {
                  const { flatPlayer, player, card, position, reason, tierUpdatedAt } = group.primaryItem;
                  const tier = normalizePlayerTier(flatPlayer.tier);
                  const tierPlacements = normalizeTierPlacements(tier, flatPlayer.tierPlacements);
                  const tierBonus = getPlayerTierBonus(tier, flatPlayer.tierPlacements);
                  const tierlistUrl = card.tierlistUrl || player.efhubUrl;
                  const groupKey = `${player.id}-${card.id}`;

                  return (
                    <TableRow key={groupKey}>
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
                          {tierlistUrl ? (
                            <a
                              href={tierlistUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                            >
                              {player.name}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="font-medium">{player.name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{card.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTierBadgeClass(tier)}>
                          {tier}{tierBonus > 0 ? ` +${tierBonus.toFixed(1)} - ${tierPlacements}p` : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-40 flex-wrap gap-1.5 md:max-w-none">
                          {group.positions.map(groupPosition => (
                            <Badge key={groupPosition} variant="secondary" className="gap-1">
                              <PositionIcon position={groupPosition} className="h-3.5 w-3.5" />
                              {groupPosition}
                            </Badge>
                          ))}
                        </div>
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
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={reviewingKey === groupKey}
                            onClick={() => handleMarkReviewed(group)}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Mantener
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => onOpenEditCard(player, card, position)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {pendingGroups.length > INITIAL_VISIBLE_GROUPS && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" size="sm" onClick={() => setShowAll(value => !value)}>
                  {showAll ? (
                    <ChevronUp className="mr-2 h-4 w-4" />
                  ) : (
                    <ChevronDown className="mr-2 h-4 w-4" />
                  )}
                  {showAll ? "Ver menos" : `Ver ${hiddenGroupCount} restantes`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
