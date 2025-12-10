
"use client";

import type { AffinityBreakdownResult } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { cn } from "@/lib/utils";

type AffinityBreakdownProps = {
  breakdownResult: AffinityBreakdownResult;
};

export function AffinityBreakdown({ breakdownResult }: AffinityBreakdownProps) {
  const { totalAffinityScore, breakdown } = breakdownResult;

  const relevantStats = breakdown.filter(item => item.idealValue !== undefined && item.idealValue >= 70);

  if (relevantStats.length === 0) {
    return (
        <div className="text-center text-muted-foreground p-8">
            No se ha definido una Build Ideal para este arquetipo o las estadísticas de la build son todas menores a 70.
        </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
            <span>Desglose de Afinidad</span>
            <span className="text-primary">{totalAffinityScore.toFixed(2)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Atributo</TableHead>
                    <TableHead className="text-center">Ideal</TableHead>
                    <TableHead className="text-center">Jugador</TableHead>
                    <TableHead className="text-right">Puntaje</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {relevantStats.map(item => {
                     const scoreColor = item.score > 0 ? "text-green-400" : item.score < 0 ? "text-red-400" : "text-muted-foreground";
                     const diff = (item.playerValue || 0) - (item.idealValue || 0);

                    return (
                        <TableRow key={item.stat}>
                            <TableCell className="font-medium">{item.label}</TableCell>
                            <TableCell className="text-center">{item.idealValue}</TableCell>
                            <TableCell className="text-center font-semibold">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <span className={cn(diff > 0 ? "text-primary" : diff < 0 ? "text-orange-400" : "")}>
                                                {item.playerValue}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Diferencia: {diff > 0 ? `+${diff}` : diff}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </TableCell>
                            <TableCell className={cn("text-right font-bold", scoreColor)}>
                                {item.score.toFixed(2)}
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
