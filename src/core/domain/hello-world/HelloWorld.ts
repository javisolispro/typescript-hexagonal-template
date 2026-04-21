export class HelloWorld {
  readonly message: string;

  constructor(message: string) {
    this.message = message;
    Object.freeze(this);
  }
}
