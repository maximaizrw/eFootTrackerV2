
"use client";

import * as React from "react";
import type { Player, PlayerCard, PlayerAttributeStats } from "@/lib/types";
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
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { UploadCloud, Footprints } from "lucide-react";

const statSchema = z.coerce.number().min(0).max(99).optional();

const formSchema = z.object({
    legLength: z.coerce.number().min(1).max(14).optional(),
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
});

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


type EditStatsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveStats: (playerId: string, cardId: string, stats: PlayerAttributeStats, legLength?: number) => void;
  initialData?: {
    player: Player;
    card: PlayerCard;
  };
};

export function EditStatsDialog({ open, onOpenChange, onSaveStats, initialData }: EditStatsDialogProps) {
  const [pastedText, setPastedText] = React.useState('');
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  React.useEffect(() => {
    if (open) {
      const defaultValues: Record<string, any> = {
        legLength: initialData?.card?.legLength ?? ''
      };
      statFields.forEach(cat => cat.fields.forEach(f => defaultValues[f.name] = initialData?.card?.attributeStats?.[f.name] ?? ''));
      form.reset(defaultValues);
    }
    setPastedText('');
  }, [open, initialData, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    if (initialData) {
        const { legLength, ...stats } = values;
        const cleanedValues: PlayerAttributeStats = {};
        for (const key in stats) {
            const typedKey = key as keyof PlayerAttributeStats;
            const value = stats[typedKey];
            if (value !== '' && value !== null && value !== undefined && !isNaN(Number(value))) {
                cleanedValues[typedKey] = Number(value);
            }
        }
      onSaveStats(initialData.player.id, initialData.card.id, cleanedValues, legLength);
      onOpenChange(false);
    }
  };

  const handleParseText = () => {
    const lines = pastedText.split('\n').filter(line => line.trim() !== '');
    let parsedCount = 0;
    const currentLegLength = form.getValues('legLength'); // Preserve current leg length
    
    // Check if the format is just numbers
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
                form.setValue(schemaKey, value, { shouldValidate: true });
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
                form.setValue(schemaKey, value, { shouldValidate: true });
                parsedCount++;
            }
        });
    }
    
    // Restore leg length
    form.setValue('legLength', currentLegLength);

    if (parsedCount > 0) {
      toast({
        title: "Estadísticas Cargadas",
        description: `Se han cargado ${parsedCount} atributos desde el texto.`,
      });
      setPastedText('');
    } else {
       toast({
        variant: "destructive",
        title: "Error al Cargar",
        description: "No se pudieron encontrar atributos válidos en el texto. Revisa el formato.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Atributos de la Carta</DialogTitle>
          {initialData && (
            <DialogDescription>
              {`Editando atributos para ${initialData.player.name} - ${initialData.card.name}`}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-2">
            <Textarea
                placeholder="Pega aquí las estadísticas del jugador para cargarlas automáticamente..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="min-h-[60px]"
            />
            <Button onClick={handleParseText} disabled={!pastedText} size="sm">
                <UploadCloud className="mr-2 h-4 w-4" />
                Cargar desde Texto
            </Button>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-grow overflow-hidden flex flex-col pt-4">
            <ScrollArea className="flex-grow pr-4 -mr-4">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="legLength"
                  render={({ field }) => (
                    <FormItem className="max-w-xs mx-auto">
                      <FormLabel className="flex items-center gap-2 justify-center text-base">
                        <Footprints />
                        Longitud de Piernas (1-14)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="14"
                          {...field}
                          value={field.value ?? ''}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                          className="text-center text-lg font-bold"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {statFields.map((category) => (
                  <div key={category.category}>
                    <h3 className="text-lg font-semibold mb-3 text-primary">{category.category}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
                      {category.fields.map((field) => (
                        <FormField
                          key={field.name}
                          control={form.control}
                          name={field.name}
                          render={({ field: formField }) => (
                            <FormItem>
                              <FormLabel className="text-xs">{field.label}</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" max="99" {...formField} value={formField.value ?? ''} onChange={e => formField.onChange(e.target.value === '' ? undefined : e.target.value)} />
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
            <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
              <Button type="submit">Guardar Atributos</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
