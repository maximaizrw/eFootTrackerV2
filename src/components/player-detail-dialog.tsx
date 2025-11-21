
"use client";

import * as React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from 'recharts';
import type { Position, FlatPlayer, PlayerStatsBuild } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { formatAverage, getAverageColorClass, getPositionGroupColor, getAffinityScoreFromBuild } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { PlayerStatsEditor } from "./player-stats-editor";

type PlayerDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flatPlayer: FlatPlayer | null;
  onSavePlayerBuild: (playerId: string, cardId: string, build: PlayerStatsBuild) => void;
  idealBuilds: Record<Position, PlayerStatsBuild>;
};

type PerformanceData = {
  position: Position;
  average: number;
  matches: number;
  affinity: number;
  general: number;
};

export function PlayerDetailDialog({ open, onOpenChange, flatPlayer, onSavePlayerBuild, idealBuilds }: PlayerDetailDialogProps) {
  const [currentBuild, setCurrentBuild] = React.useState<PlayerStatsBuild | undefined>(undefined);

  React.useEffect(() => {
    if (open && flatPlayer) {
      setCurrentBuild(flatPlayer.card.build);
    } else {
      setCurrentBuild(undefined);
    }
  }, [open, flatPlayer]);

  const performanceData = React.useMemo(() => {
    if (!flatPlayer) return [];
    const card = flatPlayer.card;
    if (!card || !card.ratingsByPosition) return [];

    return (Object.keys(card.ratingsByPosition) as Position[])
      .map(pos => {
        const ratings = card.ratingsByPosition?.[pos] || [];
        if (ratings.length === 0) return null;

        const stats = card.ratingsByPosition?.[pos] ? {
            total: ratings.reduce((a, b) => a + b, 0),
            count: ratings.length,
        } : { total: 0, count: 0 };
        
        const average = stats.count > 0 ? parseFloat(formatAverage(stats.total / stats.count)) : 0;
        
        const idealBuild = idealBuilds[pos];
        const affinityScore = getAffinityScoreFromBuild(currentBuild, idealBuild);
        
        const matchAverageScore = average > 0 ? (average / 10 * 100) : 0;
        const generalScore = (affinityScore * 0.6) + (matchAverageScore * 0.4);

        return {
          position: pos,
          average: average,
          matches: stats.count,
          affinity: affinityScore,
          general: generalScore,
        };
      })
      .filter((d): d is PerformanceData => d !== null)
      .sort((a, b) => b.average - a.average);
  }, [flatPlayer, idealBuilds, currentBuild]);

  const card = flatPlayer?.card;
  const player = flatPlayer?.player;

  const handleSave = () => {
    if (player && card && currentBuild) {
      onSavePlayerBuild(player.id, card.id, currentBuild);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Estadísticas de {player?.name} <span className="text-muted-foreground">({card?.name})</span></DialogTitle>
          <DialogDescription>
            Análisis detallado del rendimiento y la afinidad del jugador para esta carta.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 flex-grow overflow-hidden">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Build del Jugador</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden flex flex-col">
              <PlayerStatsEditor 
                playerBuild={currentBuild}
                onBuildChange={setCurrentBuild}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por Posición</CardTitle>
            </CardHeader>
            <CardContent>
              {performanceData.length > 0 ? (
                <div style={{ width: '100%', height: 350 }}>
                  <ResponsiveContainer>
                    <BarChart data={performanceData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="position" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 10]} />
                      <Tooltip
                          contentStyle={{ 
                              background: "hsl(var(--background))", 
                              borderColor: "hsl(var(--border))" 
                          }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                          formatter={(value: number, name: string, props) => {
                             if (name === 'average') return [`${value.toFixed(1)} (${props.payload.matches} partidos)`, "Promedio"];
                             if (name === 'affinity') return [value.toFixed(0), "Afinidad"];
                             if (name === 'general') return [value.toFixed(0), "General"];
                             return [value, name];
                          }}
                      />
                      <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                         {performanceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getPositionGroupColor(entry.position)} />
                          ))}
                          <LabelList dataKey="average" position="top" formatter={(value: number) => formatAverage(value)} className="fill-foreground font-semibold" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground">No hay valoraciones para esta carta.</p>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave}>Guardar Build</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
