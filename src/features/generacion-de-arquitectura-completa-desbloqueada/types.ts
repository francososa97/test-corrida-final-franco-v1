// Tipos del feature "Generación de arquitectura completa desbloqueada" (E3-T1).
// Se definen localmente porque src/shared/types/index.ts aún no existe en el repo;
// cuando exista, estos tipos deberían moverse/reexportarse desde allí.

/**
 * PRD completo de entrada. Un PRD se considera "completo" (y por tanto habilita
 * la generación de arquitectura) cuando título, problema, usuario y research
 * tienen contenido real no vacío.
 */
export interface PRDCompleto {
  readonly titulo: string;
  readonly problema: string;
  readonly usuario: string;
  readonly research: string;
}

/** Claves estables de cada una de las 6 secciones generadas. */
export type SeccionKey =
  | 'stack'
  | 'schema'
  | 'endpoints'
  | 'diagrama'
  | 'adrs'
  | 'costos';

/** Orden canónico de las 6 secciones dentro del documento. */
export const SECCIONES_ORDEN: readonly SeccionKey[] = [
  'stack',
  'schema',
  'endpoints',
  'diagrama',
  'adrs',
  'costos',
] as const;

/** Una sección generada del documento de arquitectura. */
export interface SeccionArquitectura {
  readonly key: SeccionKey;
  readonly titulo: string;
  /** Contenido en Markdown. Nunca vacío para un PRD válido. */
  readonly contenido: string;
}

/** Documento de arquitectura completo: las 6 secciones en orden canónico. */
export interface DocumentoArquitectura {
  readonly prdTitulo: string;
  readonly secciones: readonly SeccionArquitectura[];
  /** Documento Markdown unificado (todas las secciones concatenadas). */
  readonly markdown: string;
}

/** Error de validación del PRD: lista los campos faltantes o vacíos. */
export class PRDIncompletoError extends Error {
  public readonly camposFaltantes: readonly string[];

  constructor(camposFaltantes: readonly string[]) {
    super(
      `PRD incompleto: los siguientes campos están vacíos o ausentes: ${camposFaltantes.join(
        ', ',
      )}`,
    );
    this.name = 'PRDIncompletoError';
    this.camposFaltantes = camposFaltantes;
  }
}
