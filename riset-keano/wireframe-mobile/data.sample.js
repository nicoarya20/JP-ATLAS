// Sample data (window.D), translated to English from Nico's Penpot wireframe so mobile and desktop compare 1:1.
// Fictional people and projects only. "Today" is Wednesday, Oct 7, 2026. Screens read from here instead of inventing values.
(() => {
  const today = { date: 'Wednesday, Oct 7, 2026', short: 'Wed, Oct 7', long: 'Wednesday, October 7, 2026', greeting: 'Good morning' };

  // ---------- People ----------
  const people = {
    nico: { name: 'Nico', full: 'Nico Pratama', title: 'Project Manager', division: 'Product', email: 'nico@kantor.id', phone: '0812-3456-7890', role: 'Project Manager' },
    rina: { name: 'Rina', full: 'Rina Wulandari', title: 'UI Designer', division: 'Product', email: 'rina@kantor.id', phone: '0813-2211-4455', role: 'Member' },
    dodi: { name: 'Dodi', full: 'Dodi Hartono', title: 'Backend Developer', division: 'Engineering', email: 'dodi@kantor.id', phone: '0815-7788-1122', role: 'Member' },
    sri: { name: 'Sri', full: 'Sri Rahayu', title: 'QA Analyst', division: 'Product', email: 'sri@email.com', phone: '0817-5566-3344', role: 'Member' },
    ayu: { name: 'Ayu', full: 'Ayu Lestari', title: 'Operations Lead', division: 'Operations', email: 'ayu@email.com', phone: '0811-9900-2233', role: 'Admin' },
    lea: { name: 'Lea', full: 'Lea Santoso', title: 'Account Manager', division: 'Sales', email: 'lea@kantor.id', phone: '0819-4433-6677', role: 'Project Manager' },
  };
  /** Who is signed in for each prototype role. */
  const ME = { member: 'dodi', pm: 'nico', admin: 'ayu' };

  // ---------- Projects (Projects ①, ⑧) ----------
  const projects = [
    { id: 'atlas', name: 'Atlas Project', lead: 'Nico', status: 'Active', health: '! Needs attention', why: '1 important task overdue', progress: 70, due: 'Oct 31', dueLong: 'Oct 31, 2026', extended: 'Extended ×1', members: ['Nico', 'Rina', 'Dodi', 'Sri'] },
    { id: 'sinar', name: 'PT Sinar Client Portal', lead: 'Rina', status: 'Active', health: '! Needs attention', why: '2 critical bugs overdue', progress: 35, due: 'Oct 20', members: ['Rina', 'Nico', 'Lea'] },
    { id: 'migration', name: 'Legacy Data Migration', lead: 'Dodi', status: 'Active', health: 'Overdue', why: 'deadline passed 7 days ago', progress: 80, due: 'Sep 30', members: ['Dodi', 'Sri'] },
    { id: 'tools', name: 'Internal Tools', lead: 'Nico', status: 'On hold', health: '✓ On track', why: 'on schedule', progress: 50, due: 'Dec 15', members: ['Nico', 'Dodi'] },
    { id: 'attendance', name: 'Attendance App', lead: 'Nico', status: 'Draft', health: 'No tasks yet', why: '', progress: 0, due: 'Dec 7', members: ['Nico'] },
    { id: 'website', name: 'Company Profile Website', lead: 'Rina', status: 'Done', health: '✓ Done', why: '', progress: 100, due: 'Sep 1', members: ['Rina', 'Lea'] },
  ];
  /** Atlas detail (Projects ⑧–⑪). */
  const atlas = {
    started: 'Sep 1', timeElapsed: 60, daysLeft: 24, phaseNow: 'Development', phasePct: 60,
    nextMilestone: { name: 'Beta release', date: 'Oct 20, 2026', inDays: 13 },
    phases: [
      { name: 'Planning', range: 'Sep 1–24', state: 'Done', milestone: 'Design approved', mState: 'Reached Sep 24' },
      { name: 'Development', range: 'Sep 25–Oct 20', state: 'In progress', milestone: 'Beta release', mState: 'Oct 20 · Waiting' },
      { name: 'Testing', range: 'Oct 21–27', state: 'Not started', milestone: '', mState: '' },
      { name: 'Release', range: 'Oct 28–31', state: 'Not started', milestone: '', mState: '' },
    ],
    activity: [
      ['Nico extended the deadline Oct 15 → Oct 31', 'Oct 1'],
      ['Nico started the Development phase', 'Sep 28'],
      ['Sri was added as Observer', 'Sep 25'],
      ['Milestone "Design approved" reached', 'Sep 24'],
    ],
    deadlineHistory: { original: 'Oct 15, 2026', change: 'Oct 15 → Oct 31', reason: 'Scope grew', note: '"Add SSO login"', by: 'by Nico · Oct 1, 2026' },
    extend: { current: 'Oct 31, 2026', next: 'Nov 14, 2026', reason: 'Client asked to add an attendance report', impact: '3 tasks and 1 milestone go past the old deadline.' },
  };
  /** Story → AI draft (Projects ⑤–⑥) and templates (⑦). */
  const story = {
    text: 'We want to build an employee attendance app on phones, using a selfie photo and location. Target 2 months, Dodi and Rina help.',
    summary: 'Employee attendance app on phones with selfie photo and location', dates: 'Oct 7 – Dec 7, 2026 (2 months)',
    phases: [
      ['1. Planning · Oct 7–16', 'Design approved', ['Collect attendance requirements', 'Design the screens']],
      ['2. Development · Oct 17–Nov 20', 'Selfie & location features ready', ['Build the selfie photo feature', 'Build the location check', 'Build the attendance report']],
      ['3. Testing · Nov 21–30', 'Trial finished', ['Trial with 10 employees', 'Fix issues from the trial']],
      ['4. Release · Dec 1–7', 'Used by all employees', ['Install the app on employee phones']],
    ],
  };
  const templates = [
    { name: 'Internal app', meta: '60 days · 4 phases · 8 tasks · 3 task types', from: 'From the story "Attendance App"' },
    { name: 'Company website', meta: '45 days · 3 phases · 10 tasks · 3 task types', from: 'From the project "Company Profile Website"' },
    { name: 'Data migration', meta: '30 days · 3 phases · 8 tasks · 3 task types', from: 'From the project "Legacy Data Migration"' },
  ];

  // ---------- Tasks (Tasks ①–⑫) ----------
  const tasks = [
    { no: 12, title: 'Fix SSO login', project: 'Atlas Project', type: 'Bug', priority: 'High', status: 'In progress', who: 'Nico', due: 'Oct 5', when: '2 days overdue', next: 'Request review', tags: ['sso', 'login'] },
    { no: 17, title: 'Fix the save button on the profile page', project: 'Atlas Project', type: 'Bug', priority: 'Medium', status: 'In review', who: 'Dodi', due: 'Oct 8', when: 'Awaiting my review', next: 'Review', tags: ['profile'] },
    { no: 14, title: 'Write the API spec', project: 'Atlas Project', type: 'Task', priority: 'Medium', status: 'To do', who: 'Nico', due: 'Oct 7', when: 'Today', next: 'Start', tags: ['api'] },
    { no: 15, title: 'Review the onboarding page design', project: 'Atlas Project', type: 'Task', priority: 'Medium', status: 'To do', who: 'Rina', due: 'Oct 9', when: 'This week', next: 'Start', tags: ['design'] },
    { no: 16, title: 'Prepare test data', project: 'Atlas Project', type: 'Task', priority: 'Medium', status: 'To do', who: 'Dodi', due: 'Oct 16', when: 'Blocked by #12', next: 'View', tags: ['testing'] },
    { no: 8, title: 'Draft the architecture design', project: 'Atlas Project', type: 'Task', priority: 'High', status: 'Done', who: 'Nico', due: 'Sep 20', when: 'Done Sep 20', next: 'Reopen', tags: [] },
    { no: 9, title: 'Progress report for PT Sinar', project: 'PT Sinar Client Portal', type: 'Task', priority: 'Medium', status: 'To do', who: 'Nico', due: 'Oct 8', when: 'Tomorrow', next: 'Start', tags: [] },
  ];
  /** Task detail extras (Tasks ⑧–⑩). */
  const taskDetail = {
    14: { phase: 'Development', desc: 'Write the login and profile endpoint spec for the mobile team.', by: 'Nico · Oct 5', steps: [], history: [['Nico created this task', 'Oct 5']] },
    12: { phase: 'Development', desc: 'SSO login fails on staging after the redirect.', by: 'Rina · Oct 3', reviewer: 'Admin',
      steps: [['Check the SSO config on staging', true], ['Fix the redirect after login', true], ['Retest in Safari and Chrome', false]],
      proof: [['login-screenshot.png', '"Redirect is correct in Chrome" · Nico · Oct 6']], blocks: '#16 Prepare test data · Dodi · To do',
      history: [['Rina created this task', 'Oct 3'], ['Nico started working', 'Oct 4'], ['Dodi: "the error still shows on staging"', 'Oct 6'], ['Nico attached proof login-screenshot.png', 'Oct 6']] },
    17: { phase: 'Development', desc: "The save button can't be tapped on phones.", by: 'Nico · Oct 5', reviewer: 'Nico (creator, Manager)', asked: 'Dodi asked you to review this task · Oct 7',
      steps: [['Reproduce on Android', true], ['Fix the button hit area', true]],
      proof: [['before.png', "The button can't be tapped on phones"], ['after.png', 'The save button now works on phone and desktop']],
      history: [['Dodi started working', 'Oct 6'], ['Dodi requested review · reviewer: Nico', 'Oct 7']] },
  };
  /** "Just write it ✦" input and AI draft (Tasks ⑤). */
  const quickWrite = {
    text: 'Rina fix the login page tomorrow, important. Dodi prepare test data before Friday.',
    drafts: [
      { title: 'Fix the login page', who: 'Rina', due: 'Oct 8 (tomorrow)', priority: 'High', type: 'Bug' },
      { title: 'Prepare test data', who: 'Dodi', due: 'Oct 9 (Friday)', priority: 'Medium', type: 'Task' },
    ],
    ask: ['Rina Wulandari', 'Rina Pratiwi'],
  };
  /** CSV import preview (Tasks ⑦). */
  const csv = {
    file: 'atlas-tasks.csv · 5 rows', summary: '4 ready (1 with a note) · 1 error',
    rows: [
      ['Create the FAQ page', 'rina@kantor.id', 'Oct 15', '✓ Ready', ''],
      ['Test login on Android', 'dodi@kantor.id', 'Oct 12', '✕ Error', "Type 'QC' doesn't exist in this project"],
      ['Fix the menu icon', 'budi@kantor.id', 'Oct 10', 'Note', 'budi@kantor.id is not an Atlas member, imported without an assignee'],
      ['Write the user guide', 'nico@kantor.id', 'Oct 20', '✓ Ready', ''],
      ['Tidy up button labels', '—', '—', '✓ Ready', ''],
    ],
  };

  // ---------- Events (Events ①–⑪) ----------
  const events = [
    { id: 'kickoff', title: 'Atlas kickoff', group: 'Earlier · Thu, Oct 1', day: 'Thu 1', time: '10:00', range: '10:00–11:00 AM', place: 'Meeting Room 1', mode: 'In person', type: 'Meeting', status: 'Done', creator: 'Nico', attendees: ['Nico', 'Rina', 'Dodi', 'Sri'], noteTaker: 'Dodi' },
    { id: 'review', title: 'Onboarding design review', group: 'Today · Wed, Oct 7', day: 'Today', time: '2:00', range: '2:00–3:00 PM', place: 'Meeting Room 2', mode: 'In person', type: 'Review', status: 'Upcoming', creator: 'Rina', attendees: ['Rina', 'Nico', 'Dodi'], noteTaker: 'Dodi',
      agenda: ['New onboarding flow', 'Feedback from the trial users', 'Trial schedule'] },
    { id: 'daily', title: 'Atlas daily stand-up', group: 'Today · Wed, Oct 7', day: 'Today', time: '9:00', range: '9:00–9:15 AM', place: 'Online', mode: 'Online', type: 'Meeting', status: 'Done', creator: 'Nico', attendees: ['Nico', 'Rina', 'Dodi'] },
    { id: 'sinar', title: 'Progress presentation to PT Sinar', group: 'Tomorrow · Thu, Oct 8', day: 'Thu 8', time: '10:00', range: '10:00–11:00 AM', place: 'Online', mode: 'Online', type: 'Important', status: 'Upcoming', creator: 'Nico', attendees: ['Nico', 'Rina'] },
    { id: 'sprint', title: 'Atlas sprint review', group: 'This week', day: 'Fri 9', time: '1:00', range: '1:00–2:00 PM', place: 'Meeting Room 1', mode: 'In person', type: 'Review', status: 'Upcoming', repeat: 'every 2 weeks', creator: 'Nico', attendees: ['Nico', 'Rina', 'Dodi', 'Sri'] },
    { id: 'rehearsal', title: 'Presentation rehearsal', group: 'Later', day: 'Tue 13', time: '3:00', range: '3:00–4:00 PM', place: 'Meeting Room 3', mode: 'In person', type: 'Meeting', status: 'Upcoming', creator: 'Nico', attendees: ['Nico', 'Rina'] },
    { id: 'party', title: 'Office anniversary party', group: 'Later', day: 'Thu 15', time: '4:00', range: '4:00–5:00 PM', place: 'Pantry, 3rd floor', mode: 'In person', type: 'Team event', status: 'Upcoming', creator: 'Ayu', attendees: ['Ayu', 'Nico', 'Rina', 'Dodi', 'Sri'] },
  ];
  /** Confirmed outcomes of "Atlas kickoff" (Events ⑦). */
  const kickoff = {
    title: 'Atlas kickoff', when: 'Thu, Oct 1, 2026 · 10:00–11:00 AM · Meeting Room 1', confirmed: 'Confirmed by Nico · Oct 1, 2026, 11:40 AM',
    tasks: [['#8 Draft the architecture design', 'Done'], ['#12 Fix SSO login', 'In progress'], ['#14 Write the API spec', 'To do']],
    decisions: ['Login uses the office SSO, not separate accounts', 'Trial with 5 older users before release'],
    info: ['Server budget approved through December'],
    question: { text: 'Who contacts PT Sinar about the demo schedule?', meta: 'For Nico · unanswered · carried to the next meeting agenda' },
    source: 'Source: whiteboard photo (1) · Written by Dodi · reviewed by Nico',
  };
  /** Stand-up recording → transcript → tasks (Events ⑤a–⑥). */
  const standup = {
    length: '14 min 52 sec', saved: 'Saved Oct 7, 9:16 AM',
    transcript: ['Agenda: SSO progress, test data, staging release.', 'Nico: SSO login still errors on staging. Rina will fix the login page before Friday.',
      'Dodi prepares test data once SSO is fixed.', 'Agreed: staging release moves to Monday, October 12.', 'Info: staging server maintenance Thursday night.',
      'Rina asked: does the client need a demo before release? Nico will answer.'],
    by: 'Written by Dodi (note-taker) · last edited 9:20 AM',
    tasks: [{ title: 'Fix the login page before Friday', meta: 'For Rina · Due Fri, Oct 9 · Atlas Project' }, { title: 'Prepare test data once SSO is fixed', meta: 'For Dodi · No due date yet · Atlas Project' }],
  };

  // ---------- Team, Trash, Users (Inbox lives in data.sample.inbox.js) ----------
  const team = {
    summary: 'Projects you manage · 3 people · 10 active tasks · 3 overdue',
    list: [
      { key: 'nico', role: 'Manager · Atlas Project (Lead)', status: 'Available', active: 4, overdue: '1 overdue' },
      { key: 'rina', role: 'Member · Atlas Project', status: 'Available', active: 3, overdue: '1 overdue', extra: 'Also on other projects' },
      { key: 'dodi', role: 'Member · Atlas Project', status: 'Leave planned Oct 12–14', active: 3, overdue: '1 overdue' },
    ],
    /** Rina's active tasks as seen from Team ② (pill = status). */
    rinaTasks: [['#11 Revise the profile icon', 'Atlas Project · 2 days overdue', 'Overdue'], ['#18 Review the onboarding design', 'Atlas Project · Due today', 'In progress'], ['#15 Review the onboarding page design', 'Atlas Project · Oct 9', 'To do']],
  };
  /** Trash items; left = days until gone, includes = what a deleted project takes with it. */
  const trash = [
    { kind: 'EVENT', title: 'Test meeting', where: 'No project', by: 'Nico', date: 'Oct 6', left: 29 },
    { kind: 'TASK', title: '#21 Duplicate login test', where: 'Atlas Project', by: 'Dodi', date: 'Oct 5', left: 28 },
    { kind: 'PROJECT', title: 'Senior app trial', where: 'Project', by: 'Nico', date: 'Oct 3', left: 26, includes: '8 tasks and 2 events' },
    { kind: 'TASK', title: '#19 Revise the button color', where: 'Atlas Project', by: 'Rina', date: 'Oct 1', left: 24 },
    { kind: 'PROJECT', title: 'Old Client Portal', where: 'Project', by: 'Lea', date: 'Sep 28', left: 21, includes: '5 tasks and 1 event' },
  ];
  const users = {
    pending: [
      { full: 'Sari Wulandari', email: 'sari@email.com', day: 'Oct 7', time: '2:02 PM', job: 'Finance Staff', division: 'Finance', phone: '0812 xxxx xxxx' },
      { full: 'Budi Santoso', email: 'budi@kantor.id', day: 'Today', time: '8:15 AM' },
    ],
    counts: { pending: 2, approved: 6, rejected: 1, disabled: 0 },
    approved: ['ayu', 'nico', 'lea', 'rina', 'dodi', 'sri'],
  };

  // ---------- Home (Daily Briefing, My Focus, Ask Data, Agenda & Projects) ----------
  const home = {
    briefing: ['1 thing is overdue: the down payment for the tile installer is 2 days late.', 'Today you have 2 tasks and 1 meeting. Family Celebration needs attention because catering isn\'t ordered yet.'],
    briefingMeta: '✦ Built automatically from project data · updated 7:30 AM',
    stats: { assigned: 3, inProgress: 8, completed: 12 },
    focus: {
      overdue: [{ title: 'Pay the tile installer down payment', meta: 'Kitchen Renovation · 2 days overdue' }],
      today: [{ title: 'Order catering for 80 people', meta: 'Family Celebration · most important today' }, { title: 'Confirm the tent with Mr. Budi', meta: 'Family Celebration' }],
      week: [{ title: 'Buy wall paint', meta: 'Kitchen Renovation · Saturday' }, { title: 'Send invitations to relatives', meta: 'Family Celebration · Friday' }],
      review: { title: 'Review: Fix the save button on the profile page', meta: 'Awaiting my review · Atlas Project · Dodi' },
      all: 'See all tasks (9) · 1 awaiting review',
    },
    ask: { questions: ['Which project is behind?', 'Which task has waited the longest?', 'Who has the most tasks?'],
      answer: 'Family Celebration is furthest behind: only 4 of 10 tasks done, with the event 16 days away.' },
    agenda: { time: '10:00', title: 'Celebration committee meeting', warn: 'Not ready: catering not ordered yet' },
    projects: [
      { name: 'Family Celebration', pct: 40, state: 'Needs attention', meta: '4 of 10 tasks done · event Oct 24' },
      { name: 'Kitchen Renovation', pct: 70, state: '✓ On track', meta: '7 of 10 tasks done' },
      { name: 'Neighborhood Savings Club', pct: 90, state: '✓ On track', meta: '9 of 10 tasks done' },
    ],
    doneThisWeek: [['Tile price survey', 'You · today'], ['Find a tent location', 'Dodi · Wednesday'], ['Call the neighborhood head about the permit', 'You · Tuesday'], ['Print the guest list', 'Rina · Tuesday']],
    activity: [['You completed "Tile price survey"', 'Kitchen Renovation · 1 hour ago'], ['Rina added a note to "Order catering"', 'Family Celebration · 3 hours ago'], ['Dodi completed "Find a tent location"', 'Family Celebration · yesterday']],
  };

  const D = {
    today, people, ME, projects, atlas, story, templates, tasks, taskDetail, quickWrite, csv, events, kickoff, standup, team, trash, users, home,
    /** Signed-in person for the active role. */
    me: () => ({ key: ME[App.role], ...people[ME[App.role]] }),
    /** Person by key or first name. */
    person: k => people[k] || Object.values(people).find(p => p.name === k),
    project: id => projects.find(p => p.id === id),
    task: no => tasks.find(t => t.no === no),
    event: id => events.find(e => e.id === id),
  };
  window.D = D;
})();
