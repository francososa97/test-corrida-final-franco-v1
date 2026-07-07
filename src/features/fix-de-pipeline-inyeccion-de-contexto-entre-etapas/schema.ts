// Schema de validación entre la etapa `research` y el `product-agent`.
//
// Contexto: el bug reportado (E1-T2) ocurría porque el pipeline invocaba al
// Product-Agent con un objeto `idea` incompleto (title=undefined o problem
// vacío). El agente, al no tener nada real que procesar, respondía con un PRD
// ficticio o con una disculpa. Este módulo introduce la barrera de validación
// que faltaba: si la idea no cumple el contrato mínimo, el pipeline aborta
// ANTES de gastar una invocación al agente.

/**
 * Contrato mínimo que una idea debe cumplir para pasar de la etapa `research`
 * al `product-agent`. Espejo reducido de los tipos compartidos
 * (`src/shared/types/index.ts`); se declara localmente para mantener el feature
 * autocontenido y evitar acoplamiento con campos opcionales del tipo global.
 */
export interface Idea {
  /** Nombre / título de la idea SaaS. Requerido y no vacío. */
  readonly title?: string | null;
  /** Problema concreto que resuelve. Requerido y no vacío. */
  readonly problem?: string | null;
  /** Campos adicionales de research que no participan de la validación. */
  readonly [key: string]: unknown;
}

/** Campos que el contrato exige que estén presentes y no vacíos. */
export const REQUIRED_IDEA_FIELDS = ['title', 'problem'] as const;

export type RequiredIdeaField = (typeof REQUIRED_IDEA_FIELDS)[number];

/** Mensaje de error estable, consumido por los tests y por el caller. */
export const MISSING_FIELDS_ERROR = 'missing required fields' as const;

/** Resultado exitoso: la idea cumple el contrato. */
export interface ValidIdeaResult {
  readonly ok: true;
  /** Idea con los campos requeridos garantizados como strings no vacíos. */
  readonly idea: ValidatedIdea;
}

/** Resultado fallido: la idea no cumple el contrato. */
export interface InvalidIdeaResult {
  readonly ok: false;
  readonly error: typeof MISSING_FIELDS_ERROR;
  /** Lista de campos que fallaron, para diagnóstico/logging. */
  readonly missingFields: readonly RequiredIdeaField[];
}

export type IdeaValidationResult = ValidIdeaResult | InvalidIdeaResult;

/**
 * Idea que superó la validación: los campos requeridos son strings no vacíos.
 * El estrechamiento de tipos permite al Product-Agent consumir `idea.title`
 * sin comprobaciones de nulabilidad adicionales.
 */
export type ValidatedIdea = Idea & {
  readonly [K in RequiredIdeaField]: string;
};

/** Un valor cuenta como presente si es string y tiene contenido tras trim(). */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Valida que una idea cumpla el contrato mínimo entre `research` y
 * `product-agent`. Función pura: no lanza, no muta, no hace side-effects.
 *
 * @param idea Objeto idea proveniente de la etapa de research (puede ser
 *             parcial, nulo o de forma desconocida).
 * @returns Discriminated union con el resultado de la validación.
 */
export function validateIdeaSchema(idea: Idea | null | undefined): IdeaValidationResult {
  const source: Idea = idea ?? {};

  const missingFields = REQUIRED_IDEA_FIELDS.filter(
    (field) => !isNonEmptyString(source[field]),
  );

  if (missingFields.length > 0) {
    return {
      ok: false,
      error: MISSING_FIELDS_ERROR,
      missingFields,
    };
  }

  return {
    ok: true,
    idea: source as ValidatedIdea,
  };
}
