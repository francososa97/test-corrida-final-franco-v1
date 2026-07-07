/**
 * E2-T2 — Conectar intake al Product-Agent.
 *
 * Gate de discovery: solo un intake COMPLETO (title, problem y user no nulos)
 * puede avanzar al Product-Agent. El servicio valida ese contrato, reúne research
 * de mercado (Reddit/HN) y exige que la sección de research no quede vacía antes
 * de devolver el PRD.
 */

import type {
  ConnectDeps,
  Idea,
  IntakeRecord,
  PRD,
  ResearchSignal,
} from './types';

/** El intake solicitado no existe en el store. */
export class IntakeNotFoundError extends Error {
  constructor(public readonly intakeId: string) {
    super(`Intake no encontrado: ${intakeId}`);
    this.name = 'IntakeNotFoundError';
  }
}

/** El intake existe pero no cumple el gate de discovery (campos faltantes). */
export class IncompleteIntakeError extends Error {
  constructor(
    public readonly intakeId: string,
    public readonly missingFields: readonly string[],
  ) {
    super(
      `Intake ${intakeId} incompleto; faltan campos requeridos: ${missingFields.join(', ')}`,
    );
    this.name = 'IncompleteIntakeError';
  }
}

/** El research provider no devolvió señales; el PRD no puede tener research vacío. */
export class EmptyResearchError extends Error {
  constructor(public readonly ideaTitle: string) {
    super(`No se obtuvo research (Reddit/HN) para la idea: ${ideaTitle}`);
    this.name = 'EmptyResearchError';
  }
}

function isNonEmpty(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Valida el gate de discovery y proyecta el registro crudo a una `Idea`
 * con campos no nulos garantizados por el sistema de tipos.
 */
export function toIdea(record: IntakeRecord): Idea {
  const missing: string[] = [];
  if (!isNonEmpty(record.title)) missing.push('title');
  if (!isNonEmpty(record.problem)) missing.push('problem');
  if (!isNonEmpty(record.user)) missing.push('user');

  if (missing.length > 0) {
    throw new IncompleteIntakeError(record.id, missing);
  }

  // Los checks anteriores refinan los campos a `string`; el narrowing no cruza
  // el límite del objeto, así que reafirmamos con `as string` de forma segura.
  return {
    title: (record.title as string).trim(),
    problem: (record.problem as string).trim(),
    user: (record.user as string).trim(),
    context: isNonEmpty(record.context) ? record.context.trim() : null,
    marketSignals: record.marketSignals.filter(isNonEmpty),
  };
}

function assertResearchNotEmpty(
  idea: Idea,
  research: readonly ResearchSignal[],
): readonly ResearchSignal[] {
  if (research.length === 0) {
    throw new EmptyResearchError(idea.title);
  }
  return research;
}

/**
 * Punto de entrada de E2-T2.
 *
 * Dado un `intakeId` de un registro completo guardado:
 *  1. lo recupera del store,
 *  2. aplica el gate de discovery (title/problem/user no nulos),
 *  3. reúne research de mercado (Reddit/HN) y verifica que no esté vacío,
 *  4. invoca al Product-Agent para generar el PRD.
 *
 * @throws {IntakeNotFoundError} si el id no existe.
 * @throws {IncompleteIntakeError} si el intake no pasa el gate.
 * @throws {EmptyResearchError} si no se obtiene research.
 */
export async function connectIntakeToProductAgent(
  deps: ConnectDeps,
  intakeId: string,
): Promise<PRD> {
  const record = await deps.store.get(intakeId);
  if (record === null) {
    throw new IntakeNotFoundError(intakeId);
  }

  const idea = toIdea(record);

  const research = assertResearchNotEmpty(
    idea,
    await deps.research.gather(idea),
  );

  const prd = await deps.agent.generatePRD({ idea, research });

  // Doble control: el PRD que sale del agente debe respetar la garantía del gate.
  assertResearchNotEmpty(idea, prd.research);

  return prd;
}
