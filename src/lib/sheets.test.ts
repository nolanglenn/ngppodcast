import { describe, it, expect, vi } from 'vitest';
import { mapSheetRowsToRetroList, fetchRetroListRows } from './sheets';

describe('mapSheetRowsToRetroList', () => {
  it('maps header + data rows into RetroListItem objects', () => {
    const rows = [
      ['Title', 'Date', 'Original System', 'Episode #'],
      ['Chrono Trigger', '1995', 'SNES', '15'],
      ['Metroid', '1986', 'NES', ''],
    ];

    expect(mapSheetRowsToRetroList(rows)).toEqual([
      { id: 'row-0', game: 'Chrono Trigger', platform: 'SNES', releaseYear: '1995', episodeNumber: '15' },
      { id: 'row-1', game: 'Metroid', platform: 'NES', releaseYear: '1986', episodeNumber: '' },
    ]);
  });

  it('skips rows missing a game title, logging which row was skipped', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows = [
      ['Title', 'Date', 'Original System', 'Episode #'],
      ['', '1995', 'SNES', ''],
      ['Metroid', '1986', 'NES', ''],
    ];

    const result = mapSheetRowsToRetroList(rows);
    expect(result).toHaveLength(1);
    expect(result[0].game).toBe('Metroid');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('data row 0');
    warn.mockRestore();
  });

  it('returns an empty array for an empty sheet', () => {
    expect(mapSheetRowsToRetroList([])).toEqual([]);
  });
});

describe('fetchRetroListRows', () => {
  it('calls the Sheets API with the configured sheet id, range, and key', async () => {
    process.env.RETRO_LIST_SHEET_ID = 'sheet123';
    process.env.GOOGLE_SHEETS_API_KEY = 'key123';
    process.env.RETRO_LIST_RANGE = 'Sheet1!A2:D';

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ values: [['Title', 'Date', 'Original System', 'Episode #']] }),
    })) as unknown as typeof fetch;

    const rows = await fetchRetroListRows(fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('spreadsheets/sheet123/values/Sheet1!A2%3AD?key=key123')
    );
    expect(rows).toEqual([['Title', 'Date', 'Original System', 'Episode #']]);
  });
});
