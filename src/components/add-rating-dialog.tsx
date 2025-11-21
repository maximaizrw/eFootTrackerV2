
"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, ChevronsUpDown } from 'lucide-react';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { Player, Position, PlayerStyle, League, Nationality } from "@/lib/types";
import { positions, playerStyles, leagues, nationalities, getAvailableStylesForPosition } from "@/lib/types";

const formSchema = z.object({
  playerId: z.string().optional(),
  playerName: z.string().min(2, "El nombre del jugador debe tener al menos 2 caracteres."),
  nationality: z.enum(nationalities),
  cardName: z.string().min(2, "El nombre de la carta debe tener al menos 2 caracteres."),
  position: z.enum(positions),
  style: z.enum(playerStyles),
  league: z.enum(leagues).optional(),
  rating: z.number().min(1).max(10),
});

export type FormValues = z.infer<typeof formSchema>;

type AddRatingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddRating: (values: FormValues) => void;
  players: Player[];
  initialData?: Partial<FormValues>;
};

export function AddRatingDialog({ open, onOpenChange, onAddRating, players, initialData }: AddRatingDialogProps) {
  const [playerPopoverOpen, setPlayerPopoverOpen] = useState(false);
  const [cardPopoverOpen, setCardPopoverOpen] = useState(false);
  const [cardNames, setCardNames] = useState<string[]>([]);
  const [isStyleDisabled, setIsStyleDisabled] = useState(false);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      playerId: undefined,
      playerName: "",
      nationality: "Sin Nacionalidad",
      cardName: "Carta Base",
      position: "DC",
      style: "Ninguno",
      league: "Sin Liga",
      rating: 5,
    },
  });
  
  const playerIdValue = form.watch('playerId');
  const playerNameValue = form.watch('playerName');
  const cardNameValue = form.watch('cardName');
  const positionValue = form.watch('position');

  useEffect(() => {
    if (open) {
      const defaultValues = {
        playerId: undefined,
        playerName: '',
        nationality: 'Sin Nacionalidad' as Nationality,
        cardName: 'Carta Base',
        position: 'DC' as Position,
        style: 'Ninguno' as PlayerStyle,
        league: 'Sin Liga' as League,
        rating: 5,
      };
      
      form.reset({ ...defaultValues, ...initialData });
    }
  }, [open, initialData, form]);

  
  useEffect(() => {
    const selectedPlayer = players.find(p => p.id === playerIdValue || p.name.toLowerCase() === playerNameValue?.toLowerCase());

    if (selectedPlayer) {
      if (form.getValues('playerName') !== selectedPlayer.name) {
        form.setValue('playerName', selectedPlayer.name);
      }
       if (form.getValues('playerId') !== selectedPlayer.id) {
        form.setValue('playerId', selectedPlayer.id);
      }
       if (form.getValues('nationality') !== selectedPlayer.nationality) {
        form.setValue('nationality', selectedPlayer.nationality);
      }
      setCardNames(selectedPlayer.cards.map(c => c.name));
    } else {
      setCardNames([]);
    }

    const card = selectedPlayer?.cards.find(c => c.name.toLowerCase() === cardNameValue?.toLowerCase());
    const availableStyles = getAvailableStylesForPosition(positionValue);

    if (card) {
      const isStyleValidForPosition = availableStyles.includes(card.style);
      
      if (isStyleValidForPosition) {
        form.setValue('style', card.style, { shouldValidate: true });
        setIsStyleDisabled(true);
      } else {
        // The card's style is invalid for the new position, so we reset it to "Ninguno".
        form.setValue('style', 'Ninguno', { shouldValidate: true });
        setIsStyleDisabled(false); // Let user pick a valid one for this new position rating
      }
      if (card.league) {
        form.setValue('league', card.league);
      }
    } else {
      // It's a new card, so style is editable.
      setIsStyleDisabled(false);
      const currentStyle = form.getValues('style');
      if (!availableStyles.includes(currentStyle)) {
        form.setValue('style', 'Ninguno');
      }
    }
  }, [playerIdValue, playerNameValue, cardNameValue, positionValue, players, form]);


  const availableStyles = useMemo(() => {
    return getAvailableStylesForPosition(positionValue, true);
  }, [positionValue]);


  function onSubmit(values: FormValues) {
    const finalValues = { ...values };
    const stylesForPosition = getAvailableStylesForPosition(finalValues.position);
    if (!stylesForPosition.includes(finalValues.style)) {
      finalValues.style = 'Ninguno';
    }
    onAddRating(finalValues);
    onOpenChange(false);
  }
  
  const isQuickAdd = !!initialData?.playerId;
  const isNewPlayer = !playerIdValue && playerNameValue.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Añadir Nueva Valoración</DialogTitle>
          <DialogDescription>
            {isQuickAdd 
              ? `Añadiendo nueva valoración para ${initialData.playerName} - ${initialData.cardName}`
              : "Introduce los detalles del rendimiento de un jugador en el partido."
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="playerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Jugador</FormLabel>
                   <Popover open={playerPopoverOpen} onOpenChange={setPlayerPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={playerPopoverOpen}
                          className={cn("w-full justify-between", isQuickAdd && "text-muted-foreground")}
                          disabled={isQuickAdd}
                          aria-label="Nombre del jugador"
                        >
                          {field.value || "Selecciona o crea un jugador..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Busca o crea un jugador..."
                          onValueChange={(search) => {
                            form.setValue('playerName', search, { shouldValidate: true });
                            form.setValue('playerId', undefined);
                          }}
                          value={field.value}
                          aria-label="Nombre del jugador"
                        />
                        <CommandEmpty>No se encontró el jugador. Puedes crearlo.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {players.map((player) => (
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
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    playerIdValue === player.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
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
              name="nationality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nacionalidad</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!isNewPlayer}>
                    <FormControl>
                    <SelectTrigger className={cn(!isNewPlayer && "text-muted-foreground")}>
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
              name="cardName"
              render={({ field }) => (
                 <FormItem>
                  <FormLabel>Nombre de la Carta</FormLabel>
                   <Popover open={cardPopoverOpen} onOpenChange={setCardPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={cardPopoverOpen}
                          className={cn("w-full justify-between", isQuickAdd && "text-muted-foreground")}
                          disabled={!playerNameValue || isQuickAdd}
                          aria-label="Nombre de la carta"
                        >
                          {field.value || "Selecciona o crea una carta..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Busca o crea una carta..."
                          onValueChange={(search) => form.setValue('cardName', search)}
                          value={field.value}
                          aria-label="Nombre de la carta"
                        />
                        <CommandEmpty>No se encontró la carta. Puedes crearla.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {cardNames.map((name) => (
                              <CommandItem
                                key={name}
                                value={name}
                                onSelect={() => {
                                  form.setValue("cardName", name, { shouldValidate: true });
                                  setCardPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value.toLowerCase() === name.toLowerCase() ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {name}
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
              name="league"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Liga</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isQuickAdd}>
                    <FormControl>
                    <SelectTrigger className={cn(isQuickAdd && "text-muted-foreground")}>
                        <SelectValue placeholder="Selecciona una liga" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leagues.map((league) => (
                        <SelectItem key={league} value={league}>{league}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Posición</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isQuickAdd}>
                    <FormControl>
                    <SelectTrigger className={cn(isQuickAdd && "text-muted-foreground")}>
                        <SelectValue placeholder="Selecciona una posición" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {positions.map((pos) => (
                        <SelectItem key={pos} value={pos}>{pos}</SelectItem>
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
                  <Select onValueChange={field.onChange} value={field.value} disabled={isQuickAdd || isStyleDisabled}>
                    <FormControl>
                    <SelectTrigger className={cn((isQuickAdd || isStyleDisabled) && "text-muted-foreground")}>
                        <SelectValue placeholder="Selecciona un estilo" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableStyles.map((style) => (
                        <SelectItem key={style} value={style}>{style}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                   <FormLabel>Valoración: {field.value.toFixed(1)}</FormLabel>
                   <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={0.5}
                      defaultValue={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Guardar Valoración</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

  

    

    