import type { Env } from './env';

/** Token de injeção da configuração já validada. */
export abstract class AppConfig {
  abstract readonly env: Env;
}
