/**
 * Tipos do `node:sqlite`, só o pedaço que os testes da cota usam.
 *
 * O runtime dos testes é o Node 24, que tem o módulo, mas o projeto está no
 * `@types/node` 20, que ainda não o descreve. Quando os tipos forem
 * atualizados, este arquivo pode ser apagado.
 */
declare module "node:sqlite" {
  interface StatementSync {
    all(...parametros: unknown[]): unknown[];
    run(...parametros: unknown[]): unknown;
  }
  export class DatabaseSync {
    constructor(caminho: string);
    prepare(consulta: string): StatementSync;
  }
}
