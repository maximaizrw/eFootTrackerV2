
"use client";

import * as React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from 'recharts';
import type { Position, PlayerStatsBuild, PlayerAttribute, FlatPlayer } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { formatAverage, getPositionGroupColor, normalizeText, getRelevantAttributesForPosition } from "@/lib/utils";
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

const PlayerStatsEditor = ({ position, build: initialBuild, onSave, onCancel }: { position: Position, build: PlayerStatsBuild, onSave: (newBuild: PlayerStatsBuild) => void, onCancel: () => void }) => {
    const [build, setBuild] = React.useState<PlayerStatsBuild>(initialBuild);
    const [bulkText, setBulkText] = React.useState('');
    
    const relevantAttributes = getRelevantAttributesForPosition(position);

    const handleStatChange = (attribute: PlayerAttribute, value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 99) {
            setBuild(prev => ({ ...prev, [attribute]: numValue }));
        } else if (value === '') {
            setBuild(prev => {
                const newBuild = { ...prev };
                delete newBuild[attribute];
                return newBuild;
            });
        }
    };
    
    const handleSave = () => {
        onSave(build);
    };

    const handleBulkApply = () => {
        const lines = bulkText.split('\n').filter(line => line.trim() !== '');
        const newBuild: PlayerStatsBuild = {};

        lines.forEach((line, index) => {
            if (index < relevantAttributes.length) {
                const attribute = relevantAttributes[index];
                const value = parseInt(line.trim(), 10);
                if (!isNaN(value) && value >= 0 && value <= 99) {
                    newBuild[attribute] = value;
                }
            }
        });

        // We merge with the existing build to not lose other stats
        // if the pasted text is shorter than the list of attributes.
        setBuild(prev => ({ ...prev, ...newBuild }));
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label htmlFor="bulk-stats">Pegar Stats en bloque</Label>
                <div className="flex gap-2">
                    <Textarea 
                        id="bulk-stats"
                        placeholder="Pega aquí la lista de stats, una por línea..."
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        className="h-24 text-xs"
                    />
                    <Button onClick={handleBulkApply} type="button" variant="secondary">Aplicar</Button>
                </div>
            </div>

            <ScrollArea className="h-60">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 pr-4">
                  {relevantAttributes.map(attr => (
                      <div key={attr} className="grid grid-cols-3 items-center gap-2">
                          <Label htmlFor={attr} className="col-span-2 text-xs capitalize truncate text-muted-foreground">{normalizeText(attr).replace(/([A-Z])/g, ' $1')}</Label>
                          <Input
                              id={attr}
                              type="number"
                              min="0"
                              max="99"
                              value={build[attr] || ''}
                              onChange={(e) => handleStatChange(attr, e.target.value)}
                              className="h-8 text-center font-bold"
                              placeholder="-"
                          />
                      </div>
                  ))}
              </div>
            </ScrollArea>
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
  
  const currentBuild = (card && selectedPosition && card.statsBuilds?.[selectedPosition]) || {};
  const availablePositions = card?.ratingsByPosition ? Object.keys(card.ratingsByPosition) as Position[] : [];
  const relevantAttributes = selectedPosition ? getRelevantAttributesForPosition(selectedPosition) : [];

  const handleSave = (newBuild: PlayerStatsBuild) => {
    if (player && card && selectedPosition) {
      onSaveTrainingBuild(player.id, card.id, selectedPosition, newBuild);
      setIsEditingBuild(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) setIsEditingBuild(false); }}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Estadísticas de {player?.name} <span className="text-muted-foreground">({card?.name})</span></DialogTitle>
          <DialogDescription>
            Análisis detallado del rendimiento y la progresión de entrenamiento del jugador para esta carta.
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
                <CardTitle>Build de Estadísticas</CardTitle>
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

                  {isEditingBuild ? (
                    selectedPosition && (
                        <PlayerStatsEditor
                            position={selectedPosition}
                            build={currentBuild}
                            onSave={handleSave}
                            onCancel={() => setIsEditingBuild(false)}
                        />
                    )
                  ) : (
                    <div className="space-y-2 pt-4">
                       <ScrollArea className="h-72">
                         <div className="grid grid-cols-2 gap-x-4 gap-y-2 pr-4">
                            {relevantAttributes.map(attr => (
                                <div key={attr} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground capitalize">{normalizeText(attr).replace(/([A-Z])/g, ' $1')}</span>
                                    <span className="font-bold">{currentBuild[attr] || '-'}</span>
                                </div>
                            ))}
                         </div>
                       </ScrollArea>
                      <div className="flex justify-end pt-4">
                        <Button onClick={() => setIsEditingBuild(true)} disabled={!selectedPosition}>Editar Build</Button>
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
      </DialogContent>
    </Dialog>
  );
}
