import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import EcoQuizSection from './EcoQuizSection';
import { QUIZ_QUESTIONS, QUIZ_STAGES } from './ecoQuizData';

let container;
let root;
const user = { id: 'quiz-test-user' };
const render = async () => {
  root = createRoot(container);
  await act(async () => { root.render(<MemoryRouter><EcoQuizSection sessionUser={user} /></MemoryRouter>); });
};
const click = async (element) => { await act(async () => { element.click(); }); };

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Element.prototype.scrollIntoView = vi.fn();
  localStorage.removeItem('arboris-eco-quiz:v1:quiz-test-user');
  container = document.createElement('div'); document.body.appendChild(container);
});
afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  root = null; container.remove(); vi.unstubAllGlobals();
});

it('has 50 unique complete questions in five thematic stages', () => {
  expect(QUIZ_STAGES).toHaveLength(5);
  expect(QUIZ_QUESTIONS).toHaveLength(50);
  expect(new Set(QUIZ_QUESTIONS.map((item) => item.id)).size).toBe(50);
  expect(new Set(QUIZ_QUESTIONS.map((item) => item.question)).size).toBe(50);
  QUIZ_STAGES.forEach((_, stage) => expect(QUIZ_QUESTIONS.filter((item) => item.stage === stage)).toHaveLength(10));
  QUIZ_QUESTIONS.forEach((item) => {
    expect(item.options).toHaveLength(4);
    expect(item.correct).toBeGreaterThanOrEqual(0);
    expect(item.correct).toBeLessThan(4);
    expect(item.explanation.length).toBeGreaterThan(20);
  });
});

it('saves progress, scores each answer once, completes all stages and reviews answers', async () => {
  await render();
  await click([...container.querySelectorAll('button')].find((item) => item.textContent.includes('Iniciar desafio')));
  expect(container.textContent).toContain(QUIZ_QUESTIONS[0].question);
  await click(container.querySelectorAll('.eco-options button')[QUIZ_QUESTIONS[0].correct]);
  await click(container.querySelector('.eco-question__actions button'));
  expect(container.textContent).toContain('20 pontos');
  expect(container.querySelector('.eco-question__actions button').textContent).toContain('Próxima pergunta');
  expect(container.querySelector('.eco-options button').disabled).toBe(true);
  await act(async () => { root.unmount(); }); root = null;
  await render();
  expect(container.textContent).toContain('Continuar desafio');
  await click([...container.querySelectorAll('button')].find((item) => item.textContent.includes('Continuar desafio')));
  expect(container.textContent).toContain('20 pontos');
  for (let index = 0; index < 50; index += 1) {
    if (index > 0) {
      expect(container.textContent).toContain(QUIZ_QUESTIONS[index].question);
      await click(container.querySelectorAll('.eco-options button')[QUIZ_QUESTIONS[index].correct]);
      await click(container.querySelector('.eco-question__actions button'));
    }
    await click(container.querySelector('.eco-question__actions button'));
    if (index < 49 && (index + 1) % 10 === 0) {
      expect(container.textContent).toContain('ETAPA CONCLUÍDA');
      await click(container.querySelector('.eco-stage-complete button'));
    }
  }
  expect(container.textContent).toContain('1.000 pontos');
  expect(container.textContent).toContain('50 acertos');
  expect(container.textContent).toContain('Mestre ambiental');
  expect(container.textContent).toContain('Desafio completo');
  expect(container.querySelector('.eco-progress').getAttribute('aria-valuenow')).toBe('50');
  await click([...container.querySelectorAll('.eco-result__actions button')].find((item) => item.textContent.includes('Revisar respostas')));
  expect(container.querySelectorAll('.eco-review article')).toHaveLength(50);
}, 15000);
