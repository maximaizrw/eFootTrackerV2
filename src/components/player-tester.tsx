
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { PlayerStatsEditor } from "./player-stats-editor";
import type { IdealBuilds, PlayerStatsBuild, Position, PlayerStyle } from "@/lib/types";
import { getAvailableStylesForPosition } from "@/lib/types";
import { getAffinityScoreFromBuild } from "@/lib/utils";
import { Beaker, Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "./ui/badge";
import { cn, getAverageColorClass } from '@/lib/utils';
import { ScrollArea } from "./ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Label } from "./ui/label";

type PlayerTesterProps = {
  idealBuilds: IdealBuilds;
};

type AffinityResult = {
    positionLabel: string;
    style: PlayerStyle;
    affinity: number;
};

const buildPositions = [
  { label: 'PT', value: ['PT'] },
  { label: 'DFC', value: ['DFC'] },
  { label: 'Laterales', value: ['LI', 'LD'] },
  { label: 'MCD', value: ['MCD'] },
  { label: 'MC', value: ['MC'] },
  { label: 'Interiores', value: ['MDI', 'MDD'] },
  { label: 'MO', value: ['MO'] },
  { label: 'Extremos', value: ['EXI', 'EXD'] },
  { label: 'SD', value: ['SD'] },
  { label: 'DC', value: ['DC'] },
];

export function PlayerTester({ idealBuilds }: PlayerTesterProps) {
  const [playerBuild, setPlayerBuild] = React.useState<PlayerStatsBuild>({});
  const [affinityResults, setAffinityResults] = React.useState<AffinityResult[]>([]);
  const [selectedPositions, setSelectedPositions] = React.useState<Set<string>>(new Set(buildPositions.map(p => p.label)));

  const handleBuildChange = (newBuild: PlayerStatsBuild) => {
    setPlayerBuild(newBuild);
  };
  
  const handlePositionToggle = (positionLabel: string) => {
    setSelectedPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(positionLabel)) {
        newSet.delete(positionLabel);
      } else {
        newSet.add(positionLabel);
      }
      return newSet;
    });
  };

  React.useEffect(() => {
    if (Object.keys(playerBuild).length === 0) {
      setAffinityResults([]);
      return;
    }

    const results: AffinityResult[] = [];
    
    const positionsToTest = buildPositions.filter(p => selectedPositions.has(p.label));

    positionsToTest.forEach(({ label, value: positions }) => {
      const representativePosition = positions[0];
      const stylesForPos = getAvailableStylesForPosition(representativePosition, true);
      
      stylesForPos.forEach(style => {
        const affinity = getAffinityScoreFromBuild(playerBuild, representativePosition, style, idealBuilds);
        if (affinity > 0) {
            results.push({ positionLabel: label, style, affinity });
        }
      });
    });

    results.sort((a, b) => b.affinity - a.affinity);
    setAffinityResults(results);

  }, [playerBuild, idealBuilds, selectedPositions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-accent">
          <Beaker />
          Probador de Jugadores
        </CardTitle>
        <CardDescription>
          Introduce la "build" de un jugador para ver su afinidad en las posiciones y estilos de juego que selecciones.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Editor de Build</h3>
            <PlayerStatsEditor playerBuild={playerBuild} onBuildChange={handleBuildChange} />
        </div>
        <div className="flex flex-col gap-4">
            <div>
              <Label>Posiciones a Probar</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between mt-1"
                  >
                    <span className="truncate">
                      {selectedPositions.size === buildPositions.length
                        ? "Todas las posiciones"
                        : `${selectedPositions.size} seleccionadas`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar posición..." />
                    <CommandList>
                      <CommandEmpty>No se encontró la posición.</CommandEmpty>
                      {buildPositions.map((pos) => (
                        <CommandItem
                          key={pos.label}
                          value={pos.label}
                          onSelect={() => handlePositionToggle(pos.label)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedPositions.has(pos.label) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {pos.label}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          <div className="flex-grow flex flex-col overflow-hidden">
            <h3 className="text-lg font-semibold mb-2">Resultados de Afinidad</h3>
            <div className="border rounded-lg flex-grow overflow-hidden">
              <ScrollArea className="h-[500px]">
                <Table>
                    <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                        <TableRow>
                            <TableHead className="w-[100px]">Posición</TableHead>
                            <TableHead>Estilo de Juego</TableHead>
                            <TableHead className="text-right">Afinidad</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {affinityResults.length > 0 ? (
                            affinityResults.map((result, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{result.positionLabel}</TableCell>
                                    <TableCell>
                                        {result.style !== 'Ninguno' ? <Badge variant="secondary">{result.style}</Badge> : <span className="text-muted-foreground">-</span>}
                                    </TableCell>
                                    <TableCell className={cn("text-right font-bold text-lg", getAverageColorClass(result.affinity / 10))}>
                                        {result.affinity.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                    Introduce una build para ver los resultados.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
