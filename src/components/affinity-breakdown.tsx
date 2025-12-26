
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

  const relevantStats = breakdown.filter(item => {
    if (item.stat === 'legLength') {
      return item.idealValue !== undefined && item.idealValue.min !== undefined;
    }
    return item.idealValue !== undefined && item.idealValue >= 70;
  });

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
                     
                     let idealDisplay = '-';
                     let playerValueDisplay: React.ReactNode = item.playerValue || '-';
                     let diff: number | null = null;
                     let diffDisplay = '';
                     let playerColor = '';

                     if (item.stat === 'legLength') {
                        const idealRange = item.idealValue as { min?: number, max?: number } | undefined;
                        if (idealRange?.min && idealRange?.max) {
                            idealDisplay = `${idealRange.min}-${idealRange.max}`;
                        } else if (idealRange?.min) {
                            idealDisplay = `>= ${idealRange.min}`;
                        }
                        if (item.playerValue !== undefined && idealRange?.min !== undefined) {
                            if(item.playerValue < idealRange.min) {
                                diff = item.playerValue - idealRange.min;
                                playerColor = "text-orange-400";
                            } else if (idealRange.max !== undefined && item.playerValue > idealRange.max) {
                                diff = item.playerValue - idealRange.max;
                                playerColor = "text-primary";
                            } else {
                                diff = 0; // Inside range
                                playerColor = "text-primary";
                            }
                        }
                     } else {
                        idealDisplay = String(item.idealValue || '-');
                        if (item.playerValue !== undefined && item.idealValue !== undefined) {
                            diff = item.playerValue - item.idealValue;
                            playerColor = diff > 0 ? "text-primary" : diff < 0 ? "text-orange-400" : "";
                        }
                     }

                    if (diff !== null) {
                        diffDisplay = `Diferencia: ${diff > 0 ? `+${diff}` : diff}`;
                    }

                    return (
                        <TableRow key={item.stat}>
                            <TableCell className="font-medium">{item.label}</TableCell>
                            <TableCell className="text-center">{idealDisplay}</TableCell>
                            <TableCell className="text-center font-semibold">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <span className={cn(playerColor)}>
                                                {playerValueDisplay}
                                            </span>
                                        </TooltipTrigger>
                                        {diffDisplay && <TooltipContent><p>{diffDisplay}</p></TooltipContent>}
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
