
"use client";

import * as React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
import type { Player } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe } from "lucide-react";

type NationalityDistributionProps = {
  players: Player[];
};

type NationalityData = {
  name: string;
  count: number;
};

export function NationalityDistribution({ players }: NationalityDistributionProps) {

  const nationalityCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    players.forEach(player => {
      const nat = player.nationality || "Sin Nacionalidad";
      counts.set(nat, (counts.get(nat) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [players]);

  const chartData = nationalityCounts.slice(0, 15); // Show top 15 in chart

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-accent">
            <Globe />
            Distribución por Nacionalidad
        </CardTitle>
        <CardDescription>
            Un resumen de la cantidad de jugadores que tienes de cada país.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
            <h3 className="font-semibold mb-4 text-center">Top 15 Nacionalidades</h3>
            {chartData.length > 0 ? (
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                        <YAxis 
                            type="category" 
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))"
                            width={100}
                            tick={{fontSize: 12}}
                        />
                        <Tooltip
                            contentStyle={{ 
                                background: "hsl(var(--background))", 
                                borderColor: "hsl(var(--border))" 
                            }}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                            formatter={(value) => [`${value} jugadores`, "Cantidad"]}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                            <LabelList dataKey="count" position="right" className="fill-foreground font-semibold" />
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <p className="text-muted-foreground text-center">No hay jugadores para mostrar.</p>
            )}
        </div>
        <div className="md:col-span-1">
            <h3 className="font-semibold mb-4 text-center">Lista Completa</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-4">
                {nationalityCounts.map(({name, count}) => (
                    <div key={name} className="flex justify-between items-center p-2 rounded-md bg-muted/50 text-sm">
                        <span className="font-medium">{name}</span>
                        <span className="font-bold text-primary">{count}</span>
                    </div>
                ))}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
