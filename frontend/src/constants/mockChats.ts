// src/constants/mockChats.ts

export type ChatType = 'dm' | 'group';
export type FilterType = 'all' | 'groups' | 'unread' | 'favorites' | 'department' | 'section';

export type Chat = {
  id:          string;
  type:        ChatType;
  name:        string;
  avatar?:     string;
  lastMessage: string;
  lastTime:    string;
  unread:      number;
  online?:     boolean;
  muted?:      boolean;
  favorite?:   boolean;
  isDept?:     boolean;   // My Department group
  isSection?:  boolean;   // My Section group
  members?:    number;
  lastSender?: string;
};

export const MOCK_CHATS: Chat[] = [
  // ── Existing Data ──
  {
    id: 'ch1', type: 'dm',
    name: 'zara.malik', online: true, unread: 3, muted: false, favorite: true,
    lastMessage: 'Did you get the DSA notes?',
    lastTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 'ch2', type: 'group',
    name: 'CS Final Year 2025', members: 24, unread: 12, muted: false,
    isDept: true, favorite: false,
    lastMessage: 'Project submission tomorrow guys!!',
    lastSender: 'ali.raza',
    lastTime: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: 'ch3', type: 'dm',
    name: 'ahmed.k', online: true, unread: 0, muted: false, favorite: true,
    lastMessage: 'Sure, I can help with that 👍',
    lastTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'ch4', type: 'group',
    name: 'DSA Study Group', members: 8, unread: 0, muted: true,
    isSection: true, favorite: false,
    lastMessage: 'Check the pinned resources',
    lastSender: 'sara.ch',
    lastTime: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'ch5', type: 'dm',
    name: 'hina.j', online: false, unread: 1, muted: false, favorite: false,
    lastMessage: 'Congratulations on the thesis! 🎉',
    lastTime: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: 'ch6', type: 'group',
    name: 'CS Section B', members: 31, unread: 0, muted: false,
    isDept: true, isSection: true, favorite: false,
    lastMessage: 'Who has the marketing assignment?',
    lastSender: 'nadia.s',
    lastTime: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: 'ch7', type: 'dm',
    name: 'ali.raza', online: false, unread: 0, muted: false, favorite: false,
    lastMessage: 'Python session at 5pm today?',
    lastTime: new Date(Date.now() - 86400 * 1000).toISOString(),
  },
  {
    id: 'ch8', type: 'dm',
    name: 'usman.t', online: false, unread: 0, muted: false, favorite: false,
    lastMessage: 'Still selling the drawing set?',
    lastTime: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
  },
  {
    id: 'ch9', type: 'group',
    name: 'EE Lab Partners', members: 5, unread: 0, muted: false,
    isDept: false, isSection: false, favorite: false,
    lastMessage: 'Lab report submitted ✅',
    lastSender: 'ahmed.k',
    lastTime: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
  },

  // ── New Expanded Data ──
  {
    id: 'ch10', type: 'group',
    name: 'Campus Announcements', members: 1250, unread: 145, muted: true,
    isDept: false, favorite: false,
    lastMessage: 'University will remain closed on Friday due to heavy rain forecast. Stay safe everyone.',
    lastSender: 'Admin',
    lastTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
  },
  {
    id: 'ch11', type: 'dm',
    name: 'prof.assad', online: true, unread: 1, muted: false, favorite: true,
    lastMessage: 'Please come to my office after the 2nd lecture to discuss your final year project proposal.',
    lastTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
  },
  {
    id: 'ch12', type: 'dm',
    name: 'faizan.dev', online: false, unread: 0, muted: true, favorite: false,
    lastMessage: 'Bro, can you review my pull request? I think the Reanimated logic is breaking the Tab Bar on Android.',
    lastTime: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), // 4 hours ago
  },
  {
    id: 'ch13', type: 'group',
    name: 'React Native Coders', members: 12, unread: 7, muted: false,
    isDept: false, favorite: true,
    lastMessage: 'That blur effect looks insane! Did you use expo-blur for that?',
    lastSender: 'zara.malik',
    lastTime: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), // 6 hours ago
  },
  {
    id: 'ch14', type: 'dm',
    name: 'kamran.88', online: true, unread: 0, muted: false, favorite: false,
    lastMessage: 'Send me the syllabus for Midterms ASAP',
    lastTime: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), // 12 hours ago
  },
  {
    id: 'ch15', type: 'group',
    name: 'Hackathon Team Alpha', members: 4, unread: 0, muted: false,
    isDept: true, isSection: false, favorite: true,
    lastMessage: 'I submitted the final pitch deck. Fingers crossed 🤞',
    lastSender: 'usman.t',
    lastTime: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // 1 day ago
  },
  {
    id: 'ch16', type: 'dm',
    name: 'library.desk', online: false, unread: 2, muted: false, favorite: false,
    lastMessage: 'Your reserved book "Introduction to Algorithms" is ready for pickup at Counter 2.',
    lastTime: new Date(Date.now() - 2 * 86400 * 1000).toISOString(), // 2 days ago
  },
  {
    id: 'ch17', type: 'group',
    name: 'FYP Supervisors 2025', members: 8, unread: 0, muted: true,
    isDept: true, isSection: true, favorite: false,
    lastMessage: 'Meeting rescheduled to next Tuesday.',
    lastSender: 'Dr. Anwar',
    lastTime: new Date(Date.now() - 5 * 86400 * 1000).toISOString(), // 5 days ago
  },
  {
    id: 'ch18', type: 'dm',
    name: 'saad.design', online: false, unread: 0, muted: false, favorite: false,
    lastMessage: 'Here are the Figma assets for the new Glassmorphism UI components.',
    lastTime: new Date(Date.now() - 7 * 86400 * 1000).toISOString(), // 1 week ago
  },
  {
    id: 'ch19', type: 'group',
    name: 'Alumni Network', members: 340, unread: 0, muted: true,
    isDept: false, isSection: false, favorite: false,
    lastMessage: 'Anyone hiring junior developers right now?',
    lastSender: 'kamran.88',
    lastTime: new Date(Date.now() - 14 * 86400 * 1000).toISOString(), // 2 weeks ago
  },
  {
    id: 'ch20', type: 'dm',
    name: 'maria.khan', online: false, unread: 0, muted: false, favorite: false,
    lastMessage: 'Thanks for the coffee today! Let me know when you are free next week.',
    lastTime: new Date(Date.now() - 30 * 86400 * 1000).toISOString(), // 1 month ago
  },
  {
    id: 'ch21', type: 'group',
    name: 'Photography Society', members: 55, unread: 3, muted: false,
    isDept: false, isSection: false, favorite: false,
    lastMessage: 'Voting for the campus spring photo contest ends tonight!',
    lastSender: 'hina.j',
    lastTime: new Date(Date.now() - 35 * 86400 * 1000).toISOString(), // > 1 month ago
  },
  {
    id: 'ch22', type: 'dm',
    name: 'finance.office', online: false, unread: 1, muted: false, favorite: false,
    lastMessage: 'Your semester fee voucher has been generated. Due date is 15th.',
    lastTime: new Date(Date.now() - 40 * 86400 * 1000).toISOString(), // > 1 month ago
  },
  {
    id: 'ch23', type: 'dm',
    name: 'tayyab.dev', online: true, unread: 0, muted: true, favorite: false,
    lastMessage: 'Got it. I will fix the absolute positioning issue in the CustomTabBar later tonight.',
    lastTime: new Date(Date.now() - 60 * 86400 * 1000).toISOString(), // 2 months ago
  },
  {
    id: 'ch24', type: 'group',
    name: 'Gaming Lounge', members: 18, unread: 45, muted: true,
    isDept: false, isSection: false, favorite: false,
    lastMessage: 'Who is online for Valo right now? Need 1 for comp.',
    lastSender: 'faizan.dev',
    lastTime: new Date(Date.now() - 180 * 86400 * 1000).toISOString(), // 6 months ago
  }
];