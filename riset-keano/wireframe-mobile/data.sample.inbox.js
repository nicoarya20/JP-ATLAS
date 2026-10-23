// Inbox sample data (D.inbox), split from data.sample.js to keep that file small. Loaded right after it.
// Top level is the PM view (Nico); `member` is Dodi's own inbox. Both read as the signed-in person ("you").
(() => {
  D.inbox = {
    respond: [
      { title: 'Dodi asked you to review a task', sub: 'Fix the save button on the profile page', meta: '#17 · Atlas Project · 10 min ago', action: 'Review' },
      { title: 'Meeting outcomes need your confirmation', sub: 'Atlas daily stand-up · 2 tasks, 1 decision, 1 info, 1 question', meta: 'Atlas Project · 1 hour ago', action: 'Check outcomes' },
      { title: 'Rina mentioned you in task #12 Fix SSO login', sub: '"@Nico can we try the SSO yet?"', meta: 'Atlas Project · 2 hours ago', action: 'Reply' },
    ],
    updates: [
      { day: 'Today', title: 'Rina commented on task #14 Write the API spec', meta: 'Atlas Project · 30 min ago' },
      { day: 'Today', title: 'Rina invited you to Onboarding design review', meta: 'Wed, Oct 7 · 2:00–3:00 PM · Meeting Room 2 · 1 hour ago' },
      { day: 'Today', title: '5 changes on task #12 Fix SSO login', meta: 'Status, steps, and proof changed by Dodi · Atlas Project · 3 hours ago' },
      { day: 'Yesterday', title: 'Dodi started working on task #17 Fix the save button on the profile page', meta: 'Atlas Project · Yesterday 4:40 PM' },
      { day: 'Yesterday', title: 'Ayu created the event Office anniversary party', meta: 'Thu, Oct 15 · 4:00–5:00 PM · Pantry, 3rd floor · Yesterday 9:15 AM' },
    ],
    /** Dodi (Member): a task for him, an event invite, a mention. His stand-up notes already wait on Nico, so they aren't here. */
    member: {
      respond: [
        { title: 'Nico assigned you a task', sub: 'Prepare test data', meta: '#16 · Atlas Project · 20 min ago', action: 'View' },
        { title: 'Rina invited you to an event', sub: 'Onboarding design review · Today 2:00–3:00 PM · Meeting Room 2', meta: 'Atlas Project · 1 hour ago', action: 'View' },
        { title: 'Nico mentioned you in task #12 Fix SSO login', sub: '"@Dodi is the error still showing on staging?"', meta: 'Atlas Project · 2 hours ago', action: 'Reply' },
      ],
      updates: [
        { day: 'Today', title: 'Nico commented on task #17 Fix the save button on the profile page', meta: 'Atlas Project · 30 min ago' },
        { day: 'Today', title: 'Nico moved the Atlas staging release to Mon, Oct 12', meta: 'Atlas Project · 1 hour ago' },
        { day: 'Yesterday', title: 'Nico added you to Atlas sprint review', meta: 'Fri, Oct 9 · 1:00–2:00 PM · Meeting Room 1 · Yesterday 3:20 PM' },
        { day: 'Yesterday', title: 'Ayu created the event Office anniversary party', meta: 'Thu, Oct 15 · 4:00–5:00 PM · Pantry, 3rd floor · Yesterday 9:15 AM' },
      ],
    },
  };
})();
