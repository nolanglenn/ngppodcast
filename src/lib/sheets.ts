import { getRequiredEnv } from './env';
import type { RetroListItem } from './types';

interface SheetsValuesResponse {
  values?: string[][];
}

export function mapSheetRowsToRetroList(rows: string[][]): RetroListItem[] {
  if (rows.length === 0) return [];
  const [header, ...dataRows] = rows;
  const colIndex = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);

  const gameIdx = colIndex('title');
  const platformIdx = colIndex('original system');
  const yearIdx = colIndex('date');
  const episodeIdx = colIndex('episode #');

  const items: RetroListItem[] = [];
  dataRows.forEach((row, i) => {
    const game = gameIdx >= 0 ? row[gameIdx]?.trim() : undefined;
    if (!game) {
      // skip malformed/empty row rather than crash the page
      console.warn(
        `[sheets] skipping Retro List data row ${i} (sheet row ${i + 2}): no value in the ` +
          `"Title" column (header index ${gameIdx}${gameIdx < 0 ? ' — header column not found' : ''})`
      );
      return;
    }
    items.push({
      id: `row-${i}`,
      game,
      platform: (platformIdx >= 0 ? row[platformIdx] : '') ?? '',
      releaseYear: (yearIdx >= 0 ? row[yearIdx] : '') ?? '',
      episodeNumber: (episodeIdx >= 0 ? row[episodeIdx] : '') ?? '',
    });
  });
  return items;
}

export async function fetchRetroListRows(fetchImpl: typeof fetch = fetch): Promise<string[][]> {
  const sheetId = getRequiredEnv('RETRO_LIST_SHEET_ID');
  const apiKey = getRequiredEnv('GOOGLE_SHEETS_API_KEY');
  const range = process.env.RETRO_LIST_RANGE ?? 'Sheet1!A:D';

  const res = await fetchImpl(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`
  );
  if (!res.ok) throw new Error(`Sheets request failed: ${res.status}`);
  const data = (await res.json()) as SheetsValuesResponse;
  return data.values ?? [];
}
