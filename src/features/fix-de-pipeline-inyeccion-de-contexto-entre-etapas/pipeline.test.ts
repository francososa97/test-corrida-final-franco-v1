// Test end-to-end del pipeline research -> product -> arquitectura (E1-T3).
// Usa el runner nativo `node:test` (sin dependencias externas).
//
// AC: dado un fixture de idea completo, correr el pipeline completo produce un
// documento de arquitectura con las 6 secciones NO vacias; el test falla si
// alguna seccion queda vacia.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Idea, ARCHITECTURE_SECTION_KEYS, PipelineContextError } from './types';
import { runPipeline, findEmptyArchitectureSections } from './pipeline';

/** Fixture de idea completo requerido por el AC. */
const COMPLETE_IDEA: Idea = {
  name: 'Nomina Simple',
  problem: 'liquidar sueldos toma dias y se cometen errores manuales de calculo',
  user: 'jefes de RRHH en pymes de 20 a 200 empleados en LATAM',
  valueProposition: 'Liquidacion de sueldos sin errores en minutos, no en dias.',
};

test('pipeline completo produce las 6 secciones de arquitectura no vacias', () => {
  const doc = runPipeline(COMPLETE_IDEA);

  // Cada una de las 6 secciones existe y tiene contenido real.
  for (const key of ARCHITECTURE_SECTION_KEYS) {
    const value: string = doc[key];
    assert.equal(typeof value, 'string', `la seccion ${key} debe ser string`);
    assert.ok(value.trim().length > 0, `la seccion ${key} no puede quedar vacia`);
    // El bug original filtraba estos marcadores hacia el documento final.
    assert.ok(!value.includes('undefined'), `la seccion ${key} contiene "undefined"`);
    assert.ok(!value.includes('No provista'), `la seccion ${key} contiene "No provista"`);
  }

  // El validador centralizado tambien confirma que no hay secciones vacias.
  assert.deepEqual(findEmptyArchitectureSections(doc), []);
});

test('el contexto real de la idea se propaga hasta la arquitectura', () => {
  const doc = runPipeline(COMPLETE_IDEA);
  assert.ok(
    doc.overview.includes(COMPLETE_IDEA.name),
    'el overview debe incluir el nombre real de la idea',
  );
  assert.ok(
    doc.components.includes(COMPLETE_IDEA.user),
    'los componentes deben referenciar al usuario real',
  );
});

test('una idea sin contexto falla fuerte en vez de emitir un documento basura', () => {
  const brokenIdea = { name: '', problem: '', user: '' } as Idea;
  assert.throws(() => runPipeline(brokenIdea), PipelineContextError);
});
