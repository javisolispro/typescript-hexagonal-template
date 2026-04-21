import { HelloWorld } from "../../domain/hello-world/HelloWorld.js";
import type { LoggerPort } from "../../ports/LoggerPort.js";

export class HelloWorldUseCase {
    constructor(private readonly logger: LoggerPort) {}
    
    execute(): HelloWorld {
        this.logger.info('HelloWorldUseCase executed');
        return new HelloWorld('Hello, World!');
    }
}