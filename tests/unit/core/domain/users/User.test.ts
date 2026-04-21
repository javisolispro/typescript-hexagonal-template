import { describe, expect, it } from 'vitest';
import { User } from '../../../../../src/core/domain/users/User.js';

describe('User', () => {
  it('exposes id, email, firstName, lastName, avatarUrl', () => {
    const user = new User(
      1,
      'george.bluth@reqres.in',
      'George',
      'Bluth',
      'https://reqres.in/img/faces/1-image.jpg',
    );

    expect(user.id).toBe(1);
    expect(user.email).toBe('george.bluth@reqres.in');
    expect(user.firstName).toBe('George');
    expect(user.lastName).toBe('Bluth');
    expect(user.avatarUrl).toBe('https://reqres.in/img/faces/1-image.jpg');
  });

  it('is a read-only value object', () => {
    const user = new User(1, 'a@b.com', 'A', 'B', 'https://example.com/x.png');
    expect(() => {
      (user as unknown as { email: string }).email = 'mutated@b.com';
    }).toThrow();
  });
});
