export const FORMATIONS: Record<number, { id: string; rows: number[] }[]> = {
  5: [
    { id: "2-1-1", rows: [1, 2, 1, 1] },
    { id: "1-2-1", rows: [1, 1, 2, 1] },
    { id: "2-2", rows: [1, 2, 2] },
  ],
  6: [
    { id: "2-2-1", rows: [1, 2, 2, 1] },
    { id: "3-2", rows: [1, 3, 2] },
    { id: "2-1-2", rows: [1, 2, 1, 2] },
  ],
  7: [
    { id: "2-3-1", rows: [1, 2, 3, 1] },
    { id: "3-2-1", rows: [1, 3, 2, 1] },
    { id: "2-1-2-1", rows: [1, 2, 1, 2, 1] },
  ],
  8: [
    { id: "3-3-1", rows: [1, 3, 3, 1] },
    { id: "2-3-2", rows: [1, 2, 3, 2] },
    { id: "3-2-2", rows: [1, 3, 2, 2] },
  ],
  9: [
    { id: "3-3-2", rows: [1, 3, 3, 2] },
    { id: "3-4-1", rows: [1, 3, 4, 1] },
    { id: "2-4-2", rows: [1, 2, 4, 2] },
  ],
  10: [
    { id: "4-3-2", rows: [1, 4, 3, 2] },
    { id: "3-4-2", rows: [1, 3, 4, 2] },
    { id: "4-4-1", rows: [1, 4, 4, 1] },
  ],
  11: [
    { id: "4-3-3", rows: [1, 4, 3, 3] },
    { id: "4-4-2", rows: [1, 4, 4, 2] },
    { id: "3-5-2", rows: [1, 3, 5, 2] },
    { id: "4-2-3-1", rows: [1, 4, 2, 3, 1] },
    { id: "5-3-2", rows: [1, 5, 3, 2] },
  ],
};

export function formationLabel(rows: number[]) {
  const outfield = rows[0] === 1 ? rows.slice(1) : rows;
  return outfield.join("-");
}

export function parseFormation(input: string, side: number) {
  const parts = input
    .split(/[^0-9]+/)
    .map((part) => Number(part))
    .filter((part) => part > 0);
  if (parts.length === 0) return null;
  const sum = parts.reduce((total, part) => total + part, 0);
  if (sum === side) return parts;
  if (sum === side - 1) return [1, ...parts];
  return null;
}

export function slotPoints(rows: number[]) {
  const points: { index: number; x: number; y: number }[] = [];
  const last = Math.max(rows.length - 1, 1);
  rows.forEach((count, row) => {
    const y = 86 - (row * 72) / last;
    for (let index = 0; index < count; index += 1) {
      points.push({
        index: points.length,
        x: ((index + 1) / (count + 1)) * 100,
        y,
      });
    }
  });
  return points;
}

export function defaultRows(side: number) {
  return FORMATIONS[side]?.[0]?.rows ?? [1, Math.max(side - 2, 1), 1];
}
