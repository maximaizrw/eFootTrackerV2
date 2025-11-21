
"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { playerAttributes } from "@/lib/types";
import type { PlayerStatsBuild } from "@/lib/types";
import { cn } from "@/lib/utils";

type AffinityCalculationTableProps = {
  playerBuild?: PlayerStatsBuild;
  idealBuild?: PlayerStatsBuild;
};

const statLabels: Record<string, string> = {
  offensiveAwareness: "Off. Awareness", ballControl: "Ball Control", dribbling: "Dribbling",
  tightPossession: "Tight Poss.", lowPass: "Low Pass", loftedPass: "Lofted Pass",
  finishing: "Finishing", heading: "Heading", setPieceTaking: "Place Kicking", curl: "Curl",
  defensiveAwareness: "Def. Awareness", defensiveEngagement: "Def. Engagement", tackling: "Tackling",
  aggression: "Aggression", gkAwareness: "GK Awareness", gkCatching: "GK Catching",
  gkParrying: "GK Parrying", gkReflexes: "GK Reflexes", gkReach: "GK Reach", speed: "Speed",
  acceleration: "Acceleration", kickingPower: "Kicking Power", jump: "Jump",
  physicalContact: "Physical Contact", balance: "Balance", stamina: "Stamina",
};

export function AffinityCalculationTable({ playerBuild, idealBuild }: AffinityCalculationTableProps) {
  if (!playerBuild || !idealBuild) {
    return <p>Faltan datos de la build para el cálculo.</p>;
  }

  let totalScoreSum = 0;

  const calculationRows = playerAttributes.map(attr => {
    const playerStat = playerBuild[attr] || 0;
    const idealStat = idealBuild[attr] || 0;
    const difference = playerStat - idealStat;

    let statScore = 0;
    if (difference >= 5) {
      statScore = Math.floor(difference / 5) * 0.25;
    } else if (difference <= -5) {
      const blocks = Math.floor(Math.abs(difference) / 5);
      statScore = difference * (1 + 0.25 * (blocks - 1));
    }
    
    totalScoreSum += statScore;

    return {
      name: statLabels[attr] || attr,
      idealStat,
      playerStat,
      difference,
      statScore,
    };
  });

  const finalAffinity = 100 + totalScoreSum;

  const getDifferenceColor = (diff: number) => {
    if (diff > 0) return "text-green-500";
    if (diff < 0) return "text-red-500";
    return "text-muted-foreground";
  };
  
  const getTotalColor = (total: number) => {
    if (total > 0) return "text-green-600";
    if (total < 0) return "text-red-600";
    return "";
  };

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Estadística</TableHead>
            <TableHead className="text-center">Ideal</TableHead>
            <TableHead className="text-center">Jugador</TableHead>
            <TableHead className="text-center">Diferencia</TableHead>
            <TableHead className="text-right">Puntuación</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calculationRows.map(row => (
            <TableRow key={row.name}>
              <TableCell className="font-medium py-1">{row.name}</TableCell>
              <TableCell className="text-center py-1">{row.idealStat}</TableCell>
              <TableCell className="text-center font-semibold py-1">{row.playerStat}</TableCell>
              <TableCell className={cn("text-center font-semibold py-1", getDifferenceColor(row.difference))}>
                {row.difference > 0 ? `+${row.difference}` : row.difference}
              </TableCell>
              <TableCell className={cn("text-right font-bold py-1", getTotalColor(row.statScore))}>
                {row.statScore.toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4 pr-4">
        <div className="flex justify-end items-baseline gap-4 text-right">
            <span className="text-sm font-medium text-muted-foreground">Suma de Puntuaciones:</span>
            <span className={cn("text-lg font-bold", getTotalColor(totalScoreSum))}>{totalScoreSum.toFixed(2)}</span>
        </div>
        <div className="flex justify-end items-baseline gap-4 text-right mt-1 border-t pt-2">
            <span className="text-lg font-bold">Afinidad Total (Suma + 100):</span>
            <span className="text-2xl font-extrabold text-primary">{finalAffinity.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
