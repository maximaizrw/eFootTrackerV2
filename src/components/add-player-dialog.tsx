"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  nationalities,
  playerStyles,
  leagues,
  playerSkillsList,
  type Nationality,
  type PlayerStyle,
  type League,
  type PlayerAttributeStats,
  type PlayerSkill,
} from "@/lib/types";

const statSchema = z.coerce.number().min(0).max(99).optional();

const formSchema = z.object({
  // Required
  playerName: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  cardName: z.string().min(2, "El nombre de la carta debe tener al menos 2 caracteres."),
  imageUrl: z.string().url("Debe ser una URL válida."),
  // Optional
  nationality: z.enum(nationalities).optional(),
  style: z.enum(playerStyles).optional(),
  league: z.enum(leagues).optional(),
  // Physical
  height: z.coerce.number().min(100).max(230).optional(),
  weight: z.coerce.number().min(40).max(150).optional(),
  // Skills
  skills: z.array(z.string()).optional(),
  // Stats
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
};

export function AddPlayerDialog({ open, onOpenChange, onAddPlayer }: AddPlayerDialogProps) {
  const [skillsPopoverOpen, setSkillsPopoverOpen] = useState(false);

  const form = useForm<AddPlayerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      playerName: "",
      cardName: "",
      imageUrl: "",
      nationality: "Sin Nacionalidad",
      style: "Ninguno",
      league: "Sin Liga",
      skills: [],
    },
  });

  const watchedSkills = form.watch("skills") || [];

  useEffect(() => {
    if (open) {
      form.reset({
        playerName: "",
        cardName: "",
        imageUrl: "",
        nationality: "Sin Nacionalidad" as Nationality,
        style: "Ninguno" as PlayerStyle,
        league: "Sin Liga" as League,
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
          <DialogTitle>Nuevo Jugador</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <Tabs defaultValue="ficha" className="flex flex-col flex-1 min-h-0">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="ficha">Ficha</TabsTrigger>
                <TabsTrigger value="atributos">Atributos</TabsTrigger>
                <TabsTrigger value="habilidades">Habilidades</TabsTrigger>
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
                        <FormControl>
                          <Input placeholder="Ej: Lionel Messi" {...field} />
                        </FormControl>
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una nacionalidad" />
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
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un estilo" />
                            </SelectTrigger>
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
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una liga" />
                            </SelectTrigger>
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

              {/* ── TAB 2: ATRIBUTOS ── */}
              <TabsContent value="atributos" className="flex-1 overflow-auto">
                <ScrollArea className="h-[380px] pr-4">
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

              {/* ── TAB 3: HABILIDADES ── */}
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
                          onClick={() =>
                            form.setValue(
                              "skills",
                              watchedSkills.filter((s) => s !== skill)
                            )
                          }
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
              <Button type="submit" className="w-full">Guardar Jugador</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
