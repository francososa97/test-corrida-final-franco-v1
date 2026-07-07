/**
 * Tipos compartidos para la validación de schema entre la etapa de research
 * y el Product-Agent.
 *
 * NOTA: se intentó reusar `src/shared/types/index.ts` (según instrucciones),
 * pero ese archivo aún no existe en el repo. Estos tipos están pensados para
 * migrar/re-exportarse desde ahí sin cambios de forma.
 */

/** Campos requeridos que el Product-Agent necesita para trabajar. */
export const REQUIRED_IDEA_FIELDS = ['title', 'problem'] as const;

export type RequiredIdeaField = (typeof REQUIRED_IDEA_FIELDS)[number];

/**
 * Objeto "idea" tal como sale de la etapa de research. Todos los campos son
 * opcionales porque research puede emitir datos incompletos (title=undefined,
 * problem vacío, etc.). La validación es la que garantiza la forma completa.
 */
export interface RawIdea {
  readonly title?: string | null;
  readonly problem?: string | null;
  readonly description?: string | null;
  readonly marketSignals?: readonly string[];
}

/**
 * Idea validada: garantiza que los campos requeridos existen y son strings
 * no vacíos. Es la forma que consume el Product-Agent.
 */
export interface ValidatedIdea {
  readonly title: string;
  readonly problem: string;
  readonly description: string | null;
  readonly marketSignals: readonly string[];
}

/** Resultado discriminado de la validación de schema. */
export type ValidationResult =
  | { readonly ok: true; readonly idea: ValidatedIdea }
  | { readonly ok: false; readonly error: 'missing required fields'; readonly missingFields: readonly RequiredIdeaField[] };

/** Error que aborta el pipeline antes de invocar al Product-Agent. */
export class MissingRequiredFieldsError extends Error {
  public readonly code = 'missing required fields' as const;
  public readonly missingFields: readonly RequiredIdeaField[];

  constructor(missingFields: readonly RequiredIdeaField[]) {
    super(`missing required fields: ${missingFields.join(', ')}`);
    this.name = 'MissingRequiredFieldsError';
    this.missingFields = missingFields;
    // Preserva la cadena de prototipos al transpilar a ES5/ES6.
    Object.setPrototypeOf(this, MissingRequiredFieldsError.prototype);
  }
}
