
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
import { positions, getAvailableStylesForPosition } from "@/lib/types";
import { getAffinityScoreFromBuild } from "@/lib/utils";
import { Beaker } from "lucide-react";
import { Badge } from "./ui/badge";
import { cn, getAverageColorClass } from '@/lib/utils';

type PlayerTesterProps = {
  idealBuilds: IdealBuilds;
};

type AffinityResult = {
    position: Position;
    style: PlayerStyle;
    affinity: number;
};

export function PlayerTester({ idealBuilds }: PlayerTesterProps) {
  const [playerBuild, setPlayerBuild] = React.useState<PlayerStatsBuild>({});
  const [affinityResults, setAffinityResults] = React.useState<AffinityResult[]>([]);

  const handleBuildChange = (newBuild: PlayerStatsBuild) => {
    setPlayerBuild(newBuild);
  };

  React.useEffect(() => {
    if (Object.keys(playerBuild).length === 0) {
      setAffinityResults([]);
      return;
    }

    const results: AffinityResult[] = [];
    
    positions.forEach(position => {
      const stylesForPos = getAvailableStylesForPosition(position, true);
      stylesForPos.forEach(style => {
        const affinity = getAffinityScoreFromBuild(playerBuild, position, style, idealBuilds);
        if (affinity > 0) {
            results.push({ position, style, affinity });
        }
      });
    });

    results.sort((a, b) => b.affinity - a.affinity);
    setAffinityResults(results.slice(0, 15)); // Show top 15 results

  }, [playerBuild, idealBuilds]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-accent">
          <Beaker />
          Probador de Jugadores
        </CardTitle>
        <CardDescription>
          Introduce la "build" de un jugador para ver su afinidad en diferentes posiciones y estilos de juego.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
            <h3 className="text-lg font-semibold mb-2">Editor de Build</h3>
            <PlayerStatsEditor playerBuild={playerBuild} onBuildChange={handleBuildChange} />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Mejores Posiciones (Top 15)</h3>
          <div className="border rounded-lg">
            <Table>
                <TableHeader>
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
                                <TableCell className="font-medium">{result.position}</TableCell>
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
