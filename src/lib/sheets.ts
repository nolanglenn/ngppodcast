import { getRequiredEnv } from './env';
import type { RetroListItem } from './types';

interface SheetsValuesResponse {
  values?: string[][];
}

export function mapSheetRowsToRetroList(rows: string[][]): RetroListItem[] {
  if (rows.length === 0) return [];
  const [header, ...dataRows] = rows;
  const colIndex = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);

  const gameIdx = colIndex('game');
  const platformIdx = colIndex('platform');
  const submittedByIdx = colIndex('submitted_by');
  const notesIdx = colIndex('notes');

  const items: RetroListItem[] = [];
  dataRows.forEach((row, i) => {
    const game = gameIdx >= 0 ? row[gameIdx]?.trim() : undefined;
    if (!game) return; // skip malformed/empty row rather than crash the page
    items.push({
      id: `row-${i}`,
      game,
      platform: (platformIdx >= 0 ? row[platformIdx] : '') ?? '',
      submittedBy: (submittedByIdx >= 0 ? row[submittedByIdx] : '') ?? '',
      notes: (notesIdx >= 0 ? row[notesIdx] : '') ?? '',
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
