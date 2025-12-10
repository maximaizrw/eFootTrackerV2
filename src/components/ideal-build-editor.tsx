
"use client";

import * as React from "react";
import type { Position, PlayerStyle, IdealBuild, PlayerAttributeStats } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { UploadCloud } from "lucide-react";
import { positions, playerStyles, getAvailableStylesForPosition } from "@/lib/types";

const statSchema = z.coerce.number().min(0).max(99).optional();

const buildSchema = z.object({
  position: z.enum(positions),
  style: z.enum(playerStyles),
  build: z.object({
    // Attacking
    offensiveAwareness: statSchema,
    ballControl: statSchema,
    dribbling: statSchema,
    tightPossession: statSchema,
    lowPass: statSchema,
    loftedPass: statSchema,
    finishing: statSchema,
    heading: statSchema,
    placeKicking: statSchema,
    curl: statSchema,
    // Defending
    defensiveAwareness: statSchema,
    defensiveEngagement: statSchema,
    tackling: statSchema,
    aggression: statSchema,
    // Goalkeeping
    goalkeeping: statSchema,
    gkCatching: statSchema,
    gkParrying: statSchema,
    gkReflexes: statSchema,
    gkReach: statSchema,
    // Athleticism
    speed: statSchema,
    acceleration: statSchema,
    kickingPower: statSchema,
    jump: statSchema,
    physicalContact: statSchema,
    balance: statSchema,
    stamina: statSchema,
  }),
});

type IdealBuildFormValues = z.infer<typeof buildSchema>;

type IdealBuildEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (build: IdealBuild) => void;
  initialBuild?: IdealBuild;
  existingBuilds: IdealBuild[];
};

const statFields: { category: string, fields: { name: keyof PlayerAttributeStats, label: string }[] }[] = [
    { 
        category: 'Ataque',
        fields: [
            { name: 'offensiveAwareness', label: 'Act. Ofensiva' },
            { name: 'ballControl', label: 'Control del Balón' },
            { name: 'dribbling', label: 'Regate' },
            { name: 'tightPossession', label: 'Posesión Estrecha' },
            { name: 'lowPass', label: 'Pase Raso' },
            { name: 'loftedPass', label: 'Pase Bombeado' },
            { name: 'finishing', label: 'Finalización' },
            { name: 'heading', label: 'Cabeceo' },
            { name: 'placeKicking', label: 'Balón Parado' },
            { name: 'curl', label: 'Efecto' },
        ]
    },
    {
        category: 'Defensa',
        fields: [
            { name: 'defensiveAwareness', label: 'Act. Defensiva' },
            { name: 'defensiveEngagement', label: 'Entrada' },
            { name: 'tackling', label: 'Segada' },
            { name: 'aggression', label: 'Agresividad' },
        ]
    },
    {
        category: 'Portería',
        fields: [
            { name: 'goalkeeping', label: 'Act. de Portero' },
            { name: 'gkCatching', label: 'Atajar' },
            { name: 'gkParrying', label: 'Despejar' },
            { name: 'gkReflexes', label: 'Reflejos' },
            { name: 'gkReach', label: 'Alcance' },
        ]
    },
    {
        category: 'Atletismo',
        fields: [
            { name: 'speed', label: 'Velocidad' },
            { name: 'acceleration', label: 'Aceleración' },
            { name: 'kickingPower', label: 'Potencia de Tiro' },
            { name: 'jump', label: 'Salto' },
            { name: 'physicalContact', label: 'Contacto Físico' },
            { name: 'balance', label: 'Equilibrio' },
            { name: 'stamina', label: 'Resistencia' },
        ]
    }
];

const nameToSchemaKeyMap: Record<string, keyof PlayerAttributeStats> = {
    "offensive awareness": "offensiveAwareness", "ball control": "ballControl", "dribbling": "dribbling",
    "tight possession": "tightPossession", "low pass": "lowPass", "lofted pass": "loftedPass",
    "finishing": "finishing", "heading": "heading", "place kicking": "placeKicking", "curl": "curl",
    "defensive awareness": "defensiveAwareness", "defensive engagement": "defensiveEngagement", "tackling": "tackling",
    "aggression": "aggression", "goalkeeping": "goalkeeping", "gk catching": "gkCatching", "gk parrying": "gkParrying",
    "gk reflexes": "gkReflexes", "gk reach": "gkReach", "speed": "speed", "acceleration": "acceleration",
    "kicking power": "kickingPower", "jump": "jump", "physical contact": "physicalContact", "balance": "balance", "stamina": "stamina",
};

export function IdealBuildEditor({ open, onOpenChange, onSave, initialBuild, existingBuilds }: IdealBuildEditorProps) {
  const { toast } = useToast();
  const [pastedText, setPastedText] = React.useState('');

  const form = useForm<IdealBuildFormValues>({
    resolver: zodResolver(buildSchema),
    defaultValues: {
      position: "DC",
      style: "Cazagoles",
      build: {},
    },
  });

  const { watch, reset, setValue } = form;
  const watchedPosition = watch("position");
  const isEditing = !!initialBuild?.id;

  React.useEffect(() => {
    if (open) {
      setPastedText('');
      const buildValues: Record<string, any> = {};
      statFields.forEach(cat => cat.fields.forEach(f => buildValues[f.name] = initialBuild?.build?.[f.name] ?? ''));

      if (initialBuild) {
        reset({
          position: initialBuild.position,
          style: initialBuild.style,
          build: buildValues,
        });
      } else {
        const emptyBuild: Record<string, any> = {};
        statFields.forEach(cat => cat.fields.forEach(f => emptyBuild[f.name] = ''));
        reset({
          position: "DC",
          style: "Cazagoles",
          build: emptyBuild,
        });
      }
    }
  }, [open, initialBuild, reset]);
  
  const availableStyles = React.useMemo(() => {
    return getAvailableStylesForPosition(watchedPosition, false);
  }, [watchedPosition]);

  React.useEffect(() => {
      if (!availableStyles.includes(watch('style'))) {
          setValue('style', availableStyles[0]);
      }
  }, [availableStyles, watch, setValue]);

  const handleSubmit = (values: IdealBuildFormValues) => {
    const buildId = `${values.position}-${values.style}`;
    const existingBuild = existingBuilds.find(b => b.id === buildId);

    const finalBuild: IdealBuild = {
      id: buildId,
      position: values.position,
      style: values.style,
      build: {},
    };

    if (existingBuild) {
        // Average with existing build
        statFields.forEach(category => {
            category.fields.forEach(field => {
                const key = field.name as keyof PlayerAttributeStats;
                const existingValue = existingBuild.build[key] || 0;
                const newValue = values.build[key] ? Number(values.build[key]) : 0;
                if(newValue > 0) {
                  finalBuild.build[key] = Math.round((existingValue + newValue) / 2);
                } else {
                  finalBuild.build[key] = existingValue;
                }
            });
        });
         toast({
            title: "Build Ideal Actualizada",
            description: `Se promediaron las stats para ${values.position} - ${values.style}.`,
        });

    } else {
        // Create new build
        statFields.forEach(category => {
            category.fields.forEach(field => {
                const key = field.name as keyof PlayerAttributeStats;
                const value = values.build[key];
                if (value !== '' && value !== null && value !== undefined && !isNaN(Number(value))) {
                    finalBuild.build[key] = Number(value);
                }
            });
        });
    }
    
    onSave(finalBuild);
    onOpenChange(false);
  };

  const handleParseText = () => {
    const lines = pastedText.split('\n');
    let parsedCount = 0;
    
    lines.forEach(line => {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length < 2) return;

      const value = parseInt(parts[parts.length - 1], 10);
      if (isNaN(value)) return;
      
      const namePart = parts.slice(0, -1).join(' ').replace('●', '').trim().toLowerCase();
      
      const schemaKey = nameToSchemaKeyMap[namePart];
      if (schemaKey) {
        form.setValue(`build.${schemaKey as any}`, value, { shouldValidate: true });
        parsedCount++;
      }
    });

    if (parsedCount > 0) {
      toast({
        title: "Estadísticas Cargadas",
        description: `Se han cargado ${parsedCount} atributos en el formulario.`,
      });
      setPastedText('');
    } else {
       toast({
        variant: "destructive",
        title: "Error al Cargar",
        description: "No se pudieron encontrar atributos válidos. Revisa el formato del texto.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar' : 'Añadir'} Build Ideal</DialogTitle>
          <DialogDescription>
            {isEditing 
                ? 'Edita las estadísticas finales para este arquetipo.' 
                : 'Define las estadísticas finales para un arquetipo. Si ya existe, se promediará.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-grow overflow-hidden flex flex-col">
            <ScrollArea className="flex-grow pr-4 -mr-4">
              <div className="space-y-6 pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Posición</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona posición" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="style"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estilo de Juego</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona estilo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableStyles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                    <Textarea
                        placeholder="Pega aquí las estadísticas del jugador para cargarlas automáticamente..."
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        className="min-h-[60px]"
                    />
                    <Button type="button" onClick={handleParseText} disabled={!pastedText} size="sm">
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Cargar desde Texto
                    </Button>
                </div>
                
                {statFields.map((category) => (
                  <div key={category.category}>
                    <h3 className="text-lg font-semibold mb-3 text-primary">{category.category}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
                      {category.fields.map((field) => (
                        <FormField
                          key={field.name}
                          control={form.control}
                          name={`build.${field.name as any}`}
                          render={({ field: formField }) => (
                            <FormItem>
                              <FormLabel className="text-xs">{field.label}</FormLabel>
                              <FormControl>
                                <Input type="number" min="40" max="99" {...formField} onChange={e => formField.onChange(e.target.value)} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter className="flex-shrink-0 pt-4 mt-4 border-t">
              <Button type="submit">{isEditing ? 'Guardar Cambios' : 'Guardar Build Ideal'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
