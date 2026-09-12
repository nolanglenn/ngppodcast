import { describe, it, expect, vi } from 'vitest';
import { mapSheetRowsToRetroList, fetchRetroListRows } from './sheets';

describe('mapSheetRowsToRetroList', () => {
  it('maps header + data rows into RetroListItem objects', () => {
    const rows = [
      ['game', 'platform', 'submitted_by', 'notes'],
      ['Chrono Trigger', 'SNES', 'Alice', 'Great pick'],
      ['Metroid', 'NES', 'Bob', ''],
    ];

    expect(mapSheetRowsToRetroList(rows)).toEqual([
      { id: 'row-0', game: 'Chrono Trigger', platform: 'SNES', submittedBy: 'Alice', notes: 'Great pick' },
      { id: 'row-1', game: 'Metroid', platform: 'NES', submittedBy: 'Bob', notes: '' },
    ]);
  });

  it('skips rows missing a game name', () => {
    const rows = [
      ['game', 'platform', 'submitted_by', 'notes'],
      ['', 'SNES', 'Alice', ''],
      ['Metroid', 'NES', 'Bob', ''],
    ];

    const result = mapSheetRowsToRetroList(rows);
    expect(result).toHaveLength(1);
    expect(result[0].game).toBe('Metroid');
  });

  it('returns an empty array for an empty sheet', () => {
    expect(mapSheetRowsToRetroList([])).toEqual([]);
  });
});

describe('fetchRetroListRows', () => {
  it('calls the Sheets API with the configured sheet id, range, and key', async () => {
    process.env.RETRO_LIST_SHEET_ID = 'sheet123';
    process.env.GOOGLE_SHEETS_API_KEY = 'key123';
    process.env.RETRO_LIST_RANGE = 'Sheet1!A:D';

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ values: [['game', 'platform', 'submitted_by', 'notes']] }),
    })) as unknown as typeof fetch;

    const rows = await fetchRetroListRows(fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('spreadsheets/sheet123/values/Sheet1!A%3AD?key=key123')
    );
    expect(rows).toEqual([['game', 'platform', 'submitted_by', 'notes']]);
  });
});
