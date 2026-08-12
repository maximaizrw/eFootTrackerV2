"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, ChevronsUpDown, PlusCircle, Trash2, X } from "lucide-react";

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
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  nationalities,
  playerStyles,
  leagues,
  playerTiers,
  positions,
  type Player,
  type Nationality,
  type PlayerStyle,
  type League,
  type Position,
} from "@/lib/types";

const formSchema = z.object({
  playerId: z.string().optional(),
  playerName: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  efhubUrl: z.string().optional(),
  cardName: z.string().min(2, "El nombre de la carta debe tener al menos 2 caracteres."),
  imageUrl: z.string().min(1, "La imagen es requerida."),
  nationality: z.enum(nationalities).optional(),
  style: z.enum(playerStyles).optional(),
  league: z.enum(leagues).optional(),
  ratingEntries: z.array(z.object({
    position: z.enum(positions),
    rating: z.number().min(1).max(10),
    tier: z.enum(playerTiers).optional(),
    tierPlacements: z.coerce.number().int().min(0).optional(),
  })).optional(),
  height: z.coerce.number().min(100).max(230).optional(),
  weight: z.coerce.number().min(40).max(150).optional(),
}).superRefine((values, ctx) => {
  values.ratingEntries?.forEach((entry, index) => {
    if (entry.tier && entry.tier !== "SIN TIER" && (!entry.tierPlacements || entry.tierPlacements < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ratingEntries", index, "tierPlacements"],
        message: "Debe ser al menos 1 para un tier asignado.",
      });
    }
  });
});

export type AddPlayerFormValues = z.infer<typeof formSchema>;

type AddPlayerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPlayer: (values: AddPlayerFormValues) => Promise<string | null>;
  players: Player[];
};

export function AddPlayerDialog({ open, onOpenChange, onAddPlayer, players }: AddPlayerDialogProps) {
  const [playerPopoverOpen, setPlayerPopoverOpen] = useState(false);

  const form = useForm<AddPlayerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      playerId: undefined,
      playerName: "",
      efhubUrl: "",
      cardName: "",
      imageUrl: "",
      nationality: "Sin Nacionalidad",
      style: "Ninguno",
      league: "Sin Liga",
      ratingEntries: [],
    },
  });

  const { fields: ratingFields, append: appendRating, remove: removeRating } = useFieldArray({
    control: form.control,
    name: "ratingEntries",
  });

  const watchedEntries = form.watch("ratingEntries") || [];
  const playerIdValue = form.watch("playerId");
  const isExistingPlayer = !!playerIdValue;

  useEffect(() => {
    if (open) {
      form.reset({
        playerId: undefined,
        playerName: "",
        efhubUrl: "",
        cardName: "",
        imageUrl: "",
        nationality: "Sin Nacionalidad" as Nationality,
        style: "Ninguno" as PlayerStyle,
        league: "Sin Liga" as League,
        ratingEntries: [],
      });
    }
  }, [open, form]);

  async function onSubmit(values: AddPlayerFormValues) {
    const savedPlayerId = await onAddPlayer(values);
    if (savedPlayerId) {
      onOpenChange(false);
    }
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
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="ficha">Ficha</TabsTrigger>
                <TabsTrigger value="posiciones">
                  Posiciones{ratingFields.length > 0 && <span className="ml-1 text-primary font-bold">({ratingFields.length})</span>}
                </TabsTrigger>
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
                        <div className="flex gap-2">
                        <Popover open={playerPopoverOpen} onOpenChange={setPlayerPopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="flex-1 justify-between"
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
                                  form.setValue("efhubUrl", "");
                                }}
                                value={field.value}
                              />
                              <CommandEmpty>No encontrado. Se creará un jugador nuevo.</CommandEmpty>
                              <CommandList>
                                <CommandGroup>
                                  {players
                                    .filter(p => (p.cards || []).some(c => Object.values(c.ratingsByPosition || {}).some(r => r && r.length > 0)))
                                    .filter((p, i, arr) => arr.findIndex(x => x.name.toLowerCase() === p.name.toLowerCase()) === i)
                                    .map((player) => (
                                      <CommandItem
                                        key={player.id}
                                        value={player.name}
                                        onSelect={() => {
                                          form.setValue("playerId", player.id, { shouldValidate: true });
                                          form.setValue("playerName", player.name, { shouldValidate: true });
                                          form.setValue("efhubUrl", player.efhubUrl || "", { shouldValidate: true });
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
                        {isExistingPlayer && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title="Crear como jugador nuevo"
                            onClick={() => {
                              form.setValue("playerId", undefined);
                              form.setValue("efhubUrl", "");
                              form.setValue("nationality", "Sin Nacionalidad");
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        </div>
                        {isExistingPlayer && (
                          <p className="text-xs text-muted-foreground">
                            Vinculando carta a jugador existente. Pulsá ✕ para crear uno nuevo.
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="efhubUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link de eFHUB</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://efootballhub.net/..."
                            {...field}
                            value={field.value ?? ""}
                          />
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
                    <div key={field.id} className="grid grid-cols-1 gap-3 p-3 rounded-lg border bg-card md:grid-cols-[88px_1fr_132px_90px_32px] md:items-end">
                      <FormField
                        control={form.control}
                        name={`ratingEntries.${index}.position`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Pos.</FormLabel>
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
                          <FormItem>
                            <FormLabel className="text-xs">Valoracion</FormLabel>
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

                      <FormField
                        control={form.control}
                        name={`ratingEntries.${index}.tier`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Tier</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue(
                                  `ratingEntries.${index}.tierPlacements`,
                                  value === "SIN TIER" ? 0 : Math.max(1, watchedEntries[index]?.tierPlacements || 1),
                                  { shouldValidate: true },
                                );
                              }}
                              value={field.value || "SIN TIER"}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {playerTiers.map((tier) => (
                                  <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`ratingEntries.${index}.tierPlacements`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Plac.</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={watchedEntries[index]?.tier === "SIN TIER" ? 0 : 1}
                                step={1}
                                disabled={(watchedEntries[index]?.tier || "SIN TIER") === "SIN TIER"}
                                {...field}
                                value={field.value ?? 0}
                                className="h-8"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
                    onClick={() => appendRating({ position: "DC", rating: 5, tier: "SIN TIER", tierPlacements: 0 })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Posición
                  </Button>
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
