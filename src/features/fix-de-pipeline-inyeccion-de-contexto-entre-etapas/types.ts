// Tipos del pipeline research -> product -> architecture.
// Si src/shared/types/index.ts ya expone equivalentes, reexportar desde ahi.

/** Idea de producto completamente especificada. Es el fixture de entrada. */
export interface IdeaFixture {
  readonly name: string;
  readonly problem: string;
  readonly user: string;
}

/** Salida de la etapa de research. Propaga la idea hacia adelante (inyeccion de contexto). */
export interface ResearchDoc {
  readonly idea: IdeaFixture;
  readonly marketSignals: readonly string[];
  readonly competitors: readonly string[];
  readonly summary: string;
}

/** Salida de la etapa de product. Propaga research (y por lo tanto la idea). */
export interface ProductDoc {
  readonly research: ResearchDoc;
  readonly problemStatement: string;
  readonly personas: readonly string[];
  readonly features: readonly string[];
  readonly roadmap: readonly string[];
  readonly kpis: readonly string[];
}

/** Las seis secciones requeridas del documento de arquitectura. Todas no vacias. */
export interface ArchitectureSections {
  readonly overview: string;
  readonly components: string;
  readonly dataModel: string;
  readonly apis: string;
  readonly infrastructure: string;
  readonly risks: string;
}

/** Salida final del pipeline. */
export interface ArchitectureDoc {
  readonly product: ProductDoc;
  readonly sections: ArchitectureSections;
}

/** Claves ordenadas de las seis secciones, para iterar en el test. */
export const ARCHITECTURE_SECTION_KEYS: readonly (keyof ArchitectureSections)[] = [
  'overview',
  'components',
  'dataModel',
  'apis',
  'infrastructure',
  'risks',
];

/** Se lanza cuando una etapa recibe contexto upstream faltante o vacio. */
export class MissingContextError extends Error {
  constructor(stage: string, field: string) {
    super(`[${stage}] contexto upstream requerido faltante: "${field}"`);
    this.name = 'MissingContextError';
  }
}
