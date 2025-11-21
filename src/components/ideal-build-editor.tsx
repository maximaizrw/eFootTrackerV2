
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
import type { Position, PlayerStatsBuild } from "@/lib/types";
import { positions } from "@/lib/types";
import { PlayerStatsEditor } from "./player-stats-editor";

const formSchema = z.object({
  builds: z.array(z.object({
    position: z.enum(positions),
    stats: z.any(), // Simplified for form handling, validation is implicit
  }))
});

type FormValues = z.infer<typeof formSchema>;

type IdealBuildEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBuilds: Record<Position, PlayerStatsBuild>;
  onSave: (builds: Record<Position, PlayerStatsBuild>) => void;
};

export function IdealBuildEditor({ open, onOpenChange, initialBuilds, onSave }: IdealBuildEditorProps) {
  const [selectedPosition, setSelectedPosition] = React.useState<Position>("DC");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const { fields, update } = useFieldArray({
    control: form.control,
    name: "builds",
    keyName: "fieldId",
  });

  React.useEffect(() => {
    if (open) {
      const buildsArray = positions.map(pos => ({
        position: pos,
        stats: initialBuilds[pos] || {},
      }));
      form.reset({ builds: buildsArray });
    }
  }, [open, initialBuilds, form]);

  const onSubmit = (data: FormValues) => {
    const buildsObject = data.builds.reduce((acc, build) => {
      acc[build.position] = build.stats;
      return acc;
    }, {} as Record<Position, PlayerStatsBuild>);
    onSave(buildsObject);
    onOpenChange(false);
  };

  const selectedIndex = fields.findIndex(field => field.position === selectedPosition);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editor de "Builds" Ideales</DialogTitle>
          <DialogDescription>
            Configura la "build" ideal para cada posición. Estos valores se usarán para calcular la afinidad de tus jugadores.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
            <div className="flex-shrink-0 mb-4">
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
            
            {selectedIndex !== -1 && (
              <PlayerStatsEditor
                playerBuild={fields[selectedIndex].stats}
                onBuildChange={(newBuild) => {
                  update(selectedIndex, { ...fields[selectedIndex], stats: newBuild });
                }}
              />
            )}

            <DialogFooter className="flex-shrink-0 bg-background/95 py-4 border-t -mx-6 px-6 mt-4">
              <Button type="submit">Guardar Todas las Builds</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
