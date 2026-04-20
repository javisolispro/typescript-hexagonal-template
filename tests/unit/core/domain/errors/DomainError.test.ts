import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../../../src/core/domain/errors/DomainError.js';

class SampleNotFoundError extends DomainError {
  readonly code = 'SampleNotFound';
}

describe('DomainError', () => {
  it('is an Error subclass with a code and a name matching the subclass', () => {
    const err = new SampleNotFoundError('widget 42 not found');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DomainError);
    expect(err.name).toBe('SampleNotFoundError');
    expect(err.code).toBe('SampleNotFound');
    expect(err.message).toBe('widget 42 not found');
  });

  it('preserves the cause when provided', () => {
    const root = new Error('db timeout');
    const err = new SampleNotFoundError('wrapped failure', root);

    expect(err.cause).toBe(root);
  });
});
