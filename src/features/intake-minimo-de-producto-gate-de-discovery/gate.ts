/**
 * Gate de discovery (E2-T3): bloqueo explicito cuando el PRD llega incompleto
 * a la etapa de arquitectura.
 *
 * AC: dado un PRD con cualquier campo obligatorio null o 'No provista', la etapa
 * de arquitectura no ejecuta y devuelve un mensaje de bloqueo en < 2s, sin
 * generar contenido inventado.
 *
 * El gate es 100% sincronico y CPU-bound (solo validacion de campos), por lo que
 * la latencia real es de microsegundos; el presupuesto de 2s se mide y expone
 * en el resultado para poder verificar el AC de forma explicita.
 */

import {
  NOT_PROVIDED,
  REQUIRED_PRD_FIELDS,
  type GateBlocked,
  type GatePassed,
  type GateResult,
  type ProductPrd,
  type RequiredPrdField,
} from './types';

/** Presupuesto de latencia maximo del gate segun el AC. */
export const GATE_LATENCY_BUDGET_MS = 2000;

const NOT_PROVIDED_NORMALIZED = NOT_PROVIDED.trim().toLowerCase();

/** Etiquetas legibles para el mensaje de bloqueo al usuario. */
const FIELD_LABELS: Record<RequiredPrdField, string> = {
  title: 'Nombre/titulo de la idea o producto',
  description: 'Descripcion breve (que problema resuelve y para quien)',
  targetUsers: 'Mercado objetivo / usuarios target',
  problem: 'Problema que resuelve',
  features: 'Features o alcance inicial',
};

/**
 * Un valor cuenta como faltante si es null/undefined, string vacio (tras trim),
 * el centinela 'No provista' (case-insensitive), o una lista vacia / con solo
 * elementos faltantes.
 */
function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '' || normalized === NOT_PROVIDED_NORMALIZED;
  }
  if (Array.isArray(value)) {
    return value.length === 0 || value.every(isMissing);
  }
  return false;
}

/** Devuelve los campos obligatorios que faltan en el PRD (en orden estable). */
export function findMissingRequiredFields(prd: ProductPrd): RequiredPrdField[] {
  return REQUIRED_PRD_FIELDS.filter((field) => isMissing(prd[field]));
}

/** Construye el mensaje de bloqueo. No inventa contenido: solo pide los datos. */
function buildBlockMessage(missing: readonly RequiredPrdField[]): string {
  const bullets = missing.map((field) => `  - ${FIELD_LABELS[field]}`).join('\n');
  return [
    'No puedo pasar a la etapa de arquitectura: el PRD llego incompleto.',
    '',
    'Faltan estos campos obligatorios:',
    bullets,
    '',
    'Completa esos datos y volve a enviar el PRD. No genero arquitectura ni contenido sobre informacion inexistente.',
  ].join('\n');
}

/**
 * Ejecuta el gate previo a arquitectura.
 *
 * @param prd   PRD entrante (posiblemente parcial).
 * @param now   Reloj inyectable para medir latencia (testeable). Default Date.now.
 * @returns     GateBlocked (no ejecuta arquitectura) o GatePassed (puede seguir).
 */
export function runArchitectureGate(
  prd: ProductPrd,
  now: () => number = Date.now,
): GateResult {
  const startedAt = now();
  const missingFields = findMissingRequiredFields(prd);
  const elapsedMs = Math.max(0, now() - startedAt);

  if (missingFields.length > 0) {
    const blocked: GateBlocked = {
      status: 'blocked',
      missingFields,
      message: buildBlockMessage(missingFields),
      elapsedMs,
    };
    return blocked;
  }

  const passed: GatePassed = { status: 'passed', prd, elapsedMs };
  return passed;
}

/** Type guard: true si el gate bloqueo la ejecucion de arquitectura. */
export function isBlocked(result: GateResult): result is GateBlocked {
  return result.status === 'blocked';
}
