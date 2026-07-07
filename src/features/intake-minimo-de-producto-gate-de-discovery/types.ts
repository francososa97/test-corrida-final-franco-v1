/**
 * Tipos del gate de intake minimo de producto (E2-T3).
 *
 * NOTA: `src/shared/types/index.ts` todavia no existe en el repo. Estos tipos
 * estan pensados para migrar a ese modulo compartido en cuanto se cree; mientras
 * tanto viven aca para que la feature compile y funcione de forma autonoma.
 */

/** Valores centinela que el pipeline de research usa para "campo no provisto". */
export const MISSING_SENTINELS: readonly string[] = [
  'no provista',
  'no provisto',
  'no provista/o',
  'no provisto/a',
  'no disponible',
  'n/a',
  'null',
  'undefined',
];

/**
 * PRD tal como llega desde la etapa de producto. Todos los campos obligatorios
 * son nullable a proposito: el gate existe justamente porque pueden llegar
 * incompletos.
 */
export interface IncomingPrd {
  readonly title: string | null;
  readonly description: string | null;
  readonly targetUsers: string | null;
  readonly problem: string | null;
  readonly features: readonly string[] | null;
  /** Campos extra que el gate ignora pero preserva. */
  readonly [extra: string]: unknown;
}

/** Un campo obligatorio del PRD que el gate debe validar antes de arquitectura. */
export type RequiredPrdField =
  | 'title'
  | 'description'
  | 'targetUsers'
  | 'problem'
  | 'features';

/** Detalle de un campo que fallo la validacion. */
export interface MissingFieldReport {
  readonly field: RequiredPrdField;
  readonly reason: 'null' | 'empty' | 'sentinel';
  readonly value: string | null;
}

/** Resultado cuando el PRD esta completo y arquitectura puede ejecutar. */
export interface GatePassed {
  readonly status: 'passed';
  readonly elapsedMs: number;
}

/** Resultado cuando el PRD esta incompleto: arquitectura NO ejecuta. */
export interface GateBlocked {
  readonly status: 'blocked';
  readonly message: string;
  readonly missingFields: readonly MissingFieldReport[];
  readonly elapsedMs: number;
}

export type GateResult = GatePassed | GateBlocked;

/** Opciones de configuracion del gate. */
export interface GateOptions {
  /**
   * Presupuesto maximo de tiempo en ms. Si la validacion lo excede se bloquea
   * igual (fail-closed) para respetar el AC de "menos de 2 segundos".
   * Default: 2000.
   */
  readonly deadlineMs?: number;
}

/** Lista canonica de campos obligatorios evaluados por el gate. */
export const REQUIRED_PRD_FIELDS: readonly RequiredPrdField[] = [
  'title',
  'description',
  'targetUsers',
  'problem',
  'features',
];
