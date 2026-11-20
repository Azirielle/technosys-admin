// Help for each admin page (the "?" button beside the page title), for a new HR or Coordinator.
// Keyed by the page's address after the role: /hr/tickets → 'tickets', /hr → 'overview'. A page without an entry shows no "?".
export type Help = { title: string; steps: string[] }

export const HELP: Record<string, Help> = {
  overview: {
    title: 'Overview',
    steps: [
      'This is today at a glance: attendance, requests waiting for you, jobs and tools.',
      'Click a card or a list row to open that page.',
      'It updates when you open it; refresh the browser to see the newest numbers.',
    ],
  },
  jobs: {
    title: 'Scheduling',
    steps: [
      'Day shows each person as a column; Week shows the whole week. Pick a day in the calendar on the right.',
      'New job: fill in Where (client, address, pin), When, Who, then Check & save. The crew gets a push.',
      'Click an empty slot in a person\'s column to start a job for them at that time.',
      'VIP squeeze-in: for an urgent client today. It may take people already booked; their other job shows in "Needs you" so you can call that client.',
      'Click a job to see its crew and history, change it (say why) or cancel it.',
    ],
  },
  today: {
    title: 'Today',
    steps: [
      'Who is in, who is late and who is missing on today\'s jobs. It updates by itself.',
      'Call someone who is missing straight from their row.',
      'Anything that needs your decision is listed at the top.',
    ],
  },
  tracking: {
    title: 'Live map',
    steps: [
      'Everyone timed in shows on the map; their phone sends its position every minute.',
      'Click a person to see their status, last GPS time and a Call button.',
      'Someone off duty shows their last known position and how old it is.',
    ],
  },
  inventory: {
    title: 'Inventory',
    steps: [
      'Tools tab: every tool in the warehouse. Add a tool, or Lend one to a technician.',
      'Borrowed tab: who has what. Check a tool in when it comes back, and say if it is damaged or lost.',
      'A technician can report a problem with a tool from the phone; it shows here and in Tickets.',
    ],
  },
  tickets: {
    title: 'Tickets',
    steps: [
      'Concerns from technicians. Techy (the AI) answers first; you make every decision.',
      'Needs HR: tickets waiting for you. Click one to read the conversation and reply.',
      'Tick "HR-only note" to write something the employee won\'t see.',
      'Mark resolved or Close when done. Press Tab in the note box to use the suggested note.',
    ],
  },
  leaves: {
    title: 'Leave requests',
    steps: [
      'Leaves filed from the phone land here.',
      'Approve or decline (say why). The employee sees your decision in the app.',
      'Approved leave shows on Scheduling, so nobody books that person.',
    ],
  },
  audit: {
    title: 'DTR and attendance',
    steps: [
      'Days worked, lates, overtime, absences and leave per cut-off.',
      'Open someone\'s DTR to see each day and correct a punch (say why).',
    ],
  },
  files: {
    title: '201 files',
    steps: [
      'Each technician\'s and helper\'s documents, warnings and phone sign-in.',
      'Mark a document once HR has the copy.',
      'Reset a PIN here when someone forgets it.',
    ],
  },
  phones: {
    title: 'Work phones',
    steps: [
      'Each technician and helper signs in on one registered phone, so nobody can time in for someone else.',
      'When someone changes phones, remove the old one here so they can register the new one.',
    ],
  },
  announcements: {
    title: 'Announcements',
    steps: [
      'Write news for field and office staff, then publish it.',
      'Published announcements show in the phone app under Updates (the bell on Home).',
      'Mark it Important when everyone must read it.',
    ],
  },
  policies: {
    title: 'Policies',
    steps: [
      'Write a policy, get it approved, then publish it.',
      'Published policies are what Techy uses to answer questions.',
      'See who has signed each policy.',
    ],
  },
  access: {
    title: 'Temporary access',
    steps: [
      'When someone is away, let HR or Service Dept use the other department\'s pages for a while.',
      'Pick the person, the pages and until when. Access ends by itself.',
    ],
  },
  activities: {
    title: 'Activity history',
    steps: [
      'Everything office staff did in the admin, newest first: who, what and when.',
      'Use it to check who changed a job, approved a leave or closed a ticket.',
    ],
  },
}
