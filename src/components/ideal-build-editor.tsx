
"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Position, PlayerStyle, IdealBuilds, PlayerStatsBuild } from "@/lib/types";
import { positions, playerStyles, getAvailableStylesForPosition } from "@/lib/types";
import { PlayerStatsEditor } from "./player-stats-editor";
import { ScrollArea } from "./ui/scroll-area";

const formSchema = z.object({
  builds: z.array(z.object({
    position: z.enum(positions),
    style: z.enum(playerStyles),
    stats: z.any(), // Simplified for form handling
  }))
});

type FormValues = z.infer<typeof formSchema>;

type IdealBuildEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBuilds: IdealBuilds;
  onSave: (builds: IdealBuilds) => void;
};

export function IdealBuildEditor({ open, onOpenChange, initialBuilds, onSave }: IdealBuildEditorProps) {
  const [selectedPosition, setSelectedPosition] = React.useState<Position>("DC");
  const [selectedStyle, setSelectedStyle] = React.useState<PlayerStyle>("Cazagoles");

  const availableStyles = React.useMemo(() => getAvailableStylesForPosition(selectedPosition, true), [selectedPosition]);

  React.useEffect(() => {
    if (!availableStyles.includes(selectedStyle)) {
      setSelectedStyle(availableStyles[0] || "Ninguno");
    }
  }, [availableStyles, selectedStyle]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const { fields, update } = useFieldArray({
    control: form.control,
    name: "builds",
    keyName: "fieldId",
  });
  
  const { reset } = form;

  React.useEffect(() => {
    if (open) {
      const buildsArray = [];
      for (const pos of positions) {
        const stylesForPos = getAvailableStylesForPosition(pos, true);
        for (const style of stylesForPos) {
          buildsArray.push({
            position: pos,
            style: style,
            stats: initialBuilds[pos]?.[style] || {},
          });
        }
      }
      reset({ builds: buildsArray });
    }
  }, [open, initialBuilds, reset]);

  const onSubmit = (data: FormValues) => {
    const buildsObject = {} as IdealBuilds;
    positions.forEach(pos => {
      buildsObject[pos] = {};
    });

    data.builds.forEach(build => {
      if (!buildsObject[build.position]) {
        buildsObject[build.position] = {};
      }
      buildsObject[build.position][build.style] = build.stats;
    });

    onSave(buildsObject);
    onOpenChange(false);
  };

  const selectedIndex = fields.findIndex(
    field => field.position === selectedPosition && field.style === selectedStyle
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editor de "Builds" Ideales</DialogTitle>
          <DialogDescription>
            Configura la "build" ideal para cada combinación de posición y estilo de juego.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
            <div className="flex-shrink-0 mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Posición</label>
                <Select value={selectedPosition} onValueChange={pos => setSelectedPosition(pos as Position)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una posición" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Estilo de Juego</label>
                 <Select value={selectedStyle} onValueChange={style => setSelectedStyle(style as PlayerStyle)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estilo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStyles.map(style => <SelectItem key={style} value={style}>{style}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex-grow overflow-hidden">
              {selectedIndex !== -1 ? (
                 <ScrollArea className="h-full pr-6">
                    <PlayerStatsEditor
                    playerBuild={fields[selectedIndex].stats}
                    onBuildChange={(newBuild) => {
                        update(selectedIndex, { ...fields[selectedIndex], stats: newBuild });
                    }}
                    />
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Selecciona una posición y estilo para editar la build.
                </div>
              )}
            </div>

            <DialogFooter className="flex-shrink-0 bg-background/95 py-4 border-t -mx-6 px-6 mt-4">
              <Button type="submit">Guardar Todas las Builds</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
