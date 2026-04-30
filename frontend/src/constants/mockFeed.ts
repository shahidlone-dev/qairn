// src/constants/mockFeed.ts

// ─── Types ────────────────────────────────────────────────────────────────────
export type Comment = {
  id:        string;
  username:  string;
  text:      string;
  timestamp: string;
};

export type Post = {
  id:             string;
  user: {
    id:           string;
    username:     string;
    name:         string;
    avatar?:      string;
    dept:         string;
    verified:     boolean;
    premium:      boolean;
  };
  content:        string;
  image?:         string;
  timestamp:      string;
  likes:          number;
  comments:       number;
  shares:         number;
  saved:          boolean;
  liked:          boolean;
  inCircle:       boolean;
  previewComment: Comment | null;   // shown in feed (backend picks best)
  allComments:    Comment[];        // only post owner sees these
};

// ─── Mock posts ───────────────────────────────────────────────────────────────
export const MOCK_POSTS: Post[] = [
  {
    id: '1',
    user: { id: 'u1', username: 'zara.malik', name: 'Zara Malik', dept: 'CS', verified: true, premium: false },
    content: 'Anyone has the DSA final paper from last year? Need it urgently for prep 🙏',
    timestamp: '2025-01-15T10:30:00Z',
    likes: 24, comments: 8, shares: 3, saved: false, liked: false, inCircle: true,
    previewComment: {
      id: 'c1', username: 'ahmed.k',
      text: 'Check the library portal, they usually upload past papers there!',
      timestamp: '2025-01-15T10:45:00Z',
    },
    allComments: [
      { id: 'c1', username: 'ahmed.k',   text: 'Check the library portal, they usually upload past papers there!', timestamp: '2025-01-15T10:45:00Z' },
      { id: 'c2', username: 'ali.raza',  text: 'I have it, will send you on DM',                                  timestamp: '2025-01-15T10:50:00Z' },
      { id: 'c3', username: 'hina.j',    text: 'Same, need this too 🙏',                                          timestamp: '2025-01-15T11:00:00Z' },
      { id: 'c4', username: 'usman.t',   text: 'Try the CS group on WhatsApp, someone shared it last semester',   timestamp: '2025-01-15T11:10:00Z' },
      { id: 'c5', username: 'sara.ch',   text: 'Prof usually gives hints in the last lecture, attend that!',      timestamp: '2025-01-15T11:20:00Z' },
      { id: 'c6', username: 'bilal.dev', text: 'Sending you on DM right now',                                     timestamp: '2025-01-15T11:30:00Z' },
      { id: 'c7', username: 'nadia.s',   text: 'Good luck with prep everyone 🤞',                                  timestamp: '2025-01-15T11:40:00Z' },
      { id: 'c8', username: 'raza.m',    text: 'I think the format changed this year fyi',                        timestamp: '2025-01-15T11:50:00Z' },
    ],
  },
  {
    id: '2',
    user: { id: 'u2', username: 'ahmed.k', name: 'Ahmed Khan', dept: 'EE', verified: false, premium: true },
    content: 'Just dropped my notes for Circuit Analysis — 60 pages, super detailed. Check the Market section 👀',
    timestamp: '2025-01-15T09:15:00Z',
    likes: 61, comments: 14, shares: 22, saved: true, liked: true, inCircle: false,
    previewComment: {
      id: 'c1', username: 'sara.ch',
      text: 'Been waiting for this, just bought it! 🔥',
      timestamp: '2025-01-15T09:30:00Z',
    },
    allComments: [
      { id: 'c1', username: 'sara.ch',   text: 'Been waiting for this, just bought it! 🔥',       timestamp: '2025-01-15T09:30:00Z' },
      { id: 'c2', username: 'zara.malik',text: 'Is it good for beginners?',                        timestamp: '2025-01-15T09:35:00Z' },
      { id: 'c3', username: 'ali.raza',  text: 'Bought it, worth every rupee',                     timestamp: '2025-01-15T09:40:00Z' },
      { id: 'c4', username: 'hina.j',    text: 'Any discount for seniors? 😅',                     timestamp: '2025-01-15T09:45:00Z' },
    ],
  },
  {
    id: '3',
    user: { id: 'u3', username: 'sara.ch', name: 'Sara Chaudhry', dept: 'BBA', verified: false, premium: false },
    content: 'The cafeteria needs to sort out its Wi-Fi situation. Genuinely cannot submit assignments on time because of this. Anyone else facing this?',
    timestamp: '2025-01-15T08:00:00Z',
    likes: 112, comments: 47, shares: 8, saved: false, liked: false, inCircle: true,
    previewComment: {
      id: 'c1', username: 'bilal.dev',
      text: 'Literally submitted 3 assignments from the parking lot because of this 😭',
      timestamp: '2025-01-15T08:10:00Z',
    },
    allComments: [
      { id: 'c1', username: 'bilal.dev', text: 'Literally submitted 3 assignments from the parking lot because of this 😭', timestamp: '2025-01-15T08:10:00Z' },
      { id: 'c2', username: 'ahmed.k',   text: 'The IT department has been saying "we are working on it" for 2 years',       timestamp: '2025-01-15T08:15:00Z' },
      { id: 'c3', username: 'zara.malik',text: 'We should bring this up in the student council meeting',                      timestamp: '2025-01-15T08:20:00Z' },
    ],
  },
  {
    id: '4',
    user: { id: 'u4', username: 'ali.raza', name: 'Ali Raza', dept: 'CS', verified: true, premium: true },
    content: 'Offering Python tutoring sessions — beginner to intermediate. Rs 500/hr. Flexible timings. DM me if interested!',
    timestamp: '2025-01-14T22:00:00Z',
    likes: 38, comments: 19, shares: 11, saved: true, liked: false, inCircle: true,
    previewComment: {
      id: 'c1', username: 'nadia.s',
      text: 'DMed you! Need help with OOP concepts badly 😅',
      timestamp: '2025-01-14T22:20:00Z',
    },
    allComments: [
      { id: 'c1', username: 'nadia.s',   text: 'DMed you! Need help with OOP concepts badly 😅',      timestamp: '2025-01-14T22:20:00Z' },
      { id: 'c2', username: 'usman.t',   text: 'Do you cover data structures too?',                    timestamp: '2025-01-14T22:30:00Z' },
      { id: 'c3', username: 'hina.j',    text: 'Rs 500 is very reasonable, DM sent!',                  timestamp: '2025-01-14T22:40:00Z' },
    ],
  },
  {
    id: '5',
    user: { id: 'u5', username: 'hina.j', name: 'Hina Javed', dept: 'ARCH', verified: false, premium: false },
    content: 'Final year thesis submitted 🎉 Three years of stress finally over. Thanks to everyone who helped along the way!',
    timestamp: '2025-01-14T18:45:00Z',
    likes: 203, comments: 56, shares: 14, saved: false, liked: true, inCircle: false,
    previewComment: {
      id: 'c1', username: 'zara.malik',
      text: 'Congratulations!! You deserve this so much 🎊',
      timestamp: '2025-01-14T18:50:00Z',
    },
    allComments: [
      { id: 'c1', username: 'zara.malik', text: 'Congratulations!! You deserve this so much 🎊',   timestamp: '2025-01-14T18:50:00Z' },
      { id: 'c2', username: 'ahmed.k',    text: 'Well done! What was your thesis topic?',            timestamp: '2025-01-14T18:55:00Z' },
      { id: 'c3', username: 'bilal.dev',  text: 'Inspiration for all of us 💪',                      timestamp: '2025-01-14T19:00:00Z' },
    ],
  },
  {
    id: '6',
    user: { id: 'u6', username: 'usman.t', name: 'Usman Tariq', dept: 'ME', verified: false, premium: false },
    content: 'Selling my engineering drawing set — barely used. Drafter, scales, compass, everything included. Rs 800 only. DM!',
    timestamp: '2025-01-14T16:00:00Z',
    likes: 17, comments: 6, shares: 2, saved: false, liked: false, inCircle: false,
    previewComment: null,   // no comments yet
    allComments: [],
  },
];

// ─── Current logged-in user ───────────────────────────────────────────────────
export const CURRENT_USER = {
  id:       'me',
  username: 'bilal.dev',
  name:     'Bilal Ahmed',
  dept:     'CS',
  avatar:   undefined as string | undefined,
};