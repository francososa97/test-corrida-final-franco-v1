/**
 * Gate de discovery — E2-T3.
 *
 * Bloqueo explícito cuando el PRD llega incompleto a la etapa de arquitectura.
 *
 * Acceptance Criteria:
 *   Dado un PRD con cualquier campo obligatorio null o "No provista", la etapa
 *   de arquitectura NO ejecuta y devuelve al usuario un mensaje de bloqueo en
 *   menos de 2 segundos, sin generar contenido inventado.
 *
 * La validación es puramente síncrona (inspección de strings), por lo que el
 * costo es de microsegundos y el presupuesto de 2s queda garantizado sin I/O.
 */

import {
  NOT_PROVIDED_SENTINEL,
  PRD_FIELD_LABELS,
  REQUIRED_PRD_FIELDS,
  type ArchitectureGateResult,
  type MissingField,
  type MissingReason,
  type ProductPRD,
  type PRDValidationBlocked,
  type PRDValidationResult,
} from "./types";

/** Presupuesto máximo de tiempo del gate exigido por el AC (2 segundos). */
export const GATE_TIME_BUDGET_MS = 2_000;

/**
 * Clasifica el valor de un campo obligatorio. Devuelve el motivo de faltante
 * o `null` si el valor es válido.
 *
 * Se considera faltante:
 *  - null / undefined                       -> "null"
 *  - string vacía o sólo espacios           -> "empty"
 *  - el sentinela "No provista" (case/ws-insensitive) -> "not_provided"
 *  - cualquier valor no-string (tipo inesperado)      -> "null"
 */
function classifyField(value: unknown): MissingReason | null {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value !== "string") {
    // Un campo obligatorio con un tipo inesperado se trata como ausente:
    // nunca se asume contenido válido para no "inventar".
    return "null";
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    return "empty";
  }
  if (normalized.toLowerCase() === NOT_PROVIDED_SENTINEL.toLowerCase()) {
    return "not_provided";
  }
  return null;
}

/** Detecta todos los campos obligatorios faltantes en un PRD. */
export function findMissingFields(
  prd: Readonly<Partial<ProductPRD>> | null | undefined,
): MissingField[] {
  const missing: MissingField[] = [];
  for (const field of REQUIRED_PRD_FIELDS) {
    const value: unknown = prd == null ? undefined : prd[field];
    const reason = classifyField(value);
    if (reason !== null) {
      missing.push({ field, label: PRD_FIELD_LABELS[field], reason });
    }
  }
  return missing;
}

/** Texto humano del motivo, usado en el mensaje de bloqueo. */
function reasonText(reason: MissingReason): string {
  switch (reason) {
    case "null":
      return "no fue provisto";
    case "empty":
      return "está vacío";
    case "not_provided":
      return `quedó como "${NOT_PROVIDED_SENTINEL}"`;
    default: {
      // Exhaustividad: si se agrega un MissingReason nuevo, TS marca error acá.
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

/**
 * Construye el mensaje de bloqueo para el usuario. No inventa contenido:
 * sólo enumera qué falta y qué se necesita para continuar.
 */
export function buildBlockMessage(missing: readonly MissingField[]): string {
  const lines = missing.map(
    (m, i) => `  ${i + 1}. ${m.label}: ${reasonText(m.reason)}`,
  );
  return [
    "🚫 No puedo avanzar a la etapa de arquitectura: el PRD llegó incompleto.",
    "",
    "Faltan campos obligatorios del intake mínimo de producto:",
    ...lines,
    "",
    "Completá esos datos y volvé a enviar el PRD. No genero arquitectura sobre",
    "una idea inexistente para evitar contenido inventado.",
  ].join("\n");
}

/**
 * Valida un PRD contra los campos obligatorios del gate de discovery.
 * Operación síncrona y determinística.
 */
export function validatePRD(
  prd: Readonly<Partial<ProductPRD>> | null | undefined,
): PRDValidationResult {
  const missing = findMissingFields(prd);
  if (missing.length === 0) {
    return { ok: true };
  }
  const blocked: PRDValidationBlocked = {
    ok: false,
    missing,
    message: buildBlockMessage(missing),
  };
  return blocked;
}

/**
 * Fuente de tiempo inyectable para medir el gate (facilita testear el budget).
 * Usa `performance.now()` si está disponible, con fallback a `Date.now()`.
 */
export type Clock = () => number;

const defaultClock: Clock =
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? (): number => performance.now()
    : (): number => Date.now();

/**
 * Ejecuta la etapa de arquitectura SÓLO si el PRD pasa el gate.
 *
 * - Si el PRD está incompleto: NO invoca `runArchitecture`, devuelve un
 *   resultado `blocked` con el mensaje para el usuario. Garantizado < 2s
 *   (la validación es O(#campos) sin I/O).
 * - Si el PRD es válido: ejecuta `runArchitecture` y devuelve su salida.
 */
export async function runArchitectureStage<T>(
  prd: Readonly<Partial<ProductPRD>> | null | undefined,
  runArchitecture: (validPrd: ProductPRD) => Promise<T> | T,
  clock: Clock = defaultClock,
): Promise<ArchitectureGateResult<T>> {
  const start = clock();
  const validation = validatePRD(prd);

  if (!validation.ok) {
    // Gate cerrado: cortocircuito, sin ejecutar arquitectura ni inventar nada.
    return {
      status: "blocked",
      output: null,
      message: validation.message,
      missing: validation.missing,
      elapsedMs: clock() - start,
    };
  }

  // En este punto el PRD pasó el gate: los campos obligatorios son strings no vacíos.
  const output = await runArchitecture(prd as ProductPRD);
  return {
    status: "ok",
    output,
    message: null,
    missing: [],
    elapsedMs: clock() - start,
  };
}

/** True si el resultado del gate quedó bloqueado. Helper de narrowing. */
export function isBlocked<T>(
  result: ArchitectureGateResult<T>,
): result is ArchitectureGateResult<T> & { status: "blocked"; message: string } {
  return result.status === "blocked";
}
