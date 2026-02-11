"use client";

import type { AffinityBreakdownResult } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { cn } from "@/lib/utils";
import type { PhysicalAttribute } from "@/lib/types";

type AffinityBreakdownProps = {
  breakdownResult: AffinityBreakdownResult;
  tacticName?: string;
};

const physicalAttributeKeys: (keyof PhysicalAttribute)[] = [
    'height', 'weight'
];


export function AffinityBreakdown({ breakdownResult, tacticName }: AffinityBreakdownProps) {
  const { totalAffinityScore, breakdown, skillsBreakdown } = breakdownResult;

  const physicalStats = breakdown.filter(item => physicalAttributeKeys.includes(item.stat as any));
  const technicalStats = breakdown.filter(item => !physicalAttributeKeys.includes(item.stat as any) && item.idealValue !== undefined && typeof item.idealValue === 'number' && item.idealValue >= 70);

  const hasSkillsBreakdown = skillsBreakdown && skillsBreakdown.length > 0;

  if (technicalStats.length === 0 && physicalStats.length === 0 && !hasSkillsBreakdown) {
    return (
        <div className="text-center text-muted-foreground p-8">
            No se ha definido una Build Ideal completa para este arquetipo o sus estadísticas y habilidades son irrelevantes.
        </div>
    );
  }

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
            <div className="flex flex-col">
                <span>Desglose de Afinidad</span>
                {tacticName && <span className="text-xs font-normal text-muted-foreground">Contexto Táctico: <span className="text-primary font-bold">{tacticName}</span></span>}
            </div>
            <span className="text-primary font-bold text-2xl">{totalAffinityScore.toFixed(2)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
          {technicalStats.length > 0 && (
            <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Atributos Técnicos</h4>
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
                        {technicalStats.map(item => {
                            const scoreColor = item.score > 0 ? "text-green-400" : item.score < 0 ? "text-red-400" : "text-muted-foreground";
                            const diff = (item.playerValue || 0) - (item.idealValue as number || 0);
                            const playerColor = diff > 0 ? "text-primary" : diff < 0 ? "text-orange-400" : "";

                            return (
                                <TableRow key={item.stat}>
                                    <TableCell className="font-medium">{item.label}</TableCell>
                                    <TableCell className="text-center">{String(item.idealValue || '-')}</TableCell>
                                    <TableCell className="text-center font-semibold">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <span className={cn(playerColor)}>
                                                        {item.playerValue ?? '-'}
                                                    </span>
                                                </TooltipTrigger>
                                                {diff !== 0 && <TooltipContent><p>Diferencia: {diff > 0 ? `+${diff}` : diff}</p></TooltipContent>}
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
            </div>
          )}

          {physicalStats.length > 0 && (
              <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-t pt-4">Requisitos Físicos</h4>
                  <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Atributo</TableHead>
                            <TableHead className="text-center">Rango Ideal</TableHead>
                            <TableHead className="text-center">Jugador</TableHead>
                            <TableHead className="text-right">Puntaje</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {physicalStats.map(item => {
                            const scoreColor = item.score > 0 ? "text-green-400" : item.score < 0 ? "text-red-400" : "text-muted-foreground";
                            const idealRange = item.idealValue as { min?: number, max?: number } | undefined;
                            
                            const minLimit = idealRange?.min && idealRange.min > 0 ? Number(idealRange.min) : undefined;
                            const maxLimit = idealRange?.max && idealRange.max > 0 ? Number(idealRange.max) : undefined;
                            const hasIdeal = minLimit !== undefined || maxLimit !== undefined;

                            let idealDisplay = 'Cualquiera';
                            if (minLimit !== undefined && maxLimit !== undefined) {
                                idealDisplay = `${minLimit}-${maxLimit}`;
                            } else if (minLimit !== undefined) {
                                idealDisplay = `>= ${minLimit}`;
                            } else if (maxLimit !== undefined) {
                                idealDisplay = `<= ${maxLimit}`;
                            }

                            const val = Number(item.playerValue);
                            let playerColor = "";
                            let diffDesc = "";

                            if (item.playerValue !== undefined && item.playerValue > 0 && hasIdeal) {
                                if ((minLimit !== undefined && val < minLimit) || (maxLimit !== undefined && val > maxLimit)) {
                                    playerColor = "text-orange-400";
                                    diffDesc = minLimit !== undefined && val < minLimit ? `Faltan ${minLimit - val} unidades` : `Excedido por ${val - (maxLimit || 0)} unidades`;
                                } else {
                                    playerColor = "text-primary";
                                    diffDesc = "Dentro del rango ideal";
                                }
                            }

                            return (
                                <TableRow key={item.stat}>
                                    <TableCell className="font-medium">{item.label}</TableCell>
                                    <TableCell className="text-center text-xs">{idealDisplay}</TableCell>
                                    <TableCell className="text-center font-semibold">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <span className={cn(playerColor)}>
                                                        {item.playerValue && item.playerValue > 0 ? item.playerValue : '-'}
                                                    </span>
                                                </TooltipTrigger>
                                                {diffDesc && <TooltipContent><p>{diffDesc}</p></TooltipContent>}
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                    <TableCell className={cn("text-right font-bold", scoreColor)}>
                                        {item.score.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                  </Table>
              </div>
          )}
      </CardContent>
    </Card>
    {hasSkillsBreakdown && (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Afinidad de Habilidades</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Habilidad Ideal</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                            <TableHead className="text-right">Puntaje</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {skillsBreakdown.map(item => (
                            <TableRow key={`${item.skill}-${item.type}`}>
                                <TableCell className="font-medium">{item.skill}</TableCell>
                                <TableCell>
                                    <span className={cn("text-xs font-semibold", item.type === 'primary' ? 'text-primary' : 'text-amber-500')}>
                                        {item.type === 'primary' ? 'Primaria' : 'Secundaria'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    {item.hasSkill ? (
                                        <span className="text-green-400 font-bold">Sí</span>
                                    ) : (
                                        <span className="text-red-400">No</span>
                                    )}
                                </TableCell>
                                <TableCell className={cn("text-right font-bold", item.score > 0 ? "text-green-400" : "text-muted-foreground")}>
                                    {item.score.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )}
    </div>
  );
}