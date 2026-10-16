/** Display snapshot identity; revision is local to the bridge, never sent to a provider. */
export interface GameMoveSnapshot {
  provider?: string;
  revision?: number;
  id: string;
  label: string;
  group: string | null;
  detail: string | null;
  odds: number | null;
}
export const gameMoveKey = (choice: GameMoveSnapshot): string =>
  JSON.stringify([choice.provider ?? '', choice.revision ?? 0, choice.id, choice.label, choice.group, choice.detail, choice.odds]);
