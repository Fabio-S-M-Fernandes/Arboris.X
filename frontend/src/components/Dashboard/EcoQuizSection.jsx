import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, Leaf, RotateCcw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { QUIZ_QUESTIONS, QUIZ_STAGES } from './ecoQuizData';
import './EcoQuizSection.css';

const TOTAL = QUIZ_QUESTIONS.length;
const LETTERS = ['A', 'B', 'C', 'D'];
const storageKey = (id) => `arboris-eco-quiz:v1:${id}`;
const emptyRun = () => ({ phase: 'intro', index: 0, answers: [] });
const validRun = (value) => {
  if (!value || !Array.isArray(value.answers) || value.answers.length > TOTAL
    || value.answers.some((answer) => !Number.isInteger(answer) || answer < 0 || answer > 3)
    || !Number.isInteger(value.index) || value.index < 0 || value.index > TOTAL) return false;
  return (value.phase === 'question' && value.index === value.answers.length && value.index < TOTAL)
    || (value.phase === 'revealed' && value.index === value.answers.length - 1)
    || (value.phase === 'stage' && value.index === value.answers.length && value.index < TOTAL && value.index > 0 && value.index % 10 === 0)
    || (value.phase === 'partial-result' && value.index === value.answers.length && value.answers.length > 0 && value.answers.length < TOTAL)
    || (value.phase === 'result' && value.index === TOTAL && value.answers.length === TOTAL);
};
const loadRun = (key) => {
  try { const value = JSON.parse(localStorage.getItem(key)); return validRun(value) ? value : null; }
  catch { return null; }
};
const achievementsFor = (answers) => {
  const correct = answers.filter((choice, index) => choice === QUIZ_QUESTIONS[index].correct).length;
  const badges = [];
  if (correct >= 1) badges.push('Primeira descoberta');
  if (answers.length >= 10) badges.push('Explorador ambiental');
  if (QUIZ_STAGES.some((_, stage) => answers.length >= (stage + 1) * 10
    && answers.slice(stage * 10, stage * 10 + 10).every((choice, offset) => choice === QUIZ_QUESTIONS[stage * 10 + offset].correct))) badges.push('Conhecimento em crescimento');
  if (correct >= 25) badges.push('Guardião do conhecimento');
  if (answers.length === TOTAL) badges.push('Desafio completo');
  if (correct === TOTAL) badges.push('Mestre ambiental');
  return badges;
};
const rankFor = (correct) => correct === 50 ? 'Mestre ambiental' : correct >= 40 ? 'Guardião da natureza'
  : correct >= 30 ? 'Defensor ambiental' : correct >= 20 ? 'Aprendiz da natureza' : 'Explorador ambiental';

function ProgressTree({ progress }) {
  return <div className="eco-tree" aria-hidden="true" style={{ '--tree-growth': `${progress * 100}%` }}><span className="eco-tree__trunk" /><span className="eco-tree__branch eco-tree__branch--one" data-grown={progress >= .2} /><span className="eco-tree__branch eco-tree__branch--two" data-grown={progress >= .4} /><span className="eco-tree__branch eco-tree__branch--three" data-grown={progress >= .6} /><span className="eco-tree__branch eco-tree__branch--four" data-grown={progress >= .8} />{[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((level) => <i key={level} data-grown={progress * 100 >= level} />)}</div>;
}

function QuizQuestion({ question, index, selected, onSelect, onConfirm, onNext, answer }) {
  const revealed = answer !== undefined;
  const correct = answer === question.correct;
  return <article className="eco-question" key={question.id}>
    <header><span className="eco-eyebrow">PERGUNTA {String(index + 1).padStart(2, '0')} / {TOTAL}</span><span className="eco-question__difficulty">Dificuldade {question.difficulty}/5</span></header>
    <h2>{question.question}</h2>
    <div className="eco-options" role="group" aria-label="Alternativas da pergunta">{question.options.map((option, choice) => {
      const state = revealed ? choice === question.correct ? 'correct' : choice === answer ? 'incorrect' : '' : selected === choice ? 'selected' : '';
      return <button key={LETTERS[choice]} type="button" disabled={revealed} aria-pressed={!revealed && selected === choice} data-state={state} onClick={() => onSelect(choice)}><span className="eco-options__letter">{LETTERS[choice]}</span><span>{option}</span>{revealed && choice === question.correct && <Check size={18} aria-hidden="true" />}{revealed && choice === answer && !correct && <X size={18} aria-hidden="true" />}</button>;
    })}</div>
    {revealed ? <div className="eco-explanation" data-result={correct ? 'correct' : 'incorrect'} role="status"><strong>{correct ? 'Você acertou.' : 'Esta não era a resposta correta.'}</strong><p>Resposta correta: {LETTERS[question.correct]}. {question.options[question.correct]}</p><p>{question.explanation}</p></div> : null}
    <div className="eco-question__actions">{revealed ? <button type="button" onClick={onNext}>{index === TOTAL - 1 ? 'Ver resultado' : (index + 1) % 10 === 0 ? 'Concluir etapa' : 'Próxima pergunta'} <ArrowRight size={18} aria-hidden="true" /></button> : <button type="button" onClick={onConfirm} disabled={selected === null}>Confirmar resposta <Check size={18} aria-hidden="true" /></button>}</div>
  </article>;
}

function PartialQuizResult({ answers, correct, onContinue, onRestart }) {
  const answered = answers.length;
  const stages = QUIZ_STAGES.map((item, stageIndex) => {
    const start = stageIndex * 10;
    const stageAnswers = answers.slice(start, start + 10);
    if (!stageAnswers.length) return null;
    const hits = stageAnswers.filter((choice, offset) => choice === QUIZ_QUESTIONS[start + offset].correct).length;
    return <div key={item.id}><span>{item.title} · {stageAnswers.length} respondidas</span><strong>{hits}/{stageAnswers.length}</strong></div>;
  });
  return <section className="eco-result" aria-live="polite">
    <span className="eco-eyebrow">SEU RESULTADO ATÉ AQUI</span>
    <h2>{rankFor(correct)}</h2>
    <p>Você respondeu {answered} de {TOTAL} perguntas. Seu progresso ficou salvo e você pode continuar quando quiser.</p>
    <div className="eco-result__score"><strong>{correct * 20}</strong><span>de {answered * 20} pontos possíveis nas questões respondidas</span></div>
    <div className="eco-result__metrics"><span><strong>{correct}</strong> acertos</span><span><strong>{answered - correct}</strong> erros</span><span><strong>{Math.round(correct / answered * 100)}%</strong> de acertos</span></div>
    <div className="eco-result__stages">{stages}</div>
    <div className="eco-result__actions"><button type="button" onClick={onContinue}>Continuar respondendo <ArrowRight size={17} aria-hidden="true" /></button><button type="button" onClick={onRestart}>Jogar novamente <RotateCcw size={16} aria-hidden="true" /></button></div>
  </section>;
}

export default function EcoQuizSection({ sessionUser }) {
  const key = storageKey(sessionUser?.id || 'local');
  const [saved, setSaved] = useState(() => loadRun(key));
  const [run, setRun] = useState(emptyRun);
  const [selected, setSelected] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const rootRef = useRef(null);
  const scrollRef = useRef(null);
  const resetDialogRef = useRef(null);
  const correct = useMemo(() => run.answers.filter((choice, index) => choice === QUIZ_QUESTIONS[index].correct).length, [run.answers]);
  const badges = useMemo(() => achievementsFor(run.answers), [run.answers]);
  const stageIndex = Math.min(4, Math.floor(run.index / 10));
  const stage = QUIZ_STAGES[stageIndex];
  const answered = run.answers.length;
  useEffect(() => {
    const shell = rootRef.current?.closest('.dashboard-shell');
    const visibility = () => rootRef.current?.toggleAttribute('data-hidden', document.visibilityState === 'hidden');
    visibility(); document.addEventListener('visibilitychange', visibility);
    if (shell) shell.dataset.quizStage = String(stageIndex);
    return () => { document.removeEventListener('visibilitychange', visibility); if (shell) delete shell.dataset.quizStage; };
  }, [stageIndex]);
  useEffect(() => {
    if (run.phase === 'intro') return;
    try { localStorage.setItem(key, JSON.stringify(run)); } catch { /* Quiz still works when storage is unavailable. */ }
  }, [key, run]);
  useEffect(() => {
    if (!resetOpen) return undefined;
    resetDialogRef.current?.querySelector('button')?.focus();
    const closeOnEscape = (event) => { if (event.key === 'Escape') setResetOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [resetOpen]);
  const scrollTop = () => scrollRef.current?.scrollIntoView({ behavior: document.documentElement.dataset.motion === 'reduced' ? 'instant' : 'smooth', block: 'start' });
  const begin = () => { setRun({ phase: 'question', index: 0, answers: [] }); setSelected(null); setReviewOpen(false); scrollTop(); };
  const resume = () => { if (saved && validRun(saved)) { setRun(saved); setSelected(null); scrollTop(); } };
  const confirm = () => {
    if (run.phase !== 'question' || selected === null || selected < 0 || selected > 3 || run.answers.length !== run.index) return;
    setRun((current) => ({ ...current, phase: 'revealed', answers: [...current.answers, selected] }));
  };
  const next = () => {
    if (run.phase !== 'revealed') return;
    const newIndex = run.index + 1;
    setRun((current) => ({ ...current, index: newIndex, phase: newIndex === TOTAL ? 'result' : newIndex % 10 === 0 ? 'stage' : 'question' }));
    setSelected(null); scrollTop();
  };
  const continueStage = () => { if (run.phase === 'stage') setRun((current) => ({ ...current, phase: 'question' })); scrollTop(); };
  const finish = () => {
    if (answered === 0 || run.phase === 'result' || run.phase === 'partial-result') return;
    setRun((current) => ({ ...current, phase: current.answers.length === TOTAL ? 'result' : 'partial-result', index: current.answers.length }));
    setSelected(null);
    setReviewOpen(false);
    scrollTop();
  };
  const continueQuiz = () => {
    if (run.phase !== 'partial-result' || answered >= TOTAL) return;
    setRun((current) => ({
      ...current,
      phase: current.answers.length > 0 && current.answers.length % 10 === 0 ? 'stage' : 'question',
    }));
    scrollTop();
  };
  const reset = () => { try { localStorage.removeItem(key); } catch { /* Local storage may be disabled. */ } setSaved(null); setRun(emptyRun()); setSelected(null); setReviewOpen(false); setResetOpen(false); scrollTop(); };
  return <div className="eco-quiz" ref={rootRef} data-stage={stageIndex} data-phase={run.phase}>
    {run.phase === 'intro' ? <>
      <section className="eco-hero" aria-labelledby="eco-title"><div className="eco-hero__copy"><span className="eco-eyebrow">ARBORIS.X / EDUCAÇÃO AMBIENTAL</span><h1 id="eco-title">Arboris.X <em>Eco Quiz</em></h1><p>Explore biodiversidade, recursos naturais, resíduos, clima e ciência ambiental. Cada resposta traz uma explicação para você aprender também com a revisão.</p><div className="eco-hero__stats"><span><strong>50</strong> perguntas</span><span><strong>5</strong> etapas temáticas</span><span><strong>1.000</strong> pontos possíveis</span></div><div className="eco-hero__actions"><button type="button" onClick={begin}>Iniciar desafio <ArrowRight size={19} aria-hidden="true" /></button>{saved && <button type="button" className="eco-secondary" onClick={resume}>Continuar desafio</button>}</div></div><div className="eco-planet" aria-hidden="true"><div className="eco-planet__halo" /><div className="eco-planet__sphere"><span className="eco-planet__land eco-planet__land--one" /><span className="eco-planet__land eco-planet__land--two" /><span className="eco-planet__land eco-planet__land--three" /></div><span className="eco-planet__leaf" /></div></section>
      <div className="eco-stage-list" aria-label="Etapas do desafio">{QUIZ_STAGES.map((item, index) => <article key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><h2>{item.title}</h2><p>10 perguntas · Dificuldade {index + 1}/5</p></article>)}</div><p className="eco-intro-note">Cada acerto vale 20 pontos. Você pode jogar no seu ritmo e continuar depois neste navegador.</p>
    </> : <div className="eco-play" ref={scrollRef}>
      <header className="eco-play__header"><div><span className="eco-eyebrow">ETAPA {stageIndex + 1} / 5 · {stage.title}</span><h1>Explore, descubra, aprenda.</h1></div><button type="button" className="eco-reset-link" onClick={() => setResetOpen(true)}><RotateCcw size={16} aria-hidden="true" />Reiniciar</button></header>
      <div className="eco-progress" role="progressbar" aria-label="Progresso do desafio" aria-valuenow={answered} aria-valuemin="0" aria-valuemax={TOTAL}><span style={{ width: `${answered / TOTAL * 100}%` }} /></div>
      <div className="eco-play__stats"><span>{answered} de {TOTAL} respondidas</span><span>{correct * 20} pontos</span></div>
      {answered > 0 && run.phase !== 'result' && run.phase !== 'partial-result' && <div className="eco-finish-action"><button type="button" onClick={finish}>Parar e ver resultado <ArrowRight size={16} aria-hidden="true" /></button></div>}
      <div className="eco-play__grid"><div className="eco-play__main">
        {run.phase === 'question' || run.phase === 'revealed' ? <QuizQuestion question={QUIZ_QUESTIONS[run.index]} index={run.index} selected={selected} onSelect={setSelected} onConfirm={confirm} onNext={next} answer={run.phase === 'revealed' ? run.answers[run.index] : undefined} /> : null}
        {run.phase === 'partial-result' && <PartialQuizResult answers={run.answers} correct={correct} onContinue={continueQuiz} onRestart={() => setResetOpen(true)} />}
        {run.phase === 'stage' && <section className="eco-stage-complete"><Sparkles size={30} aria-hidden="true" /><span className="eco-eyebrow">ETAPA CONCLUÍDA</span><h2>Uma nova perspectiva se abre.</h2><p>Você respondeu {answered} perguntas e acertou {correct}. Agora começa a etapa {stageIndex + 1}: {stage.title}.</p><button type="button" onClick={continueStage}>Continuar para a próxima etapa <ArrowRight size={18} aria-hidden="true" /></button></section>}
        {run.phase === 'result' && <section className="eco-result"><span className="eco-eyebrow">DESAFIO COMPLETO</span><h2>{rankFor(correct)}</h2><p>Você concluiu as 50 perguntas. Cada resposta é uma oportunidade de observar o ambiente com mais atenção.</p><div className="eco-result__score"><strong>{correct * 20}</strong><span>de 1.000 pontos</span></div><div className="eco-result__metrics"><span><strong>{correct}</strong> acertos</span><span><strong>{TOTAL - correct}</strong> erros</span><span><strong>{correct * 2}%</strong> de acertos</span></div><div className="eco-result__stages">{QUIZ_STAGES.map((item, index) => { const hits = run.answers.slice(index * 10, index * 10 + 10).filter((choice, offset) => choice === QUIZ_QUESTIONS[index * 10 + offset].correct).length; return <div key={item.id}><span>{item.title}</span><strong>{hits}/10</strong></div>; })}</div><div className="eco-result__actions"><button type="button" onClick={() => setReviewOpen((value) => !value)} aria-expanded={reviewOpen}>{reviewOpen ? 'Fechar revisão' : 'Revisar respostas'} <ChevronRight size={17} aria-hidden="true" /></button><button type="button" onClick={() => setResetOpen(true)}>Jogar novamente <RotateCcw size={16} aria-hidden="true" /></button><Link to="/dashboard">Voltar à Visão Geral <ArrowRight size={17} aria-hidden="true" /></Link></div></section>}
        {run.phase === 'result' && reviewOpen && <section className="eco-review" aria-label="Revisão das respostas">{QUIZ_STAGES.map((item, stageNumber) => <div key={item.id}><h3>{item.title}</h3>{QUIZ_QUESTIONS.slice(stageNumber * 10, stageNumber * 10 + 10).map((question, offset) => { const choice = run.answers[stageNumber * 10 + offset]; return <article key={question.id}><strong>{stageNumber * 10 + offset + 1}. {question.question}</strong><p>{choice === question.correct ? 'Acertou' : 'Errou'} · Sua resposta: {LETTERS[choice]}. {question.options[choice]}</p><p>Correta: {LETTERS[question.correct]}. {question.options[question.correct]}</p><p>{question.explanation}</p></article>; })}</div>)}</section>}
      </div><aside className="eco-play__aside"><ProgressTree progress={answered / TOTAL} /><span className="eco-eyebrow">SUA JORNADA</span><h2>Conhecimento que cresce.</h2><p>A árvore representa seu progresso educativo ao longo das perguntas.</p><div className="eco-badges"><h3>Conquistas</h3>{badges.length ? badges.map((badge) => <span key={badge}><ShieldCheck size={16} aria-hidden="true" />{badge}</span>) : <p>Seu primeiro acerto revelará a primeira conquista.</p>}</div><small>Conquistas educativas, sem validade como certificação.</small></aside></div>
    </div>}
    {resetOpen && <div className="eco-reset-overlay" role="presentation"><div className="eco-reset-dialog" ref={resetDialogRef} role="dialog" aria-modal="true" aria-labelledby="eco-reset-title" aria-describedby="eco-reset-description" onKeyDown={(event) => { if (event.key !== 'Tab') return; const buttons = [...event.currentTarget.querySelectorAll('button')]; if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus(); } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); } }}><Leaf size={27} aria-hidden="true" /><h2 id="eco-reset-title">Recomeçar o desafio?</h2><p id="eco-reset-description">Seu progresso atual será apagado deste navegador.</p><div><button type="button" onClick={() => setResetOpen(false)}>Continuar jogando</button><button type="button" onClick={reset}>Apagar progresso e reiniciar</button></div></div></div>}
  </div>;
}
