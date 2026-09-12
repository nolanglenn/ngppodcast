import { describe, it, expect, afterEach } from 'vitest';
import { getRequiredEnv } from './env';

describe('getRequiredEnv', () => {
  afterEach(() => {
    delete process.env.TEST_VAR;
  });

  it('returns the value when set', () => {
    process.env.TEST_VAR = 'hello';
    expect(getRequiredEnv('TEST_VAR')).toBe('hello');
  });

  it('throws a clear error when missing', () => {
    expect(() => getRequiredEnv('TEST_VAR')).toThrow(
      'Missing required environment variable: TEST_VAR'
    );
  });
});
