
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FormationStats, League, Nationality } from '@/lib/types';
import { Label } from './ui/label';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { BarChart2, Star } from 'lucide-react';

type IdealTeamSetupProps = {
  formations: FormationStats[];
  selectedFormationId?: string;
  onFormationChange: (id: string) => void;
  leagues: (League | 'all')[];
  selectedLeague: League | 'all';
  onLeagueChange: (league: League | 'all') => void;
  nationalities: (Nationality | 'all')[];
  selectedNationality: Nationality | 'all';
  onNationalityChange: (nationality: Nationality | 'all') => void;
  sortBy: 'average' | 'general';
  onSortByChange: (value: 'average' | 'general') => void;
};

export function IdealTeamSetup({ 
    formations, 
    selectedFormationId, 
    onFormationChange, 
    leagues, 
    selectedLeague, 
    onLeagueChange,
    nationalities,
    selectedNationality,
    onNationalityChange,
    sortBy,
    onSortByChange,
}: IdealTeamSetupProps) {
  if (formations.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-4 border border-dashed rounded-lg">
        Aún no has creado ninguna formación. Ve a la pestaña "Formaciones" para empezar.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="space-y-2 lg:col-span-2">
        <Label>
          Plantilla Táctica
        </Label>
        <Select
          value={selectedFormationId}
          onValueChange={onFormationChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Elige una formación..." />
          </SelectTrigger>
          <SelectContent>
            {formations.map(f => (
              <SelectItem key={f.id} value={f.id}>
                {f.name} {f.creator && `- ${f.creator}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
       <div className="space-y-2">
        <Label>
          Ordenar Por
        </Label>
        <ToggleGroup 
            type="single" 
            value={sortBy} 
            onValueChange={(value: 'average' | 'general') => value && onSortByChange(value)}
            className="w-full"
        >
          <ToggleGroupItem value="average" aria-label="Ordenar por promedio" className="w-1/2">
            <BarChart2 className="mr-2 h-4 w-4" />
            Promedio
          </ToggleGroupItem>
          <ToggleGroupItem value="general" aria-label="Ordenar por general" className="w-1/2">
             <Star className="mr-2 h-4 w-4" />
            General
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="space-y-2">
        <Label>
            Filtrar por Liga (Opcional)
        </Label>
        <Select
            value={selectedLeague}
            onValueChange={(value) => onLeagueChange(value as League | 'all')}
        >
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Filtrar por liga..." />
            </SelectTrigger>
            <SelectContent>
                 <SelectItem value="all">Todas las Ligas</SelectItem>
                {leagues.filter(l => l !== 'all').map(l => (
                    <SelectItem key={l} value={l as string}>{l}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>
            Filtrar por Nacionalidad (Opcional)
        </Label>
        <Select
            value={selectedNationality}
            onValueChange={(value) => onNationalityChange(value as Nationality | 'all')}
        >
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Filtrar por nacionalidad..." />
            </SelectTrigger>
            <SelectContent>
                 <SelectItem value="all">Todas las Nacionalidades</SelectItem>
                {nationalities.filter(n => n !== 'all').map(n => (
                    <SelectItem key={n} value={n as string}>{n}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>
    </div>
  );
}
