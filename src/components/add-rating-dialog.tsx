"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { ThumbsUp, ThumbsDown, Minus, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Player, Position, PlayerStyle, League, Nationality } from "@/lib/types";
import { positions, playerStyles, leagues, nationalities } from "@/lib/types";
import { ratingMatchTypes, ratingMatchResults, getMatchRatingAdjustment } from "@/lib/utils";

const formSchema = z.object({
  playerId: z.string().optional(),
  cardId: z.string().optional(),
  playerName: z.string().min(2),
  nationality: z.enum(nationalities),
  cardName: z.string().min(2),
  position: z.enum(positions),
  style: z.enum(playerStyles),
  league: z.enum(leagues).optional(),
  rating: z.number().min(1).max(10),
  matchType: z.enum(ratingMatchTypes).default("Evento"),
  matchResult: z.enum(ratingMatchResults).default("Empate"),
  liked: z.boolean().nullable().optional(),
  formationId: z.string().optional(),
  formationName: z.string().optional(),
  tierlistUrl: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

type AddRatingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddRating: (values: FormValues) => void;
  players: Player[];
  initialData?: Partial<FormValues>;
  showPositionSelector?: boolean;
  existingPositions?: Position[];
};

function getRatingColor(rating: number): string {
  if (rating >= 8) return "text-emerald-500";
  if (rating >= 6) return "text-yellow-500";
  if (rating >= 4) return "text-orange-500";
  return "text-red-500";
}

function getRatingLabel(rating: number): string {
  if (rating >= 9) return "Sobresaliente";
  if (rating >= 8) return "Excelente";
  if (rating >= 7) return "Muy bueno";
  if (rating >= 6) return "Bueno";
  if (rating >= 5) return "Regular";
  if (rating >= 4) return "Flojo";
  if (rating >= 3) return "Malo";
  return "Pésimo";
}

function getRatingBg(rating: number): string {
  if (rating >= 8) return "bg-emerald-500/10 border-emerald-500/30";
  if (rating >= 6) return "bg-yellow-500/10 border-yellow-500/30";
  if (rating >= 4) return "bg-orange-500/10 border-orange-500/30";
  return "bg-red-500/10 border-red-500/30";
}

export function AddRatingDialog({ open, onOpenChange, onAddRating, initialData, showPositionSelector, existingPositions }: AddRatingDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      playerId: undefined,
      cardId: undefined,
      playerName: "",
      nationality: "Sin Nacionalidad",
      cardName: "Carta Base",
      position: "DC",
      style: "Básico",
      league: "Sin Liga",
      rating: 5,
      matchType: "Evento",
      matchResult: "Empate",
      liked: null,
      formationId: undefined,
      formationName: undefined,
      tierlistUrl: undefined,
    },
  });

  useEffect(() => {
    if (open) {
      const defaultPosition = showPositionSelector
        ? ((existingPositions && existingPositions.length > 0)
            ? positions.find(p => !existingPositions.includes(p)) ?? "DC"
            : "DC")
        : "DC";
      const base = {
        playerId: undefined,
        cardId: undefined,
        playerName: "",
        nationality: "Sin Nacionalidad" as Nationality,
        cardName: "Carta Base",
        position: defaultPosition as Position,
        style: "Básico" as PlayerStyle,
        league: "Sin Liga" as League,
        rating: 5,
        matchType: "Evento" as const,
        matchResult: "Empate" as const,
        liked: null,
        formationId: undefined,
        formationName: undefined,
        ...initialData,
      };
      form.reset(base);
    }
  }, [open, initialData, form, showPositionSelector, existingPositions]);

  function onSubmit(values: FormValues) {
    onAddRating({ ...values, rating: values.rating + getMatchRatingAdjustment(values.matchType, values.matchResult) });
    onOpenChange(false);
  }

  const rating = form.watch("rating");
  const adjustment = getMatchRatingAdjustment(form.watch("matchType"), form.watch("matchResult"));
  const position = form.watch("position");

  const availablePositions = showPositionSelector
    ? positions.filter(p => !(existingPositions || []).includes(p))
    : positions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%_-_1rem)] sm:max-w-[540px] p-0 max-h-[calc(100dvh_-_1rem)] overflow-y-auto gap-0 rounded-lg">
        {/* Header */}
        <div className="bg-primary/5 border-b px-4 py-3 pr-12">
          <DialogHeader className="text-left">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-bold break-words">
                  {initialData?.playerName || "Jugador"}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {(showPositionSelector ? position : initialData?.position) && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {showPositionSelector ? position : initialData?.position}
                    </span>
                  )}
                  {initialData?.cardName && (
                    <span className="text-xs text-muted-foreground">
                      {initialData.cardName}
                    </span>
                  )}
                  {initialData?.formationName && (
                    <span className="text-xs text-muted-foreground">
                      {initialData.formationName}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <DialogDescription className="sr-only">Ajusta la valoración y los datos del partido antes de guardar.</DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-4 py-3 space-y-3">

            {/* Position Selector */}
            {showPositionSelector && (
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem className="flex flex-wrap items-center gap-3 space-y-0">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Posición</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 flex-1">
                          <SelectValue placeholder="Seleccionar posición..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availablePositions.map(pos => (
                          <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Rating */}
            <div className="grid gap-2">
              <FormField control={form.control} name="matchType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de partido</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-4 gap-2">
                      {ratingMatchTypes.map(type => (
                        <label key={type} className="relative cursor-pointer">
                          <RadioGroupItem value={type} className="peer sr-only" />
                          <span className="flex min-h-11 items-center justify-center rounded-md border px-1 text-xs font-medium transition-colors hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring motion-reduce:transition-none">{type}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="matchResult" render={({ field }) => (
                <FormItem>
                  <FormLabel>Resultado</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-3 gap-2">
                      {ratingMatchResults.map(result => (
                        <label key={result} className="relative cursor-pointer">
                          <RadioGroupItem value={result} className="peer sr-only" />
                          <span className="flex min-h-11 items-center justify-center rounded-md border px-2 text-sm font-medium transition-colors hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring motion-reduce:transition-none">{result}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <div className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors motion-reduce:transition-none ${getRatingBg(field.value)}`}>
                    <div>
                      <FormLabel className="text-xs font-medium text-muted-foreground">Valoración</FormLabel>
                      <p className={`text-3xl tabular-nums font-black leading-none ${getRatingColor(field.value)}`}>
                        {field.value.toFixed(1)}
                      </p>
                      <p className={`text-xs font-semibold mt-1 ${getRatingColor(field.value)}`}>
                        {getRatingLabel(field.value)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" className="h-11 w-11 p-0" aria-label="Restar medio punto" disabled={field.value <= 1} onClick={() => field.onChange(Math.max(1, field.value - 0.5))}><Minus className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" className="h-11 w-11 p-0" aria-label="Sumar medio punto" disabled={field.value >= 10} onClick={() => field.onChange(Math.min(10, field.value + 0.5))}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={0.5}
                      aria-label="Valoración"
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      className="w-full min-h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="rounded-lg border bg-primary/5 px-3 py-2 text-sm tabular-nums" aria-live="polite">
              Nota final: {rating.toLocaleString("es")} {adjustment < 0 ? "−" : "+"} {Math.abs(adjustment).toLocaleString("es")} = <strong>{(rating + adjustment).toLocaleString("es")}</strong>
            </p>

            {/* Liked */}
            <FormField
              control={form.control}
              name="liked"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">¿Cómo fue el partido?</p>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => field.onChange(field.value === true ? null : true)}
                        aria-pressed={field.value === true}
                        className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                          field.value === true
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20"
                            : "border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 text-muted-foreground"
                        }`}
                      >
                        <ThumbsUp className="h-5 w-5" />
                        Me gustó
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange(null)}
                        aria-pressed={field.value === null}
                        className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                          field.value === null
                            ? "bg-secondary border-border text-foreground shadow-sm"
                            : "border-border hover:bg-secondary/60 text-muted-foreground"
                        }`}
                      >
                        <Minus className="h-5 w-5" />
                        Neutral
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange(field.value === false ? null : false)}
                        aria-pressed={field.value === false}
                        className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                          field.value === false
                            ? "bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20"
                            : "border-border hover:border-red-500/50 hover:bg-red-500/5 text-muted-foreground"
                        }`}
                      >
                        <ThumbsDown className="h-5 w-5" />
                        No me gustó
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="sticky bottom-0 flex gap-2 border-t bg-popover pt-3 pb-1">
              {initialData?.tierlistUrl && (
                <Button type="button" variant="outline" className="shrink-0 font-semibold h-11 px-3" asChild>
                  <a href={initialData.tierlistUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ir al jugador
                  </a>
                </Button>
              )}
              <Button type="submit" className="flex-1 font-semibold h-11 px-3">
                Guardar valoración
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
