import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateIdealTeam } from './team-generator';
import { getFormationSlotStyles } from './types';
import type { FormationSlot, FormationStats, Player, PlayerCard } from './types';

const player = (id: string, card: Partial<PlayerCard>): Player => ({
  id, name: id, nationality: 'Sin Nacionalidad',
  cards: [{ id: `card-${id}`, name: id, style: 'Básico', ratingsByPosition: { DC: [8] }, ...card }],
});
const formation = (slots: FormationSlot[], extra: Partial<FormationStats> = {}): FormationStats => ({
  id: '5', name: 'Formación 5', playStyle: 'Posesión', matches: [], slots, ...extra,
});
const holePlayer = player('huecos', { offensiveStyle: 'Jugador de huecos' });
const goalscorer = player('cazagoles', { offensiveStyle: 'Cazagoles', ratingsByPosition: { DC: [10] } });

for (const [position, style] of [['PT', 'Portero ofensivo'], ['DFC', 'El destructor']] as const) {
  for (const legacy of [false, true]) {
    test(`${position} respects ${style} in ${legacy ? 'legacy' : 'explicit'} defensive requirements`, () => {
      const compatible = player('compatible', {
        style, ratingsByPosition: { [position]: [7] },
      });
      const other = player('other', { ratingsByPosition: { [position]: [10] } });
      const slot: FormationSlot = legacy
        ? { position, styles: [style], defensiveStyles: [] }
        : { position, styles: [], defensiveStyles: [style] };
      const selected = formation([slot]);
      assert.equal(generateIdealTeam([other, compatible], selected)[0].starter?.player.id, 'compatible');
      assert.equal(generateIdealTeam([other], selected)[0].starter?.player.name, 'Vacante');
      const normalized = getFormationSlotStyles(slot);
      assert.deepEqual(normalized, { offensiveStyles: [], defensiveStyles: [style] });
      const saved = { ...slot, ...normalized, styles: normalized.offensiveStyles };
      assert.deepEqual(getFormationSlotStyles(saved), normalized);
      assert.deepEqual(getFormationSlotStyles({ ...saved, defensiveStyles: [] }).defensiveStyles, []);
    });
  }
}

test('the visible DC requirement overrides stale offensiveStyles in a non-fluid formation', () => {
  for (const offensiveStyles of [[], ['Cazagoles']]) {
    const team = generateIdealTeam([holePlayer, goalscorer], formation([
      { position: 'DC', styles: ['Jugador de huecos'], offensiveStyles },
    ]));
    assert.equal(team[0].starter?.player.id, 'huecos');
    assert.equal(team[0].starter?.isAlternativeSelection, false);
  }
});

test('a required style without an eligible player leaves a vacancy', () => {
  const team = generateIdealTeam([goalscorer], formation([
    { position: 'DC', styles: ['Jugador de huecos'] },
  ]));
  assert.equal(team[0].starter?.player.name, 'Vacante');
});

test('reassigns a shared player to satisfy all starting slots without duplicates', () => {
  const versatile = player('versatil', {
    ratingsByPosition: { MO: [10], DC: [10] }, offensiveStyle: 'Jugador de huecos',
  });
  const midfielder = player('mediapunta', { ratingsByPosition: { MO: [8] } });
  const team = generateIdealTeam([versatile, midfielder, goalscorer], formation([
    { position: 'MO', styles: [] },
    { position: 'DC', styles: ['Jugador de huecos'] },
  ]));
  assert.equal(team[0].starter?.player.id, 'mediapunta');
  assert.equal(team[1].starter?.player.id, 'versatil');
  assert.ok(team.every(slot => slot.substitute?.player.id !== 'versatil'));
});

test('fallbacks for earlier slots cannot consume a later exact match', () => {
  const team = generateIdealTeam([holePlayer, goalscorer], formation([
    { position: 'PT', styles: [] },
    { position: 'DC', styles: ['Jugador de huecos'] },
  ]));
  assert.equal(team[1].starter?.player.id, 'huecos');
  assert.equal(team[0].starter?.player.id, 'cazagoles');
});

test('fluid formations require both phase styles at their corresponding positions', () => {
  const compatible = player('compatible', {
    offensiveStyle: 'Jugador de huecos', secondaryPositions: ['MO'],
    defensiveStyleByPosition: { MO: 'Defensa incansable' },
  });
  const team = generateIdealTeam([holePlayer, compatible], formation([
    { position: 'DC', styles: [], offensiveStyles: ['Jugador de huecos'], defensiveStyles: ['Defensa incansable'] },
  ], { isFluid: true, defensiveSlots: [{ position: 'MO', styles: [] }] }));
  assert.equal(team[0].starter?.player.id, 'compatible');
});

test('accepts any selected style and respects manual discards', () => {
  const selected = formation([{ position: 'DC', styles: ['Jugador de huecos', 'Cazagoles'] }]);
  assert.equal(generateIdealTeam([holePlayer, goalscorer], selected)[0].starter?.player.id, 'cazagoles');
  assert.equal(generateIdealTeam([holePlayer, goalscorer], selected, new Set(['card-cazagoles']))[0].starter?.player.id, 'huecos');
});
