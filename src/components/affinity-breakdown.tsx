

"use client";

import type { AffinityBreakdownResult } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { cn } from "@/lib/utils";
import type { PhysicalAttribute } from "@/lib/types";

type AffinityBreakdownProps = {
  breakdownResult: AffinityBreakdownResult;
};

const physicalAttributeKeys: (keyof PhysicalAttribute)[] = [
    'legLength'
];


export function AffinityBreakdown({ breakdownResult }: AffinityBreakdownProps) {
  const { totalAffinityScore, breakdown } = breakdownResult;

  const relevantStats = breakdown.filter(item => {
    if (physicalAttributeKeys.includes(item.stat as any)) {
      const idealRange = item.idealValue as { min?: number, max?: number } | undefined;
      return idealRange !== undefined && (idealRange.min !== undefined || idealRange.max !== undefined);
    }
    return item.idealValue !== undefined && typeof item.idealValue === 'number' && item.idealValue >= 70;
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
                     let playerValueDisplay: React.ReactNode = item.playerValue ?? '-';
                     let diff: number | null = null;
                     let diffDisplay = '';
                     let playerColor = '';

                     if (physicalAttributeKeys.includes(item.stat as any)) {
                        const idealRange = item.idealValue as { min?: number, max?: number } | undefined;
                        if (idealRange?.min !== undefined && idealRange?.max !== undefined) {
                            idealDisplay = `${idealRange.min}-${idealRange.max}`;
                        } else if (idealRange?.min !== undefined) {
                            idealDisplay = `>= ${idealRange.min}`;
                        } else if (idealRange?.max !== undefined) {
                            idealDisplay = `<= ${idealRange.max}`;
                        }

                        if (item.playerValue !== undefined) {
                            if (idealRange?.min !== undefined && item.playerValue < idealRange.min) {
                                diff = item.playerValue - idealRange.min;
                                playerColor = "text-orange-400";
                            } else if (idealRange?.max !== undefined && item.playerValue > idealRange.max) {
                                diff = item.playerValue - idealRange.max;
                                playerColor = "text-orange-400";
                            } else {
                                diff = 0; // Inside range
                                playerColor = "text-primary";
                            }
                        }
                     } else {
                        idealDisplay = String(item.idealValue || '-');
                        if (item.playerValue !== undefined && item.idealValue !== undefined) {
                            diff = item.playerValue - (item.idealValue as number);
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
