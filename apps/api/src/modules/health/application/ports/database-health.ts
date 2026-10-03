export abstract class DatabaseHealth {
  abstract isUp(): Promise<boolean>;
}
