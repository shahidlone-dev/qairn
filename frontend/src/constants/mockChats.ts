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
];