
import * as z from "zod";
import type { AffinityBreakdownResult } from "./utils";

export const playerStyles = ['Ninguno', 'Cazagoles', 'Hombre de área', 'Segundo delantero', 'Hombre objetivo', 'Creador de juego', 'Creador de jugadas', 'El destructor', 'Portero defensivo', 'Portero ofensivo', 'Atacante extra', 'Lateral defensivo', 'Lateral ofensivo', 'Lateral finalizador', 'Especialista en centros', 'Omnipresente', 'Medio escudo', 'Organizador', 'Jugador de huecos', 'Extremo móvil', 'Extremo prolífico', 'Diez Clasico'] as const;
export type PlayerStyle = typeof playerStyles[number];

export const positions = ['PT', 'DFC', 'LI', 'LD', 'MCD', 'MC', 'MDI', 'MDD', 'MO', 'EXI', 'EXD', 'SD', 'DC'] as const;
export type Position = typeof positions[number];

export const buildPositions = [...positions, 'LAT', 'INT', 'EXT'] as const;
export type BuildPosition = typeof buildPositions[number];


export const leagues = [
    "Sin Liga", "Premier League", "Ligue 1 Uber Eats", "Serie A TIM", "LaLiga EA SPORTS",
    "Eredivisie", "Liga Portugal Betclic", "Credit Suisse Super League", "Super Lig",
    "Scottish Premiership", "3F Superliga", "Jupiler Pro League", "Championship",
    "Serie BKT", "Ligue 2 BKT", "LaLiga Hypermotion", "BELGIAN LEAGUE",
    "SWISS LEAGUE", "BRASILEIRAO ASSAI", "BRASILEIRAO SERIE B",
    "Liga BBVA MX", "Major League Soccer", "Liga Profesional de Futbol",
    "Campeonato PlanVital", "K LEAGUE 1", "Hilux Revo Thai League 1",
    "J. League Div.1", 'Internacional'
] as const;
export type League = typeof leagues[number];

export const nationalities = [
    'Sin Nacionalidad', 'Argentina', 'Brasil', 'Francia', 'Alemania', 'Inglaterra',
    'España', 'Italia', 'Países Bajos', 'Portugal', 'Bélgica', 'Uruguay',
    'Colombia', 'Croacia', 'Japón', 'Corea del Sur', 'Nigeria', 'Senegal',
    'Marruecos', 'México', 'EE. UU.', 'Chile', 'Turquía', 'Polonia', 'Suecia',
    'Noruega', 'Dinamarca', 'Suiza', 'Austria', 'Serbia', 'Costa de Marfil',
    'Ghana', 'Egipto', 'Camerún', 'República Checa', 'Escocia', 'Irlanda',
    'Gales', 'Rumanía', 'Rusia'
] as const;
export type Nationality = typeof nationalities[number];

export const playerSkillsList = [
    "Elástica", "Marsellesa", "Sombrero", "Recorte y cambio/cortada", "Amago por detrás y giro",
    "Rebote interior", "Control con la suela/pisar el balon", "Cabeceador", "Disparo lejano con rosca/Cañonero",
    "Vaselina", "Tiro de larga distancia", "Disparo descendente", "Disparo ascendente",
    "Finalización acrobática", "Espuela/Taconazo", "Remate al primer toque", "Pase al primer toque",
    "Pase en profundidad/pase medido", "Pase al hueco", "Pase cruzado", "Centro con rosca", "Rabona",
    "Pase sin mirar", "Pase bombeado bajo", "Patadon por bajo (Portero)",
    "Patadon en largo (Portero)", "Saque de banda largo", "Saque largo (Portero)",
    "Especialista en penaltis", "Parapenaltis (Portero)", "Picardía", "Marcaje",
    "Delantero atrasado", "Interceptador", "Bloqueador", "Superioridad aérea",
    "Entrada deslizante", "Despeje acrobático", "Capitanía", "Espíritu de lucha", "As en la manga", "Doble toque", "Croqueta", "Tijera", "Malicia"
] as const;

export type PlayerSkill = typeof playerSkillsList[number];

export const liveUpdateRatings = ['A', 'B', 'C', 'D', 'E'] as const;
export type LiveUpdateRating = typeof liveUpdateRatings[number];


export type OutfieldBuild = {
  shooting?: number; // 0-20
  passing?: number;
  dribbling?: number;
  dexterity?: number;
  lowerBodyStrength?: number;
  aerialStrength?: number;
  defending?: number;
};

export type GoalkeeperBuild = {
  gk1?: number; // 0-20
  gk2?: number;
  gk3?: number;
};

export type PlayerBuild = (OutfieldBuild | GoalkeeperBuild) & {
  manualAffinity?: number; // -100 to 100
  updatedAt?: string;
};

type MinMaxRange = {
    min?: number;
    max?: number;
};

export const formationPlayStyles = [
  'Contraataque rápido', 
  'Contraataque largo', 
  'Por las bandas', 
  'Balones largos', 
  'Posesión'
] as const;
export type FormationPlayStyle = typeof formationPlayStyles[number];

export const idealBuildTypes = ['General', ...formationPlayStyles] as const;
export type IdealBuildType = typeof idealBuildTypes[number];

export type IdealBuild = {
  id?: string;
  playStyle: IdealBuildType;
  position: BuildPosition;
  style: PlayerStyle;
  build: PlayerAttributeStats;
  height?: MinMaxRange;
  weight?: MinMaxRange;
  primarySkills?: PlayerSkill[];
  secondarySkills?: PlayerSkill[];
};

export type PlayerAttributeStats = {
  // Attacking
  offensiveAwareness?: number;
  ballControl?: number;
  dribbling?: number;
  tightPossession?: number;
  lowPass?: number;
  loftedPass?: number;
  finishing?: number;
  heading?: number;
  placeKicking?: number;
  curl?: number;
  // Defending
  defensiveAwareness?: number;
  defensiveEngagement?: number;
  tackling?: number;
  aggression?: number;
  // Goalkeeping
  goalkeeping?: number;
  gkCatching?: number;
  gkParrying?: number;
  gkReflexes?: number;
  gkReach?: number;
  // Athleticism
  speed?: number;
  acceleration?: number;
  kickingPower?: number;
  jump?: number;
  physicalContact?: number;
  balance?: number;
  stamina?: number;

  // Base stats for progression
  baseOffensiveAwareness?: number;
  baseBallControl?: number;
  baseDribbling?: number;
  baseTightPossession?: number;
  baseLowPass?: number;
  baseLoftedPass?: number;
  baseFinishing?: number;
  baseHeading?: number;
  basePlaceKicking?: number;
  baseCurl?: number;
  baseDefensiveAwareness?: number;
  baseDefensiveEngagement?: number;
  baseTackling?: number;
  baseAggression?: number;
  baseGoalkeeping?: number;
  baseGkCatching?: number;
  baseGkParrying?: number;
  baseGkReflexes?: number;
  baseGkReach?: number;
  baseSpeed?: number;
  baseAcceleration?: number;
  baseKickingPower?: number;
  baseJump?: number;
  basePhysicalContact?: number;
  baseBalance?: number;
  baseStamina?: number;
};

export const positionLabels: Record<BuildPosition, string> = {
    PT: 'Portero',
    DFC: 'Defensa Central',
    LI: 'Lateral Izquierdo',
    LD: 'Lateral Derecho',
    MCD: 'Pivote Defensivo',
    MC: 'Mediocentro',
    MDI: 'Interior Izquierdo',
    MDD: 'Interior Derecho',
    MO: 'Mediapunta',
    EXI: 'Extremo Izquierdo',
    EXD: 'Extremo Derecho',
    SD: 'Segundo Delantero',
    DC: 'Delantero Centro',
    LAT: 'Lateral (LI/LD)',
    INT: 'Interior (MDI/MDD)',
    EXT: 'Extremo (EXI/EXD)',
};


export type PositionLabel = typeof positionLabels[Position];

export type PhysicalAttribute = {
  height?: number;
  weight?: number;
}

export type PlayerCard = {
  id: string;
  name: string;
  style: PlayerStyle;
  league?: League;
  imageUrl?: string;
  ratingsByPosition: { [key in Position]?: number[] };
  buildsByPosition?: { [key in Position]?: PlayerBuild };
  attributeStats?: PlayerAttributeStats;
  physicalAttributes?: PhysicalAttribute;
  totalProgressionPoints?: number;
  skills?: PlayerSkill[];
};

export type Player = {
  id: string;
  name: string;
  nationality: Nationality;
  cards: PlayerCard[];
  liveUpdateRating?: LiveUpdateRating | null;
  permanentLiveUpdateRating?: boolean;
};

export type AddRatingFormValues = {
    playerId?: string;
    playerName: string;
    nationality: Nationality;
    cardName: string;
    position: Position;
    style: PlayerStyle;
    league?: League;
    rating: number;
}

export type EditCardFormValues = {
    playerId: string;
    cardId: string;
    currentCardName: string;
    currentStyle: PlayerStyle;
    league?: League;
    imageUrl?: string;
};

export type EditPlayerFormValues = {
    playerId: string;
    currentPlayerName: string;
    nationality: Nationality;
    permanentLiveUpdateRating?: boolean;
};

export type Formation = {
  [key in Position]?: number;
};

export type IdealTeamPlayer = {
  player: Player;
  card: PlayerCard;
  position: Position;
  assignedPosition: Position;
  average: number;
  affinityScore: number;
  generalScore: number;
  performance: PlayerPerformance;
};

export type IdealTeamSlot = {
  starter: IdealTeamPlayer | null;
  substitute: IdealTeamPlayer | null;
}

export type MatchResult = {
  id: string;
  goalsFor: number;
  goalsAgainst: number;
  shotsOnGoal?: number;
  date: string;
};

export const FormationSlotSchema = z.object({
  position: z.enum(positions),
  styles: z.array(z.string()).optional().default([]),
  top: z.number().optional(),
  left: z.number().optional(),
});


export type FormationSlot = z.infer<typeof FormationSlotSchema>;

export type FormationStats = {
  id: string;
  name: string;
  creator?: string;
  playStyle: FormationPlayStyle;
  slots: FormationSlot[];
  imageUrl?: string;
  secondaryImageUrl?: string;
  sourceUrl?: string;
  matches: MatchResult[];
};

export type AddFormationFormValues = {
  name: string;
  creator?: string;
  playStyle: FormationPlayStyle;
  slots: FormationSlot[];
  imageUrl?: string;
  secondaryImageUrl?: string;
  sourceUrl?: string;
};

export type EditFormationFormValues = {
  id: string;
  name: string;
  creator?: string;
  playStyle: FormationPlayStyle;
  slots: FormationSlot[];
  imageUrl?: string;
  secondaryImageUrl?: string;
  sourceUrl?: string;
};


export type AddMatchFormValues = {
  formationId: string;
  goalsFor: number;
  goalsAgainst: number;
  shotsOnGoal?: number;
}

export type PlayerRatingStats = {
    average: number;
    matches: number;
    stdDev: number;
};

export type PlayerPerformance = {
    stats: PlayerRatingStats;
    isHotStreak: boolean;
    isConsistent: boolean;
    isPromising: boolean;
    isVersatile: boolean;
    isGameChanger?: boolean;
    isStalwart?: boolean;
    isSpecialist?: boolean;
};

export type FlatPlayer = {
  player: Player;
  card: PlayerCard;
  ratingsForPos: number[];
  performance: PlayerPerformance;
  affinityScore: number;
  generalScore: number;
  position: Position;
  affinityBreakdown: AffinityBreakdownResult;
};

export function getAvailableStylesForPosition(position: BuildPosition, includeNone: boolean = false): PlayerStyle[] {
    const baseStyles: PlayerStyle[] = includeNone ? ['Ninguno'] : [];

    switch (position) {
        case 'PT':
            return [...baseStyles, 'Portero defensivo', 'Portero ofensivo'];
        case 'DFC':
            return [...baseStyles, 'El destructor', 'Atacante extra', 'Creador de juego'];
        case 'LI':
        case 'LD':
        case 'LAT':
            return [...baseStyles, 'Lateral defensivo', 'Lateral ofensivo', 'Lateral finalizador', 'Especialista en centros'];
        case 'MCD':
            return [...baseStyles, 'El destructor', 'Medio escudo', 'Omnipresente', 'Organizador', 'Creador de jugadas', 'Atacante extra'];
        case 'MC':
            return [...baseStyles, 'Jugador de huecos', 'Omnipresente', 'Creador de jugadas', 'Organizador', 'El destructor', 'Medio escudo'];
        case 'MDI':
        case 'MDD':
        case 'INT':
            return [...baseStyles, 'Omnipresente', 'Especialista en centros', 'Creador de jugadas', 'Jugador de huecos', 'Extremo móvil'];
        case 'MO':
            return [...baseStyles, 'Jugador de huecos', 'Creador de jugadas', 'Diez Clasico', 'Extremo móvil'];
        case 'EXI':
        case 'EXD':
        case 'EXT':
            return [...baseStyles, 'Extremo móvil', 'Extremo prolífico', 'Especialista en centros', 'Creador de jugadas'];
        case 'SD':
            return [...baseStyles, 'Cazagoles', 'Jugador de huecos', 'Hombre objetivo', 'Diez Clasico', 'Extremo móvil', 'Creador de jugadas', 'Segundo delantero'];
        case 'DC':
            return [...baseStyles, 'Cazagoles', 'Hombre de área', 'Hombre objetivo', 'Jugador de huecos', 'Extremo móvil', 'Segundo delantero'];
        default:
            return [...playerStyles];
    }
}
