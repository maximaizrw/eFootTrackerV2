
"use client";

import * as React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from 'recharts';
import type { Position, PlayerStatsBuild, PlayerAttribute, FlatPlayer, ProgressionBuild } from "@/lib/types";
import { progressionCategories, statPasteOrder } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { formatAverage, getPositionGroupColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";

type PlayerDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flatPlayer: FlatPlayer | null;
  onSaveTrainingBuild: (playerId: string, cardId: string, position: Position, build: PlayerStatsBuild) => void;
};

type PerformanceData = {
  position: Position;
  average: number;
  matches: number;
};


const BuildEditor = ({ position, card, onSaveTrainingBuild, onCancel }: { position: Position, card: FlatPlayer['card'], onSaveTrainingBuild: (build: PlayerStatsBuild) => void, onCancel: () => void }) => {
    const initialBuild = card.statsBuilds?.[position];
    const [stats, setStats] = React.useState<PlayerStatsBuild['stats']>(initialBuild?.stats || {});
    const [progression, setProgression] = React.useState<PlayerStatsBuild['progression']>(initialBuild?.progression || {});
    const [pasteValue, setPasteValue] = React.useState('');

    React.useEffect(() => {
        const build = card.statsBuilds?.[position];
        setStats(build?.stats || {});
        setProgression(build?.progression || {});
        setPasteValue('');
    }, [card, position]);


    const handleStatChange = (attr: PlayerAttribute, value: string) => {
        const numValue = parseInt(value, 10);
        setStats(prev => ({ ...prev, [attr]: isNaN(numValue) ? undefined : numValue }));
    };
    
    const handleProgressionChange = (cat: ProgressionCategory, value: number) => {
        setProgression(prev => ({...prev, [cat]: value}));
    };

    const handlePasteAndFill = () => {
        const numbers = pasteValue.trim().split(/\s+/).map(s => parseInt(s, 10)).filter(n => !isNaN(n));
        
        const newStats: PlayerStatsBuild['stats'] = {};
        statPasteOrder.forEach((attr, index) => {
            if (numbers[index] !== undefined) {
                newStats[attr] = numbers[index];
            }
        });
        setStats(prev => ({ ...prev, ...newStats }));
    };

    const handleSave = () => {
        onSaveTrainingBuild({ stats, progression });
    };
    
    const allAttributes: PlayerAttribute[] = [
      ...statPasteOrder,
      'defensiveAwareness', 'tackling', 'defensiveEngagement',
      'gkAwareness', 'gkCatching', 'gkClearing', 'gkReflexes', 'gkReach'
    ];


    return (
        <div className="space-y-4 pt-4">
            <h3 className="font-semibold text-lg text-center">Editor de Build para {position}</h3>
            
            <div className="space-y-2">
                <Label htmlFor="quick-paste-stats">Pegado Rápido de Stats</Label>
                <div className="flex gap-2">
                    <Textarea 
                        id="quick-paste-stats"
                        placeholder="Pega las 14 estadísticas aquí, separadas por espacios o saltos de línea."
                        value={pasteValue}
                        onChange={(e) => setPasteValue(e.target.value)}
                        className="h-24 text-xs"
                    />
                    <Button onClick={handlePasteAndFill} type="button">Pegar y Rellenar</Button>
                </div>
            </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Estadísticas del Jugador</Label>
                    <ScrollArea className="h-64 border rounded-md p-4">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                           {allAttributes.map(attr => (
                                <div key={attr} className="grid grid-cols-2 items-center gap-2">
                                <Label htmlFor={`stat-${attr}`} className="text-xs capitalize">{attr.replace(/([A-Z])/g, ' $1')}</Label>
                                <Input
                                    id={`stat-${attr}`}
                                    type="number"
                                    min="40"
                                    max="99"
                                    value={stats?.[attr] || ''}
                                    onChange={(e) => handleStatChange(attr, e.target.value)}
                                    className="h-8 text-center"
                                />
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                 <div className="space-y-2">
                    <Label>Puntos de Progresión</Label>
                    <div className="space-y-3 rounded-md border p-4 h-64">
                        {progressionCategories.map(cat => (
                            <div key={cat} className="space-y-1">
                                <Label htmlFor={`prog-${cat}`} className="text-xs capitalize">{cat.replace(/([A-Z])/g, ' $1')}: {progression?.[cat] || 0}</Label>
                                <Input
                                    id={`prog-${cat}`}
                                    type="number"
                                    min="0"
                                    max="12"
                                    value={progression?.[cat] || 0}
                                    onChange={(e) => handleProgressionChange(cat, parseInt(e.target.value, 10) || 0)}
                                    className="h-8 text-center"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex justify-end items-center pt-4 border-t border-border">
                <div className="flex gap-2">
                    <Button onClick={onCancel} variant="outline">Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Build</Button>
                </div>
            </div>
        </div>
    );
};


export function PlayerDetailDialog({ open, onOpenChange, flatPlayer, onSaveTrainingBuild }: PlayerDetailDialogProps) {
  const [selectedPosition, setSelectedPosition] = React.useState<Position | undefined>();
  const [isEditingBuild, setIsEditingBuild] = React.useState(false);
  
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
    setIsEditingBuild(false);
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
  
  const availablePositions = card?.ratingsByPosition ? Object.keys(card.ratingsByPosition) as Position[] : [];

  const handleSaveBuild = (build: PlayerStatsBuild) => {
    if (player && card && selectedPosition) {
      onSaveTrainingBuild(player.id, card.id, selectedPosition, build);
      setIsEditingBuild(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) setIsEditingBuild(false); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Estadísticas de {player?.name} <span className="text-muted-foreground">({card?.name})</span></DialogTitle>
          <DialogDescription>
            Análisis detallado del rendimiento y la build de entrenamiento del jugador para esta carta.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4 -mr-4">
            <div className="grid grid-cols-1 gap-6 mt-4">
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
                    <CardTitle>Build de Entrenamiento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {availablePositions.length > 0 ? (
                      <>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label>Posición de la Build</Label>
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

                      {isEditingBuild && selectedPosition && card ? (
                        <BuildEditor
                          position={selectedPosition}
                          card={card}
                          onSaveTrainingBuild={handleSaveBuild}
                          onCancel={() => setIsEditingBuild(false)}
                        />
                      ) : (
                        <div className="space-y-2 pt-4">
                          {selectedPosition && card?.statsBuilds?.[selectedPosition]?.stats ? (
                             <div className="text-sm space-y-1">
                                <p className="font-semibold">Build guardada para {selectedPosition}</p>
                                 <p className="text-muted-foreground">Esta es la progresión guardada para esta posición.</p>
                             </div>
                          ) : (
                             <p className="text-muted-foreground pt-4 text-center">No hay build de entrenamiento guardada para esta posición.</p>
                          )}
                          <div className="flex justify-end pt-4">
                            <Button onClick={() => setIsEditingBuild(true)} disabled={!selectedPosition}>
                              {card?.statsBuilds?.[selectedPosition] ? 'Editar Build' : 'Crear Build'}
                            </Button>
                          </div>
                        </div>
                      )}
                      </>
                    ) : (
                      <p className="text-muted-foreground pt-4">No hay posiciones con valoraciones para definir una build.</p>
                    )}
                  </CardContent>
                </Card>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

    