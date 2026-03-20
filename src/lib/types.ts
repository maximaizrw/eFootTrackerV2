import * as z from "zod";

export const playerStyles = [
  'Ninguno',
  'Cazagoles',
  'Hombre de área',
  'Segundo delantero',
  'Hombre objetivo',
  'Señuelo',
  'Creador de juego',
  'Creador de jugadas',
  'El destructor',
  'Portero defensivo',
  'Portero ofensivo',
  'Atacante extra',
  'Lateral defensivo',
  'Lateral ofensivo',
  'Lateral finalizador',
  'Especialista en centros',
  'Omnipresente',
  'Medio escudo',
  'Organizador',
  'Jugador de huecos',
  'Extremo móvil',
  'Extremo prolífico',
  'Diez clásico'
] as const;
export type PlayerStyle = typeof playerStyles[number];

export const positions = ['PT', 'DFC', 'LI', 'LD', 'MCD', 'MC', 'MDI', 'MDD', 'MO', 'EXI', 'EXD', 'SD', 'DC'] as const;
export type Position = typeof positions[number];


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
  "Tijera", "Doble toque", "Elastica", "Marsellesa", "Sombrerito", "Recorte y cambio",
  "Amago por detrás y giro", "Rebote interior", "Control con la suela", "Drible dinamico",
  "Quiebre magistral", "Pies magnéticos", "Cabeceador", "Cabezazo matador",
  "Disparo lejano con rosca", "Rosca bomba", "Sombrero", "Tiro con empeine",
  "Disparo descendente", "Dispar ascendente", "Tiro de larga distancia", "Bombazo raso",
  "Finalización acrobática", "Taconazo", "Remate al primer toque", "Tiro al blanco",
  "Fuerza de voluntad", "Pase al primer toque", "Pase en profundidad", "Pase medido",
  "Pase cruzado", "Centro en picada", "Centro con rosca", "Rabona", "Pase sin mirar",
  "Pase catalizador", "Pase visionario", "Pase fenomenal", "Pase bombeado bajo",
  "Patadon en corto PT", "Patadon en largo", "Saque de banda largo", "Saque de meta largo",
  "Especialista en penales", "Parapenales", "Orden defensivo PT", "Grito de espíritu",
  "Malicia", "Marcaje", "Delantero atrasado", "Interceptador", "Bloqueador",
  "Superioridad aérea", "Entrada deslizante", "Entrada de lago alcance",
  "Liderazgo inquebrantable", "Despeje acrobatico", "Baluarte aéreo", "Capitania",
  "Super refuerzo", "Espiritu de lucha"
] as const;

export type PlayerSkill = typeof playerSkillsList[number];

export const liveUpdateRatings = ['A', 'B', 'C', 'D', 'E'] as const;
export type LiveUpdateRating = typeof liveUpdateRatings[number];

export type PlayerAttributeStats = {
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
  defensiveAwareness?: number;
  defensiveEngagement?: number;
  tackling?: number;
  aggression?: number;
  goalkeeping?: number;
  gkCatching?: number;
  gkParrying?: number;
  gkReflexes?: number;
  gkReach?: number;
  speed?: number;
  acceleration?: number;
  kickingPower?: number;
  jump?: number;
  physicalContact?: number;
  balance?: number;
  stamina?: number;
};

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
  likesByPosition?: { [key in Position]?: (boolean | null)[] };
  attributeStats?: PlayerAttributeStats;
  physicalAttributes?: PhysicalAttribute;
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

export type IdealTeamPlayer = {
  player: Player;
  card: PlayerCard;
  position: Position;
  assignedPosition: string; // The role/position name in the tactical scheme
  average: number;
  overall: number;
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

export const positionsList = positions;

export const FormationSlotSchema = z.object({
  position: z.enum(positions),
  styles: z.array(z.string()).optional().default([]),
  top: z.number().optional(),
  left: z.number().optional(),
  profileName: z.string().optional(),
  secondaryPosition: z.enum(positions).optional(),
  minHeight: z.number().optional(),
});

export type FormationSlot = z.infer<typeof FormationSlotSchema>;

export const formationPlayStyles = ['Contraataque rápido', 'Contraataque largo', 'Por las bandas', 'Balones largos', 'Posesión'] as const;
export type FormationPlayStyle = typeof formationPlayStyles[number];

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

export type AddFormationFormValues = Omit<FormationStats, 'id' | 'matches'>;
export type EditFormationFormValues = Omit<FormationStats, 'matches'>;

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
  likesForPos: (boolean | null)[];
  performance: PlayerPerformance;
  overall: number;
  position: Position;
};

export function getAvailableStylesForPosition(position: Position, includeNone: boolean = false): PlayerStyle[] {
  const baseStyles: PlayerStyle[] = includeNone ? ['Ninguno'] : [];

  switch (position) {
    case 'PT':
      return [...baseStyles, 'Portero defensivo', 'Portero ofensivo'];
    case 'DFC':
      return [...baseStyles, 'El destructor', 'Atacante extra', 'Creador de juego'];
    case 'LI':
    case 'LD':
      return [...baseStyles, 'Lateral defensivo', 'Lateral ofensivo', 'Lateral finalizador'];
    case 'MCD':
      return [...baseStyles, 'El destructor', 'Medio escudo', 'Omnipresente', 'Organizador'];
    case 'MC':
      return [...baseStyles, 'Jugador de huecos', 'Omnipresente', 'Creador de jugadas', 'Organizador', 'El destructor'];
    case 'MDI':
    case 'MDD':
      return [...baseStyles, 'Omnipresente', 'Especialista en centros', 'Creador de jugadas', 'Jugador de huecos', 'Extremo móvil', 'Organizador'];
    case 'MO':
      return [...baseStyles, 'Jugador de huecos', 'Creador de jugadas', 'Diez clásico'];
    case 'EXI':
    case 'EXD':
      return [...baseStyles, 'Extremo móvil', 'Extremo prolífico', 'Especialista en centros', 'Creador de jugadas', 'Jugador de huecos'];
    case 'SD':
      return [...baseStyles, 'Jugador de huecos', 'Diez clásico', 'Creador de jugadas', 'Segundo delantero', 'Creador de juego', 'Señuelo'];
    case 'DC':
      return [...baseStyles, 'Cazagoles', 'Hombre de área', 'Hombre objetivo', 'Segundo delantero'];
    default:
      return [...playerStyles];
  }
}

export const positionLabels: Record<Position, string> = {
  'PT': 'PT',
  'DFC': 'DFC',
  'LI': 'LI',
  'LD': 'LD',
  'MCD': 'MCD',
  'MC': 'MC',
  'MDI': 'MDI',
  'MDD': 'MDD',
  'MO': 'MO',
  'EXI': 'EXI',
  'EXD': 'EXD',
  'SD': 'SD',
  'DC': 'DC',
};

// Hierarchy order for sorting: PT, DFC, LAT (LI/LD), MCD, MC, INT (MDI/MDD), MO, EXT (EXI/EXD), SD, DC
export const positionPriority: Record<Position, number> = {
  'PT': 0,
  'DFC': 1,
  'LI': 2,
  'LD': 3,
  'MCD': 4,
  'MC': 5,
  'MDI': 6,
  'MDD': 7,
  'MO': 8,
  'EXI': 9,
  'EXD': 10,
  'SD': 11,
  'DC': 12
};
