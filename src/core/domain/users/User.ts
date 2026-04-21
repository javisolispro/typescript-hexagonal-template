export class User {
  constructor(
    readonly id: number,
    readonly email: string,
    readonly firstName: string,
    readonly lastName: string,
    readonly avatarUrl: string,
  ) {
    Object.freeze(this);
  }
}
