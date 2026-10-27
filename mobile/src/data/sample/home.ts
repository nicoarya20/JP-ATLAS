// Home cards that the prototype fills from its own sample block (D.home), ported 1:1, other projects included.

export const BRIEFING = {
  lines: [
    '1 thing is overdue: the down payment for the tile installer is 2 days late.',
    "Today you have 2 tasks and 1 meeting. Family Celebration needs attention because catering isn't ordered yet.",
  ],
  meta: '✦ Built automatically from project data · updated 7:30 AM',
};

export const ASK = {
  questions: [
    'Which project is behind?',
    'Which task has waited the longest?',
    'Who has the most tasks?',
  ],
  answer:
    'Family Celebration is furthest behind: only 4 of 10 tasks done, with the event 16 days away.',
  projects: [
    { name: 'Family Celebration', pct: 40 },
    { name: 'Kitchen Renovation', pct: 70 },
    { name: 'Neighborhood Savings Club', pct: 90 },
  ],
};

export const DONE_THIS_WEEK = [
  { title: 'Tile price survey', who: 'You · today' },
  { title: 'Find a tent location', who: 'Dodi · Wednesday' },
  { title: 'Call the neighborhood head about the permit', who: 'You · Tuesday' },
  { title: 'Print the guest list', who: 'Rina · Tuesday' },
];

export const ACTIVITY = [
  { title: 'You completed "Tile price survey"', meta: 'Kitchen Renovation · 1 hour ago' },
  { title: 'Rina added a note to "Order catering"', meta: 'Family Celebration · 3 hours ago' },
  { title: 'Dodi completed "Find a tent location"', meta: 'Family Celebration · yesterday' },
];
