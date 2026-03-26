"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FlatPlayer, FormationStats, Player } from '@/lib/types';
import { positions } from '@/lib/types';
import { Users, CreditCard, Hash, Trophy, AlertTriangle, FlaskConical, TrendingUp, TrendingDown, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { PositionIcon } from '@/components/position-icon';
import { FORMATION_TEMPLATES, type FormationTemplate } from '@/lib/formation-templates';
import { positionPriority } from '@/lib/utils';

interface SquadDashboardProps {
  flatPlayers: FlatPlayer[];
  formations: FormationStats[];
  players: Player[];
  onGoToTemplateFormation: (template: FormationTemplate) => void;
}

function getOverallColor(overall: number): string {
  if (overall >= 90) return 'text-orange-400';
  if (overall >= 80) return 'text-purple-400';
  if (overall >= 70) return 'text-sky-400';
  if (overall >= 60) return 'text-green-400';
  return 'text-muted-foreground';
}

function LiveUpdateBadge({ rating }: { rating: string }) {
  const colors: Record<string, string> = {
    A: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    B: 'bg-green-500/20 text-green-400 border-green-500/30',
    C: 'bg-muted text-muted-foreground border-border',
    D: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    E: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${colors[rating] ?? colors.C}`}>
      {rating}
    </span>
  );
}

export function SquadDashboard({ flatPlayers, formations, players, onGoToTemplateFormation }: SquadDashboardProps) {
  const stats = useMemo(() => {
    const uniquePlayerIds = new Set(flatPlayers.map(fp => fp.player.id));
    const uniqueCardIds = new Set(flatPlayers.map(fp => fp.card.id));
    const totalRatings = flatPlayers.reduce((sum, fp) => sum + fp.performance.stats.matches, 0);

    // Testers: entre 1 y 4 partidos
    const testers = flatPlayers
      .filter(fp => fp.performance.stats.matches > 0 && fp.performance.stats.matches < 5)
      .sort((a, b) => a.performance.stats.matches - b.performance.stats.matches);

    // Cartas sin ninguna posición valorada
    const ratedCardIds = new Set(flatPlayers.map(fp => fp.card.id));
    const unratedCards: { playerName: string; cardName: string }[] = [];
    players.forEach(p => {
      p.cards.forEach(c => {
        if (!ratedCardIds.has(c.id)) {
          unratedCards.push({ playerName: p.name, cardName: c.name });
        }
      });
    });

    // Jugadores con Live Update D o E
    const penalizedPlayers = players
      .filter(p => p.liveUpdateRating === 'D' || p.liveUpdateRating === 'E')
      .map(p => ({ name: p.name, rating: p.liveUpdateRating as string }));

    // Top 5 por overall (deduplicado por card+position)
    const seen = new Set<string>();
    const topByOverall = flatPlayers
      .slice()
      .sort((a, b) => b.overall - a.overall)
      .filter(fp => {
        const key = `${fp.card.id}-${fp.position}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);

    // Jugadores por posición
    const playersByPosition: Record<string, number> = {};
    for (const pos of positions) {
      playersByPosition[pos] = flatPlayers.filter(fp => fp.position === pos).length;
    }
    const maxInPosition = Math.max(...Object.values(playersByPosition), 1);

    // Recomendaciones de formaciones estándar por fit score
    // Algoritmo greedy: para cada slot de la plantilla, toma el mejor FlatPlayer
    // disponible para esa posición (sin repetir jugador ni carta).
    // fitScore = suma overalls / 11 (vacante aporta 0, penaliza cobertura incompleta).
    const formationRecommendations = FORMATION_TEMPLATES.map(template => {
      const sortedSlots = [...template.slots].sort(
        (a, b) => positionPriority[a.position] - positionPriority[b.position],
      );

      const usedCardIds = new Set<string>();
      const usedPlayerIds = new Set<string>();
      let totalOverall = 0;
      let filledCount = 0;
      const assigned: Array<{ name: string; overall: number }> = [];

      for (const slot of sortedSlots) {
        const pos = slot.position;
        const best = flatPlayers
          .filter(
            fp =>
              fp.position === pos &&
              !usedCardIds.has(fp.card.id) &&
              !usedPlayerIds.has(fp.player.id),
          )
          .sort((a, b) => b.overall - a.overall)[0];

        if (best) {
          usedCardIds.add(best.card.id);
          usedPlayerIds.add(best.player.id);
          totalOverall += best.overall;
          filledCount++;
          assigned.push({ name: best.player.name, overall: best.overall });
        }
      }

      const fitScore = totalOverall / 11;
      const topStarters = assigned
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 3)
        .map(a => a.name);

      return { template, name: template.name, fitScore, filledCount, topStarters };
    })
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 5);

    // Win rate por formación
    const formationStats = formations
      .map(f => {
        const wins = f.matches.filter(m => m.goalsFor > m.goalsAgainst).length;
        const draws = f.matches.filter(m => m.goalsFor === m.goalsAgainst).length;
        const total = f.matches.length;
        return {
          name: f.name,
          wins,
          draws,
          losses: total - wins - draws,
          total,
          winRate: total > 0 ? Math.round((wins / total) * 100) : null,
        };
      })
      .sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1));

    return {
      totalPlayers: uniquePlayerIds.size,
      totalCards: uniqueCardIds.size,
      totalRatings,
      totalFormations: formations.length,
      testers,
      unratedCards,
      penalizedPlayers,
      topByOverall,
      playersByPosition,
      maxInPosition,
      formationStats,
      formationRecommendations,
    };
  }, [flatPlayers, formations, players]);

  return (
    <div className="space-y-6">

      {/* Resumen general */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-sky-400 shrink-0" />
            <div>
              <div className="text-2xl font-black text-primary">{stats.totalPlayers}</div>
              <div className="text-xs text-muted-foreground">Jugadores</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-purple-400 shrink-0" />
            <div>
              <div className="text-2xl font-black text-primary">{stats.totalCards}</div>
              <div className="text-xs text-muted-foreground">Cartas</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Hash className="h-8 w-8 text-green-400 shrink-0" />
            <div>
              <div className="text-2xl font-black text-primary">{stats.totalRatings}</div>
              <div className="text-xs text-muted-foreground">Valoraciones</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-orange-400 shrink-0" />
            <div>
              <div className="text-2xl font-black text-primary">{stats.totalFormations}</div>
              <div className="text-xs text-muted-foreground">Formaciones</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Testers */}
        <Card className="border-yellow-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-400">
              <FlaskConical className="h-4 w-4" />
              Testers ({stats.testers.length})
              <span className="text-muted-foreground font-normal ml-1">— menos de 5 partidos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.testers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin testers pendientes.</p>
            ) : (
              <ul className="space-y-2">
                {stats.testers.map((fp, i) => (
                  <li key={i} className="flex items-center justify-between text-sm gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <PositionIcon position={fp.position} className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium truncate">{fp.player.name}</span>
                      <span className="text-muted-foreground text-xs truncate hidden sm:block">{fp.card.name}</span>
                    </div>
                    <Badge variant="outline" className="text-yellow-400 border-yellow-500/40 shrink-0">
                      {fp.performance.stats.matches}/5
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Live Update D/E */}
        <Card className="border-red-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-red-400">
              <TrendingDown className="h-4 w-4" />
              Live Update negativo ({stats.penalizedPlayers.length})
              <span className="text-muted-foreground font-normal ml-1">— D o E</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.penalizedPlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin penalizados activos.</p>
            ) : (
              <ul className="space-y-2">
                {stats.penalizedPlayers.map((p, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{p.name}</span>
                    <LiveUpdateBadge rating={p.rating} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Sin valorar */}
        <Card className="border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Sin valorar ({stats.unratedCards.length})
              <span className="font-normal ml-1">— cartas sin posiciones</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.unratedCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todas las cartas tienen valoraciones.</p>
            ) : (
              <ul className="space-y-2">
                {stats.unratedCards.map((c, i) => (
                  <li key={i} className="flex items-center justify-between text-sm gap-2">
                    <span className="font-medium truncate">{c.playerName}</span>
                    <span className="text-muted-foreground text-xs shrink-0">{c.cardName}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Top 5 overall */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              Top 5 por Overall
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.topByOverall.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos aún.</p>
            ) : (
              <ol className="space-y-2.5">
                {stats.topByOverall.map((fp, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-4 text-right shrink-0">{i + 1}.</span>
                    <PositionIcon position={fp.position} className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium flex-1 truncate">{fp.player.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{fp.card.name}</span>
                    <span className={`font-black text-base w-12 text-right shrink-0 ${getOverallColor(fp.overall)}`}>
                      {fp.overall.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Cobertura por posición */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-sky-400" />
              Cobertura por posición
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5">
              {positions.map(pos => {
                const count = stats.playersByPosition[pos] ?? 0;
                const pct = Math.round((count / stats.maxInPosition) * 100);
                const barColor = count === 0
                  ? 'bg-red-500/40'
                  : count <= 2
                  ? 'bg-yellow-500/60'
                  : 'bg-sky-500/60';
                return (
                  <div key={pos} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-8 text-right shrink-0">{pos}</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: count === 0 ? '4px' : `${pct}%` }}
                      />
                    </div>
                    <span className={`w-4 text-right font-bold shrink-0 ${count === 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Formaciones recomendadas */}
      {stats.formationRecommendations.length > 0 && (
        <Card className="border-purple-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-purple-400">
              <Sparkles className="h-4 w-4" />
              Formaciones recomendadas para tu plantel
              <span className="text-muted-foreground font-normal ml-1">— top 5 por fit de jugadores</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {stats.formationRecommendations.map((rec, i) => {
                const rankColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600', 'text-muted-foreground', 'text-muted-foreground'];
                const fitColor = rec.fitScore >= 75 ? 'text-green-400' : rec.fitScore >= 65 ? 'text-sky-400' : rec.fitScore >= 55 ? 'text-yellow-400' : 'text-muted-foreground';
                const coverageColor = rec.filledCount >= 10 ? 'text-green-400' : rec.filledCount >= 8 ? 'text-yellow-400' : 'text-red-400';
                return (
                  <div key={rec.id} className="flex items-start gap-3 bg-muted/30 rounded-lg px-3 py-2.5">
                    <span className={`text-lg font-black w-5 shrink-0 leading-tight ${rankColors[i]}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{rec.name}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs gap-1"
                          onClick={() => onGoToTemplateFormation(rec.template)}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ver en 11 Ideal
                        </Button>
                      </div>
                      {rec.topStarters.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {rec.topStarters.join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-sm">
                      <div className="text-right">
                        <div className={`text-lg font-black leading-tight ${fitColor}`}>
                          {rec.fitScore.toFixed(1)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">fit</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold leading-tight ${coverageColor}`}>
                          {rec.filledCount}/11
                        </div>
                        <div className="text-[10px] text-muted-foreground">cobertura</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold leading-tight text-primary">
                          {rec.styleMatchPct}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">estilo</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Win rate por formación */}
      {stats.formationStats.some(f => f.total > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-orange-400" />
              Rendimiento por formación
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.formationStats
                .filter(f => f.total > 0)
                .map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2 text-sm gap-2">
                    <span className="font-medium truncate flex-1">{f.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-green-400 font-bold">{f.wins}G</span>
                      <span className="text-muted-foreground">{f.draws}E</span>
                      <span className="text-red-400">{f.losses}P</span>
                      {f.winRate !== null && (
                        <Badge
                          variant="outline"
                          className={
                            f.winRate >= 60
                              ? 'border-green-500/40 text-green-400'
                              : f.winRate >= 40
                              ? 'border-yellow-500/40 text-yellow-400'
                              : 'border-red-500/40 text-red-400'
                          }
                        >
                          {f.winRate}%
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
