
"use client";

import * as React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from 'recharts';
import type { Position, PlayerStatsBuild, PlayerAttribute, FlatPlayer, ProgressionCategory, ProgressionBuild } from "@/lib/types";
import { progressionCategories } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { formatAverage, getPositionGroupColor, normalizeText } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";

type PlayerDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flatPlayer: FlatPlayer | null;
  onSaveTrainingBuild: (playerId: string, cardId: string, position: Position, build: PlayerStatsBuild) => void;
  onSaveCustomScore: (playerId: string, cardId: string, position: Position, score: number) => void;
};

type PerformanceData = {
  position: Position;
  average: number;
  matches: number;
};

const CustomScoreEditor = ({ position, card, onSaveCustomScore, onCancel }: { position: Position, card: FlatPlayer['card'], onSaveCustomScore: (score: number) => void, onCancel: () => void }) => {
    const [score, setScore] = React.useState<number>(card.customScores?.[position] ?? 0);

    const handleSave = () => {
        onSaveCustomScore(score);
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label htmlFor="custom-score">Afinidad para {position}</Label>
                <Input
                    id="custom-score"
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(parseInt(e.target.value, 10) || 0)}
                    className="h-12 text-center text-2xl font-bold"
                    placeholder="0-100"
                />
            </div>
            <div className="flex justify-end items-center pt-4 border-t border-border">
                <div className="flex gap-2">
                    <Button onClick={onCancel} variant="outline">Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Afinidad</Button>
                </div>
            </div>
        </div>
    );
};


export function PlayerDetailDialog({ open, onOpenChange, flatPlayer, onSaveTrainingBuild, onSaveCustomScore }: PlayerDetailDialogProps) {
  const [selectedPosition, setSelectedPosition] = React.useState<Position | undefined>();
  const [isEditingScore, setIsEditingScore] = React.useState(false);
  
  React.useEffect(() => {
    if (open && flatPlayer) {
      const positionFromTable = (flatPlayer as any).position as Position;
      
      const card = flatPlayer.card;
      const availablePositions = card.ratingsByPosition ? Object.keys(card.ratingsByPosition) as Position[] : [];

      if (positionFromTable && availablePositions.includes(positionFromTable)) {
         setSelectedPosition(positionFromTable);
      } else if (availablePositions.length > 0) {
         setSelectedPosition(availablePositions[0]);
      } else {
         setSelectedPosition(undefined);
      }

    } else {
      setSelectedPosition(undefined);
    }
    setIsEditingScore(false);
  }, [open, flatPlayer]);

  const performanceData = React.useMemo(() => {
    if (!flatPlayer) return [];
    
    const performanceMap = new Map<Position, { total: number; count: number }>();
    const card = flatPlayer.card;

    if (card && card.ratingsByPosition) {
        for (const pos in card.ratingsByPosition) {
            const position = pos as Position;
            const ratings = card.ratingsByPosition[position];
            if (ratings && ratings.length > 0) {
                const sum = ratings.reduce((a, b) => a + b, 0);
                performanceMap.set(position, {
                    total: sum,
                    count: ratings.length,
                });
            }
        }
    }

    return Array.from(performanceMap.entries()).map(([position, data]) => ({
      position,
      average: parseFloat(formatAverage(data.total / data.count)),
      matches: data.count,
    })).sort((a, b) => b.average - a.average);
    
  }, [flatPlayer]);

  const card = flatPlayer?.card;
  const player = flatPlayer?.player;
  
  const customScore = (card && selectedPosition && card.customScores?.[selectedPosition]) ?? 0;
  const availablePositions = card?.ratingsByPosition ? Object.keys(card.ratingsByPosition) as Position[] : [];

  const handleSaveScore = (score: number) => {
    if (player && card && selectedPosition) {
      onSaveCustomScore(player.id, card.id, selectedPosition, score);
      setIsEditingScore(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) setIsEditingScore(false); }}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Estadísticas de {player?.name} <span className="text-muted-foreground">({card?.name})</span></DialogTitle>
          <DialogDescription>
            Análisis detallado del rendimiento y la afiniad del jugador para esta carta.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 max-h-[70vh] overflow-y-auto pr-4">
            <Card>
              <CardHeader>
                <CardTitle>Rendimiento por Posición</CardTitle>
              </CardHeader>
              <CardContent>
                {performanceData.length > 0 ? (
                  <div style={{ width: '100%', height: 300 }}>
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
                            formatter={(value, name, props) => [`${value} (${props.payload.matches} partidos)`, "Promedio"]}
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

            <Card>
              <CardHeader>
                <CardTitle>Afinidad por Posición</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {availablePositions.length > 0 ? (
                  <>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label>Posición de la Afinidad</Label>
                      <Select value={selectedPosition} onValueChange={(v) => setSelectedPosition(v as Position)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una posición" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePositions.map(pos => (
                            <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isEditingScore && selectedPosition && card ? (
                    <CustomScoreEditor
                      position={selectedPosition}
                      card={card}
                      onSaveCustomScore={handleSaveScore}
                      onCancel={() => setIsEditingScore(false)}
                    />
                  ) : (
                    <div className="space-y-2 pt-4">
                       <div className="text-center">
                          <p className="text-6xl font-bold text-primary">{customScore}</p>
                          <p className="text-muted-foreground">Puntuación de Afinidad Manual</p>
                       </div>
                      <div className="flex justify-end pt-4">
                        <Button onClick={() => setIsEditingScore(true)} disabled={!selectedPosition}>Editar Afinidad</Button>
                      </div>
                    </div>
                  )}
                  </>
                ) : (
                  <p className="text-muted-foreground pt-4">No hay posiciones con valoraciones para definir una afinidad.</p>
                )}
              </CardContent>
            </Card>

        </div>
      </DialogContent>
    </Dialog>
  );
}
