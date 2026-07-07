// Tipos del intake mínimo de producto (gate de discovery — E2-T1)
// TypeScript strict: sin `any`, todos los tipos explícitos.

/** Nivel de volumen esperado del producto (campo opcional). */
export type VolumeLevel = 'low' | 'medium' | 'high';

/**
 * Datos crudos tal como llegan del request (sin validar).
 * Todo es `unknown` porque provienen de una fuente externa no confiable.
 */
export interface IntakeRequestBody {
  readonly name?: unknown;
  readonly problem?: unknown;
  readonly user?: unknown;
  readonly volume?: unknown;
  readonly handlesPII?: unknown;
  readonly budget?: unknown;
}

/** Campos obligatorios de una idea (gate de discovery). */
export interface RequiredIdeaFields {
  readonly name: string;
  readonly problem: string;
  readonly user: string;
}

/** Campos opcionales de una idea. */
export interface OptionalIdeaFields {
  readonly volume: VolumeLevel | null;
  readonly handlesPII: boolean | null;
  readonly budget: number | null;
}

/** Objeto idea ya validado y persistido. */
export interface Idea extends RequiredIdeaFields, OptionalIdeaFields {
  readonly id: string;
  readonly createdAt: string; // ISO-8601
}

/** Error de validación por campo. */
export interface FieldError {
  readonly field: string;
  readonly message: string;
}

/** Resultado de la validación: éxito con datos o fallo con errores. */
export type ValidationResult =
  | { readonly ok: true; readonly value: RequiredIdeaFields & OptionalIdeaFields }
  | { readonly ok: false; readonly errors: readonly FieldError[] };

/** Respuesta HTTP genérica del intake. */
export interface IntakeResponse {
  readonly status: number;
  readonly body:
    | { readonly idea: Idea }
    | { readonly errors: readonly FieldError[] };
}
