
import * as z from "zod";

export const playerStyles = ['Ninguno', 'Cazagoles', 'Hombre de área', 'Señuelo', 'Hombre objetivo', 'Creador de juego', 'Creador de jugadas', 'El destructor', 'Portero defensivo', 'Portero ofensivo', 'Atacante extra', 'Lateral defensivo', 'Lateral ofensivo', 'Lateral finalizador', 'Omnipresente', 'Medio escudo', 'Organizador', 'Jugador de huecos', 'Especialista en centros', 'Extremo móvil', 'Extremo prolífico', 'Diez Clasico', 'Segundo delantero'] as const;
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

export type IdealBuild = {
  id?: string; // composite key of position-style
  position: BuildPosition;
  style: PlayerStyle;
  build: PlayerAttributeStats;
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

export type PlayerCard = {
  id: string;
  name: string; // e.g., "Highlight", "Player of the Week"
  style: PlayerStyle;
  league?: League;
  imageUrl?: string;
  ratingsByPosition: { [key in Position]?: number[] };
  selectablePositions?: { [key in Position]?: boolean };
  buildsByPosition?: { [key in Position]?: PlayerBuild };
  attributeStats?: PlayerAttributeStats;
};

export type Player = {
  id: string;
  name: string;
  nationality: Nationality;
  cards: PlayerCard[];
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
};

export type PlayersByPosition = {
  [key in Position]?: number;
};

export type Formation = {
  [key in Position]?: number;
};

export type IdealTeamPlayer = {
  player: Player;
  card: PlayerCard;
  position: Position; // The actual position of the player's rating
  assignedPosition: Position; // The slot they were assigned to in the formation
  average: number;
  affinityScore: number;
  generalScore: number;
  performance: PlayerPerformance;
};

export type IdealTeamSlot = {
  starter: IdealTeamPlayer;
  substitute: IdealTeamPlayer;
}

// --- Tipos para Formaciones ---

export const formationPlayStyles = [
  'Contraataque rápido', 
  'Contraataque largo', 
  'Por las bandas', 
  'Balones largos', 
  'Posesión'
] as const;
export type FormationPlayStyle = typeof formationPlayStyles[number];

export type MatchResult = {
  id: string;
  goalsFor: number;
  goalsAgainst: number;
  date: string; // ISO 8601 string
};

export const FormationSlotSchema = z.object({
  position: z.enum(positions),
  styles: z.array(z.enum(playerStyles)).optional().default([]),
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
}

// --- Tipos para componentes refactorizados

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
};

export type FlatPlayer = {
  player: Player;
  card: PlayerCard;
  ratingsForPos: number[];
  performance: PlayerPerformance;
  affinityScore: number;
  generalScore: number;
  position: Position;
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
            return [...baseStyles, 'Omnipresente', 'Especialista en centros', 'Creador de jugadas', 'Jugador de huecos'];
        case 'MO':
            return [...baseStyles, 'Jugador de huecos', 'Creador de jugadas', 'Diez Clasico', 'Extremo móvil'];
        case 'EXI':
        case 'EXD':
        case 'EXT':
            return [...baseStyles, 'Extremo móvil', 'Extremo prolífico', 'Especialista en centros', 'Creador de jugadas'];
        case 'SD':
            return [...baseStyles, 'Cazagoles', 'Jugador de huecos', 'Señuelo', 'Hombre objetivo', 'Diez Clasico', 'Extremo móvil', 'Creador de jugadas'];
        case 'DC':
            return [...baseStyles, 'Cazagoles', 'Hombre de área', 'Señuelo', 'Hombre objetivo', 'Jugador de huecos', 'Extremo móvil', 'Segundo delantero'];
        default:
            return playerStyles;
    }
}

    
