import type {
  CoherenceResult,
  CoherenceViolation,
  GeneratedEndpoint,
  Schema,
} from './types';

/**
 * Construye el conjunto de nombres de entidades declaradas en el schema.
 */
function declaredEntityNames(schema: Schema): ReadonlySet<string> {
  return new Set<string>(schema.entities.map((entity) => entity.name));
}

/**
 * Valida que todo endpoint generado referencie unicamente entidades declaradas
 * en el schema.
 *
 * Recorre cada endpoint y, para cada entidad referenciada, verifica que exista
 * en el schema. Cada referencia invalida produce una CoherenceViolation. El
 * resultado es coherente si y solo si no se detecta ninguna violacion.
 *
 * La funcion es pura: no lanza excepciones ante datos invalidos, sino que los
 * reporta como violaciones, permitiendo que el llamador decida como reaccionar.
 */
export function validateSchemaEndpointCoherence(
  schema: Schema,
  endpoints: ReadonlyArray<GeneratedEndpoint>,
): CoherenceResult {
  const declared = declaredEntityNames(schema);
  const declaredList: ReadonlyArray<string> = [...declared];
  const violations: CoherenceViolation[] = [];

  for (const endpoint of endpoints) {
    for (const referenced of endpoint.referencedEntities) {
      if (!declared.has(referenced)) {
        violations.push({
          method: endpoint.method,
          path: endpoint.path,
          missingEntity: referenced,
          declaredEntities: declaredList,
        });
      }
    }
  }

  return {
    isCoherent: violations.length === 0,
    violations,
  };
}

/**
 * Error especializado que transporta las violaciones detectadas.
 */
export class SchemaCoherenceError extends Error {
  public readonly violations: ReadonlyArray<CoherenceViolation>;

  constructor(violations: ReadonlyArray<CoherenceViolation>) {
    const detail = violations
      .map(
        (v) =>
          `${v.method} ${v.path} referencia la entidad no declarada "${v.missingEntity}"`,
      )
      .join('; ');
    super(`Incoherencia schema/endpoints: ${detail}`);
    this.name = 'SchemaCoherenceError';
    this.violations = violations;
  }
}

/**
 * Variante estricta: lanza SchemaCoherenceError si existe alguna incoherencia.
 * Util para integrar en el pipeline de generacion y detener la generacion de
 * arquitectura ante un schema/endpoints incoherentes.
 */
export function assertSchemaEndpointCoherence(
  schema: Schema,
  endpoints: ReadonlyArray<GeneratedEndpoint>,
): void {
  const result = validateSchemaEndpointCoherence(schema, endpoints);
  if (!result.isCoherent) {
    throw new SchemaCoherenceError(result.violations);
  }
}
