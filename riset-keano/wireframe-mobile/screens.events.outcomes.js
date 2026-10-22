// Events module (Penpot "Events" ⑦a–⑦c): meeting outcomes in 3 steps — recording → text → tasks. Uses window.EVD.
// Sample: the Atlas daily stand-up (D.standup).
(() => {
  const G = 'Events';
  const { pill, sec, foot, note, two } = window.EVD;

  document.head.insertAdjacentHTML('beforeend', `<style>
    .evo-task { display: grid; gap: var(--sp-2); }
    .evo-task .acts { display: flex; gap: var(--sp-2); justify-content: flex-end; }
    .evo-warn { font-size: var(--fs-sm); font-weight: 700; }
  </style>`);

  const appbar = () => UI.appbar({ title: 'Meeting outcomes', back: true });
  /** "Step n of 3" header with a progress bar. */
  const stepHead = (n, label) => `<div class="stack xs">
    <span class="small muted">Step ${n} of 3</span><b class="h2">${label}</b>${UI.progress(Math.round(n / 3 * 100))}</div>`;
  /** Who confirms the outcomes: the stand-up's creator. */
  const confirmer = () => D.event('daily').creator;

  // ---------- ⑦a Step 1 · Recording done ----------
  App.screen('events.step1', { title: '⑦a Outcomes · Step 1 Recording', group: G, render: () => `
    ${appbar()}
    <div class="content stack">
      ${stepHead(1, 'Recording done')}
      <div class="card fill row-flex" style="align-items:flex-start">
        <button class="row-flex" aria-label="Play recording" data-toast="Playing the recording">${UI.icon(36, true)}</button>
        <span class="stack xs grow"><b class="h3">Recording · ${D.standup.length}</b>
          <p class="small muted">${D.standup.saved}. Raw audio is deleted 30 days after confirmation.</p></span>
      </div>
      ${UI.btn('Turn into text ✦', 'primary', { block: true, go: 'events.step2' })}
      ${sec('Other ways', [
        UI.btn('✎ Type it myself', 'outline', { block: true, go: 'events.step2' }),
        UI.btn('Photo of notes ✦', 'outline', { block: true, toast: 'Take a photo of the notes' }),
        UI.btn('Upload a recording', 'outline', { block: true, toast: 'Pick an audio file' }),
      ].join(''))}
      ${note('✦ = AI-assisted. You can check and edit the text in the next step.')}
    </div>` });

  // ---------- ⑦b Step 2 · Check the text ----------
  App.screen('events.step2', { title: '⑦b Outcomes · Step 2 Text', group: G, render: () => `
    ${appbar()}
    <div class="content stack">
      ${stepHead(2, 'Check the text')}
      <div class="field"><span>Minutes · editable</span>
        <span class="input area" style="min-height:300px"><span class="val stack sm">${D.standup.transcript.map(t => `<span>${t}</span>`).join('')}</span></span></div>
      <p class="small muted">${D.standup.by}</p>
    </div>
    ${foot(`${two(UI.btn('Save and exit', 'outline', { back: true, toast: 'Draft saved' }), UI.btn('Next ›', 'primary', { go: 'events.step3' }))}
      ${note('Next: AI sorts out tasks from this text')}`)}` });

  // ---------- ⑦c Step 3 · Tasks from this meeting ----------
  // Nothing is created until the button is tapped. Members only read (the note-taker / Manager confirms).
  /** Draft task from D.standup.tasks; one without a due date gets the warning. */
  const task = ({ title, meta }) => {
    const warn = meta.includes('No due date') ? '<span class="evo-warn">Fill in the due date first</span>' : '';
    const acts = App.is('member') ? ''
      : `<div class="acts">${UI.btn('Edit', 'outline', { sm: true, toast: 'Edit task' })}${UI.btn(App.is('admin') ? 'Discard' : 'Remove', 'ghost', { sm: true, toast: 'Removed from the list' })}</div>`;
    return `<div class="card evo-task">
      <span class="stack xs"><b class="h3">${title}</b>
        <span class="small muted row-flex">${UI.avatar(20, meta.match(/^For (\w+)/)[1])} ${meta}</span></span>
      ${warn}${acts}</div>`;
  };
  const tasks = () => D.standup.tasks.map(task).join('');
  const count = () => D.standup.tasks.length;
  // Matches the transcript: 1 agreement (staging release), 1 info (maintenance), 1 question (client demo).
  const summary = `<div class="card fill between small"><span>1 decision, 1 info, 1 question</span>
    ${UI.link('View ▾', { toast: 'Decisions, info and questions' })}</div>`;

  App.screen('events.step3', { title: '⑦c Outcomes · Step 3 Tasks', group: G, render: () => App.is('member') ? `
    ${appbar()}
    <div class="content stack">
      ${stepHead(3, 'Tasks from this meeting')}
      <span class="row-flex">${pill(`Waiting for ${confirmer()} to review`, true)}</span>
      <div class="card fill stack xs"><b class="small">Waiting for ${confirmer()} to confirm</b>
        <span class="small muted">You can only read these meeting outcomes.</span></div>
      ${tasks()}
      ${summary}
    </div>` : `
    ${appbar()}
    <div class="content stack">
      ${stepHead(3, 'Tasks from this meeting')}
      <p class="small">AI found ${count()} tasks. Nothing is created until you tap the button below.</p>
      ${tasks()}
      ${summary}
    </div>
    ${foot(`${UI.btn(`Create ${count()} tasks`, 'primary', { block: true, go: 'events.list', toast: `${count()} tasks created · outcomes confirmed` })}
      <p class="small muted">Tasks go into ${D.project('atlas').name} and assignees are notified.</p>`)}` });
})();
