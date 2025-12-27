

"use client";

import * as React from "react";
import type { BuildPosition, PlayerStyle, IdealBuild, PlayerAttributeStats, PhysicalAttribute } from "@/lib/types";
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
import { UploadCloud, Footprints } from "lucide-react";
import { buildPositions, playerStyles, getAvailableStylesForPosition, positionLabels } from "@/lib/types";

const statSchema = z.coerce.number().min(0).max(99).optional();
const physicalSchema = z.coerce.number().optional();

const minMaxSchema = z.object({
  min: physicalSchema,
  max: physicalSchema,
}).optional();


const buildSchema = z.object({
  position: z.enum(buildPositions),
  style: z.enum(playerStyles),
  // Physical
  legLength: minMaxSchema,
  // Build
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

const orderedStatFields: (keyof PlayerAttributeStats)[] = statFields.flatMap(category => category.fields.map(field => field.name));


export function IdealBuildEditor({ open, onOpenChange, onSave, initialBuild, existingBuilds }: IdealBuildEditorProps) {
  const { toast } = useToast();
  const [pastedText, setPastedText] = React.useState('');

  const form = useForm<IdealBuildFormValues>({
    resolver: zodResolver(buildSchema),
    defaultValues: {
      position: "DC",
      style: "Cazagoles",
      legLength: { min: undefined, max: undefined },
      build: {},
    },
  });

  const { watch, reset, setValue, getValues } = form;
  const watchedPosition = watch("position");
  const isEditing = !!initialBuild?.id;

  React.useEffect(() => {
    if (open) {
      setPastedText('');
      const defaultBuild: Record<string, any> = {};
      statFields.forEach(cat => cat.fields.forEach(f => defaultBuild[f.name] = ''));

      const defaultValues: IdealBuildFormValues = {
        position: "DC",
        style: "Cazagoles",
        legLength: { min: undefined, max: undefined },
        build: defaultBuild,
      };

      if (initialBuild) {
        const initialBuildValues: Record<string, any> = {};
        statFields.forEach(cat => cat.fields.forEach(f => initialBuildValues[f.name] = initialBuild?.build?.[f.name] ?? ''));
        
        const mergedInitial: IdealBuildFormValues = {
          ...defaultValues,
          position: initialBuild.position,
          style: initialBuild.style,
          legLength: { min: initialBuild.legLength?.min || undefined, max: initialBuild.legLength?.max || undefined },
          build: initialBuildValues,
        };
        reset(mergedInitial);
      } else {
        reset(defaultValues);
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
    
    const finalBuild: IdealBuild = {
      id: buildId,
      position: values.position,
      style: values.style,
      legLength: { min: values.legLength?.min, max: values.legLength?.max },
      build: {},
    };

    statFields.forEach(category => {
        category.fields.forEach(field => {
            const key = field.name as keyof PlayerAttributeStats;
            const value = values.build[key];
            if (value !== '' && value !== null && value !== undefined && !isNaN(Number(value))) {
                finalBuild.build[key] = Number(value);
            }
        });
    });
    
    onSave(finalBuild);
    onOpenChange(false);
  };

  const handleParseText = () => {
    const lines = pastedText.split('\n').filter(line => line.trim() !== '');
    let parsedCount = 0;
    
    const currentLegLength = getValues("legLength");

    const isNumericOnly = lines.every(line => /^\d+\s*$/.test(line.trim()));

    if (isNumericOnly) {
        if (lines.length !== orderedStatFields.length) {
            toast({
                variant: "destructive",
                title: "Error de Formato",
                description: `Se esperaban ${orderedStatFields.length} atributos, pero se encontraron ${lines.length}.`,
            });
            return;
        }
        lines.forEach((line, index) => {
            const value = parseInt(line.trim(), 10);
            const schemaKey = orderedStatFields[index];
            if (schemaKey) {
                form.setValue(`build.${schemaKey}`, value, { shouldValidate: true });
                parsedCount++;
            }
        });
    } else {
        lines.forEach(line => {
            const parts = line.split(/\s+/).filter(Boolean);
            if (parts.length < 2) return;

            const value = parseInt(parts[parts.length - 1], 10);
            if (isNaN(value)) return;
            
            const namePart = parts.slice(0, -1).join(' ').replace('●', '').trim().toLowerCase();
            
            const schemaKey = nameToSchemaKeyMap[namePart];
            if (schemaKey) {
                form.setValue(`build.${schemaKey}`, value, { shouldValidate: true });
                parsedCount++;
            }
        });
    }

    setValue("legLength", currentLegLength);

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
                ? 'Añade nuevas stats para promediar o edita las existentes.' 
                : 'Define las estadísticas finales para un arquetipo. Si ya existe, se promediará automáticamente.'}
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
                            {buildPositions.map(p => <SelectItem key={p} value={p}>{positionLabels[p]}</SelectItem>)}
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
                
                 <div className="p-4 rounded-lg border bg-background/50 space-y-4">
                    <h3 className="text-lg font-semibold mb-3 text-primary text-center">Rango de Medida Física Ideal</h3>
                    <div>
                        <FormLabel className="text-base mb-2 block text-center">Largo de Piernas</FormLabel>
                        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                            <FormField
                                control={form.control}
                                name="legLength.min"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm">Mínimo Ideal</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                                                className="text-center"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="legLength.max"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm">Máximo Ideal</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                                                className="text-center"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
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
                                <Input type="number" min="40" max="99" {...formField} value={formField.value ?? ''} onChange={e => formField.onChange(e.target.value === '' ? undefined : e.target.value)} />
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
