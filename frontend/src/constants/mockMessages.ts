// src/constants/mockMessages.ts

export type MessageStatus = 'sent' | 'delivered' | 'seen';
export type MessageType   = 'text' | 'image' | 'file' | 'voice';

export type Reaction = {
  emoji:    string;
  username: string;
};

export type Message = {
  id:        string;
  senderId:  string;
  username:  string;
  type:      MessageType;
  text?:     string;
  imageUri?: string;
  fileName?: string;
  fileSize?: string;
  duration?: number;    // voice — seconds
  timestamp: string;
  status:    MessageStatus;
  reactions: Reaction[];
  replyTo?:  {
    id:       string;
    username: string;
    text:     string;
  };
};

const ME = 'bilal.dev';

export const MOCK_MESSAGES: Message[] = [
  {
    id: 'm1', senderId: 'u1', username: 'zara.malik', type: 'text',
    text: 'Hey! Did you finish the DSA assignment?',
    timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    status: 'seen', reactions: [],
  },
  {
    id: 'm2', senderId: ME, username: ME, type: 'text',
    text: 'Almost done, just the last two questions left 😅',
    timestamp: new Date(Date.now() - 3600 * 1000 * 2 + 60000).toISOString(),
    status: 'seen', reactions: [{ emoji: '😂', username: 'zara.malik' }],
  },
  {
    id: 'm3', senderId: 'u1', username: 'zara.malik', type: 'text',
    text: 'Same here lol. Do you have the notes from last lecture?',
    timestamp: new Date(Date.now() - 3600 * 1000).toISOString(),
    status: 'seen', reactions: [],
  },
  {
    id: 'm4', senderId: ME, username: ME, type: 'text',
    text: 'Yeah let me send them',
    timestamp: new Date(Date.now() - 3600 * 1000 + 30000).toISOString(),
    status: 'seen', reactions: [],
    replyTo: { id: 'm3', username: 'zara.malik', text: 'Do you have the notes from last lecture?' },
  },
  {
    id: 'm5', senderId: ME, username: ME, type: 'file',
    fileName: 'DSA_Lecture_12.pdf', fileSize: '2.4 MB',
    timestamp: new Date(Date.now() - 3500 * 1000).toISOString(),
    status: 'seen', reactions: [],
  },
  {
    id: 'm6', senderId: 'u1', username: 'zara.malik', type: 'voice',
    duration: 14,
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: 'seen', reactions: [],
  },
  {
    id: 'm7', senderId: ME, username: ME, type: 'text',
    text: 'Got it! See you in class 👋',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    status: 'delivered', reactions: [],
  },
];