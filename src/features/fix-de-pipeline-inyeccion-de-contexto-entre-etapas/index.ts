import { diagnoseIdeaLoss } from './service';
import type { DiagnosisReport, PipelineRun } from './types';

export * from './types';
export { diagnoseIdeaLoss, classifyPresence, buildObservations, extractEvidence, TRACKED_FIELDS } from './service';

/**
 * Run REPRODUCIBLE que reproduce el sintoma del PRD: la etapa product-agent
 * recibe title 'undefined' y problem 'No provista', sin fuentes Reddit/HN.
 * Aqui research SI poblo la idea, pero el mapeo de contexto hacia product-agent
 * la perdio: es el bug de inyeccion de contexto ENTRE etapas (n8n variable map).
 */
export const SAMPLE_FAILING_RUN: PipelineRun = {
  runId: 'test-corrida-final-franco-v1',
  stages: [
    {
      stage: 'ingestion',
      inputIdea: { title: 'CoParent', problem: 'coordinar crianza entre padres separados' },
      outputIdea: { title: 'CoParent', problem: 'coordinar crianza entre padres separados' },
      logLines: ['[ingestion] idea recibida: title=CoParent problem=coordinar crianza...'],
    },
    {
      stage: 'research',
      inputIdea: { title: 'CoParent', problem: 'coordinar crianza entre padres separados' },
      outputIdea: {
        title: 'CoParent',
        problem: 'coordinar crianza entre padres separados',
        sources: [
          {
            platform: 'reddit',
            url: 'https://reddit.com/r/coparenting/x',
            excerpt: 'las apps fallan al sincronizar agendas',
          },
        ],
      },
      logLines: [
        '[research] input idea.title=CoParent idea.problem=coordinar crianza...',
        '[research] scraping reddit r/coparenting -> 1 hit',
        '[research] output idea poblada OK (title, problem, 1 source)',
      ],
    },
    {
      stage: 'product-agent',
      inputIdea: { title: 'undefined', problem: 'No provista', sources: [] },
      outputIdea: { title: 'undefined', problem: 'No provista', sources: [] },
      logLines: ['[product-agent] input idea.title=undefined idea.problem=No provista (0 sources)'],
    },
  ],
};

/** Render legible del reporte, con el log de research adjunto por cada perdida. */
export function renderReport(report: DiagnosisReport): string {
  const lines: string[] = [];
  lines.push(`=== Diagnostico perdida de idea -- run ${report.runId} ===`);
  lines.push(`Reproducible: ${report.reproducible ? 'si' : 'no'}`);
  lines.push(`Causa raiz: ${report.rootCauseStage}`);
  lines.push(report.summary);
  for (const point of report.lossPoints) {
    lines.push('');
    lines.push(`- Campo idea.${point.field}: perdida en '${point.stage}' (boundary=${point.boundary})`);
    lines.push(`  ${point.description}`);
    lines.push('  Log de research (evidencia del punto exacto de perdida):');
    for (const logLine of point.evidenceLog) {
      lines.push(`    ${logLine}`);
    }
  }
  return lines.join('\n');
}

/** Ejecuta el diagnostico sobre un run y devuelve el reporte estructurado. */
export function runDiagnosis(run: PipelineRun): DiagnosisReport {
  return diagnoseIdeaLoss(run);
}
