"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, ChevronsUpDown, PlusCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  nationalities,
  playerStyles,
  leagues,
  positions,
  playerSkillsList,
  type Player,
  type Nationality,
  type PlayerStyle,
  type League,
  type Position,
  type PlayerAttributeStats,
} from "@/lib/types";

const statSchema = z.coerce.number().min(0).max(99).optional();

const formSchema = z.object({
  playerId: z.string().optional(),
  playerName: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  cardName: z.string().min(2, "El nombre de la carta debe tener al menos 2 caracteres."),
  imageUrl: z.string().min(1, "La imagen es requerida."),
  nationality: z.enum(nationalities).optional(),
  style: z.enum(playerStyles).optional(),
  league: z.enum(leagues).optional(),
  ratingEntries: z.array(z.object({
    position: z.enum(positions),
    rating: z.number().min(1).max(10),
  })).optional(),
  height: z.coerce.number().min(100).max(230).optional(),
  weight: z.coerce.number().min(40).max(150).optional(),
  skills: z.array(z.string()).optional(),
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
  defensiveAwareness: statSchema,
  defensiveEngagement: statSchema,
  tackling: statSchema,
  aggression: statSchema,
  goalkeeping: statSchema,
  gkCatching: statSchema,
  gkParrying: statSchema,
  gkReflexes: statSchema,
  gkReach: statSchema,
  speed: statSchema,
  acceleration: statSchema,
  kickingPower: statSchema,
  jump: statSchema,
  physicalContact: statSchema,
  balance: statSchema,
  stamina: statSchema,
});

export type AddPlayerFormValues = z.infer<typeof formSchema>;

const statFields: { category: string; fields: { name: keyof PlayerAttributeStats; label: string }[] }[] = [
  {
    category: "Ataque",
    fields: [
      { name: "offensiveAwareness", label: "Act. Ofensiva" },
      { name: "ballControl", label: "Control de Balón" },
      { name: "dribbling", label: "Regate" },
      { name: "tightPossession", label: "Posesión Estrecha" },
      { name: "lowPass", label: "Pase Raso" },
      { name: "loftedPass", label: "Pase Bombeado" },
      { name: "finishing", label: "Finalización" },
      { name: "heading", label: "Cabeceo" },
      { name: "placeKicking", label: "Balón Parado" },
      { name: "curl", label: "Efecto" },
    ],
  },
  {
    category: "Defensa",
    fields: [
      { name: "defensiveAwareness", label: "Act. Defensiva" },
      { name: "defensiveEngagement", label: "Dedicación Defensiva" },
      { name: "tackling", label: "Entrada" },
      { name: "aggression", label: "Agresividad" },
    ],
  },
  {
    category: "Portería",
    fields: [
      { name: "goalkeeping", label: "Act. de Portero" },
      { name: "gkCatching", label: "Atajar" },
      { name: "gkParrying", label: "Parada" },
      { name: "gkReflexes", label: "Reflejos" },
      { name: "gkReach", label: "Cobertura" },
    ],
  },
  {
    category: "Atletismo",
    fields: [
      { name: "speed", label: "Velocidad" },
      { name: "acceleration", label: "Aceleración" },
      { name: "kickingPower", label: "Potencia de Tiro" },
      { name: "jump", label: "Salto" },
      { name: "physicalContact", label: "Contacto Físico" },
      { name: "balance", label: "Equilibrio" },
      { name: "stamina", label: "Resistencia" },
    ],
  },
];

type AddPlayerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPlayer: (values: AddPlayerFormValues) => void;
  players: Player[];
};

export function AddPlayerDialog({ open, onOpenChange, onAddPlayer, players }: AddPlayerDialogProps) {
  const [playerPopoverOpen, setPlayerPopoverOpen] = useState(false);
  const [skillsPopoverOpen, setSkillsPopoverOpen] = useState(false);

  const form = useForm<AddPlayerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      playerId: undefined,
      playerName: "",
      cardName: "",
      imageUrl: "",
      nationality: "Sin Nacionalidad",
      style: "Ninguno",
      league: "Sin Liga",
      ratingEntries: [],
      skills: [],
    },
  });

  const { fields: ratingFields, append: appendRating, remove: removeRating } = useFieldArray({
    control: form.control,
    name: "ratingEntries",
  });

  const watchedSkills = form.watch("skills") || [];
  const watchedEntries = form.watch("ratingEntries") || [];
  const playerIdValue = form.watch("playerId");
  const isExistingPlayer = !!playerIdValue;

  useEffect(() => {
    if (open) {
      form.reset({
        playerId: undefined,
        playerName: "",
        cardName: "",
        imageUrl: "",
        nationality: "Sin Nacionalidad" as Nationality,
        style: "Ninguno" as PlayerStyle,
        league: "Sin Liga" as League,
        ratingEntries: [],
        skills: [],
      });
    }
  }, [open, form]);

  function onSubmit(values: AddPlayerFormValues) {
    onAddPlayer(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nueva Carta de Jugador</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <Tabs defaultValue="ficha" className="flex flex-col flex-1 min-h-0">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="ficha">Ficha</TabsTrigger>
                <TabsTrigger value="posiciones">
                  Posiciones{ratingFields.length > 0 && <span className="ml-1 text-primary font-bold">({ratingFields.length})</span>}
                </TabsTrigger>
                <TabsTrigger value="atributos">Atributos</TabsTrigger>
                <TabsTrigger value="habilidades">Skills</TabsTrigger>
              </TabsList>

              {/* ── TAB 1: FICHA ── */}
              <TabsContent value="ficha" className="flex-1 overflow-auto">
                <div className="space-y-4 pr-1">
                  <FormField
                    control={form.control}
                    name="playerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Jugador <span className="text-destructive">*</span></FormLabel>
                        <Popover open={playerPopoverOpen} onOpenChange={setPlayerPopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {field.value || "Selecciona o crea un jugador..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput
                                placeholder="Busca o escribe un nombre..."
                                onValueChange={(search) => {
                                  form.setValue("playerName", search, { shouldValidate: true });
                                  form.setValue("playerId", undefined);
                                }}
                                value={field.value}
                              />
                              <CommandEmpty>No encontrado. Se creará un jugador nuevo.</CommandEmpty>
                              <CommandList>
                                <CommandGroup>
                                  {players
                                    .filter((p, i, arr) => arr.findIndex(x => x.name.toLowerCase() === p.name.toLowerCase()) === i)
                                    .map((player) => (
                                      <CommandItem
                                        key={player.id}
                                        value={player.name}
                                        onSelect={() => {
                                          form.setValue("playerId", player.id, { shouldValidate: true });
                                          form.setValue("playerName", player.name, { shouldValidate: true });
                                          form.setValue("nationality", player.nationality, { shouldValidate: true });
                                          setPlayerPopoverOpen(false);
                                        }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", playerIdValue === player.id ? "opacity-100" : "opacity-0")} />
                                        {player.name}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cardName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de la Carta <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Carta Base" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL de Imagen <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nationality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nacionalidad</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isExistingPlayer}>
                          <FormControl>
                            <SelectTrigger className={cn(isExistingPlayer && "text-muted-foreground")}>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {nationalities.map((nat) => (
                              <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                            ))}
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {playerStyles.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="league"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Liga</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {leagues.map((l) => (
                              <SelectItem key={l} value={l}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* ── TAB 2: POSICIONES ── */}
              <TabsContent value="posiciones" className="flex-1 overflow-auto">
                <div className="space-y-3">
                  {ratingFields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Sin posiciones agregadas. El jugador no aparecerá en la tabla hasta que tengas al menos una valoración.
                    </p>
                  )}

                  {ratingFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <FormField
                        control={form.control}
                        name={`ratingEntries.${index}.position`}
                        render={({ field }) => (
                          <FormItem className="w-24 flex-shrink-0">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {positions.map((pos) => (
                                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`ratingEntries.${index}.rating`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <div className="flex items-center gap-3">
                              <FormControl>
                                <Slider
                                  min={1}
                                  max={10}
                                  step={0.5}
                                  value={[field.value]}
                                  onValueChange={(v) => field.onChange(v[0])}
                                />
                              </FormControl>
                              <span className="text-sm font-bold w-8 text-right tabular-nums">
                                {watchedEntries[index]?.rating?.toFixed(1) ?? "5.0"}
                              </span>
                            </div>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => removeRating(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => appendRating({ position: "DC", rating: 5 })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Posición
                  </Button>
                </div>
              </TabsContent>

              {/* ── TAB 3: ATRIBUTOS ── */}
              <TabsContent value="atributos" className="flex-1 overflow-auto">
                <ScrollArea className="h-[360px] pr-4">
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-medium mb-3 text-muted-foreground">Físico</p>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="height"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Altura (cm)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="180" {...field} value={field.value ?? ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Peso (kg)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="75" {...field} value={field.value ?? ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    {statFields.map((cat) => (
                      <div key={cat.category}>
                        <p className="text-sm font-medium mb-3 text-muted-foreground">{cat.category}</p>
                        <div className="grid grid-cols-2 gap-3">
                          {cat.fields.map((f) => (
                            <FormField
                              key={f.name}
                              control={form.control}
                              name={f.name as keyof AddPlayerFormValues}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{f.label}</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={99}
                                      placeholder="–"
                                      {...field}
                                      value={(field.value as number | undefined) ?? ""}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ── TAB 4: HABILIDADES ── */}
              <TabsContent value="habilidades" className="flex-1 overflow-auto">
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Habilidades Especiales</FormLabel>
                        <Popover open={skillsPopoverOpen} onOpenChange={setSkillsPopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" role="combobox" className="w-full justify-between">
                                {watchedSkills.length > 0
                                  ? `${watchedSkills.length} seleccionada${watchedSkills.length > 1 ? "s" : ""}`
                                  : "Seleccionar habilidades..."}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar habilidad..." />
                              <CommandEmpty>No encontrada.</CommandEmpty>
                              <CommandList>
                                <ScrollArea className="h-56">
                                  <CommandGroup>
                                    {playerSkillsList.map((skill) => {
                                      const selected = watchedSkills.includes(skill);
                                      return (
                                        <CommandItem
                                          key={skill}
                                          value={skill}
                                          onSelect={() => {
                                            const current = field.value || [];
                                            field.onChange(
                                              selected
                                                ? current.filter((s) => s !== skill)
                                                : [...current, skill]
                                            );
                                          }}
                                        >
                                          <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                                          {skill}
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </ScrollArea>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {watchedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {watchedSkills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => form.setValue("skills", watchedSkills.filter((s) => s !== skill))}
                        >
                          {skill} ✕
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="submit" className="w-full">
                {isExistingPlayer ? "Agregar Carta" : "Crear Jugador"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
