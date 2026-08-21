import 'dotenv/config';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './src/lib/firebase-config';
import { getPlayerStyleForPosition } from './src/lib/types';

async function main() {
if (!db) throw new Error('Firebase no está configurado.');

const formationSnapshot = await getDocs(collection(db, 'formations'));
const relevantFormations = formationSnapshot.docs.flatMap(document => {
  const formation = document.data() as any;
  if (!formation.isFluid || !Array.isArray(formation.slots) || !Array.isArray(formation.defensiveSlots)) return [];

  const pairs = formation.slots.flatMap((offensiveSlot: any, index: number) => {
    const defensiveSlot = formation.defensiveSlots[index];
    if (offensiveSlot?.position !== 'MO' || defensiveSlot?.position !== 'MC') return [];
    return [{
      number: index + 1,
      offensiveStyles: offensiveSlot.styles || [],
      defensiveStyles: defensiveSlot.styles || [],
    }];
  });

  return pairs.length > 0 ? [{ id: document.id, name: formation.name, pairs }] : [];
});

console.log('FORMATIONS', JSON.stringify(relevantFormations, null, 2));

const playerSnapshot = await getDocs(collection(db, 'players'));
const candidates = playerSnapshot.docs.flatMap(document => {
  const player = document.data() as any;
  return (player.cards || []).flatMap((card: any) => {
    if (!(card.ratingsByPosition?.MO?.length > 0) || !(card.ratingsByPosition?.MC?.length > 0)) return [];
    return [{
      player: player.name,
      card: card.name,
      offensiveMO: getPlayerStyleForPosition(card, 'MO', 'offensive'),
      defensiveMC: getPlayerStyleForPosition(card, 'MC', 'defensive'),
    }];
  });
});

console.log('CANDIDATES', JSON.stringify(candidates, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
