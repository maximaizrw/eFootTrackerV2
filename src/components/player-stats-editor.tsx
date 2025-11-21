
"use client";

import * as React from "react";
import type { PlayerStatsBuild } from "@/lib/types";
import { playerAttributes } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";

type PlayerStatsEditorProps = {
  playerBuild?: PlayerStatsBuild;
  onBuildChange: (build: PlayerStatsBuild) => void;
};

const statGroups = {
  Attacking: ["offensiveAwareness", "ballControl", "dribbling", "tightPossession", "lowPass", "loftedPass", "finishing", "heading", "setPieceTaking", "curl"],
  Defending: ["defensiveAwareness", "defensiveEngagement", "tackling", "aggression"],
  Goalkeeping: ["gkAwareness", "gkCatching", "gkParrying", "gkReflexes", "gkReach"],
  Athleticism: ["speed", "acceleration", "kickingPower", "jump", "physicalContact", "balance", "stamina"],
};

const statLabels: Record<string, string> = {
  offensiveAwareness: "Offensive Awareness",
  ballControl: "Ball Control",
  dribbling: "Dribbling",
  tightPossession: "Tight Possession",
  lowPass: "Low Pass",
  loftedPass: "Lofted Pass",
  finishing: "Finishing",
  heading: "Heading",
  setPieceTaking: "Place Kicking",
  curl: "Curl",
  defensiveAwareness: "Defensive Awareness",
  defensiveEngagement: "Defensive Engagement",
  tackling: "Tackling",
  aggression: "Aggression",
  gkAwareness: "GK Awareness",
  gkCatching: "GK Catching",
  gkParrying: "GK Parrying",
  gkReflexes: "GK Reflexes",
  gkReach: "GK Reach",
  speed: "Speed",
  acceleration: "Acceleration",
  kickingPower: "Kicking Power",
  jump: "Jump",
  physicalContact: "Physical Contact",
  balance: "Balance",
  stamina: "Stamina",
};

const pasteOrder: (keyof PlayerStatsBuild)[] = [
    "offensiveAwareness", "ballControl", "dribbling", "tightPossession", "lowPass", "loftedPass",
    "finishing", "heading", "setPieceTaking", "curl", "defensiveAwareness", "defensiveEngagement",
    "tackling", "aggression", "gkAwareness", "gkCatching", "gkParrying", "gkReflexes", "gkReach",
    "speed", "acceleration", "kickingPower", "jump", "physicalContact", "balance", "stamina"
];

export function PlayerStatsEditor({ playerBuild, onBuildChange }: PlayerStatsEditorProps) {
  const [pasteText, setPasteText] = React.useState("");
  const [internalBuild, setInternalBuild] = React.useState(playerBuild);

  React.useEffect(() => {
    setInternalBuild(playerBuild);
  }, [playerBuild]);


  const handleStatChange = (stat: keyof PlayerStatsBuild, value: string) => {
    const numValue = parseInt(value, 10);
    const newBuild = { ...internalBuild };
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 99) {
      newBuild[stat] = numValue;
    } else if (value === '') {
      newBuild[stat] = 0;
    }
    setInternalBuild(newBuild);
    onBuildChange(newBuild as PlayerStatsBuild);
  };
  
  const handlePasteAndFill = () => {
    const lines = pasteText.trim().split(/\s+/); // Splits by any whitespace including newlines and spaces
    if (lines.length === 0) return;

    const newBuild: PlayerStatsBuild = { ...internalBuild };
    
    pasteOrder.forEach((stat, index) => {
        if (index < lines.length) {
            const numValue = parseInt(lines[index], 10);
            if (!isNaN(numValue)) {
                newBuild[stat] = Math.max(0, Math.min(99, numValue));
            }
        }
    });

    setInternalBuild(newBuild);
    onBuildChange(newBuild);
    setPasteText(""); // Clear after processing
  };

  return (
    <div className="flex-grow overflow-hidden flex flex-col gap-4">
        <div>
            <Label htmlFor="quick-paste-stats">Pegado Rápido de Stats</Label>
            <div className="flex gap-2 mt-1">
                <Textarea
                    id="quick-paste-stats"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Pega las 27 estadísticas aquí..."
                    className="h-24 resize-none"
                />
                <Button type="button" onClick={handlePasteAndFill} className="self-stretch">
                    Rellenar
                </Button>
            </div>
        </div>

        <ScrollArea className="flex-grow border rounded-md p-4">
            <div className="space-y-6">
                {Object.entries(statGroups).map(([groupName, stats]) => (
                    <div key={groupName}>
                    <h3 className="text-lg font-semibold mb-2 text-primary">{groupName}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {stats.map(stat => (
                        <div key={stat} className="space-y-1">
                            <Label htmlFor={stat}>{statLabels[stat]}</Label>
                            <Input
                            id={stat}
                            type="number"
                            value={internalBuild?.[stat as keyof PlayerStatsBuild] ?? 0}
                            onChange={e => handleStatChange(stat as keyof PlayerStatsBuild, e.target.value)}
                            className="h-9"
                            />
                        </div>
                        ))}
                    </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    </div>
  );
}
