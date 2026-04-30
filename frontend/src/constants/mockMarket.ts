// src/constants/mockMarket.ts

export type Condition = 'new' | 'slight' | 'used';
export type NoteType  = 'pdf' | 'physical';
export type ListingType = 'item' | 'note';

export type ItemListing = {
  id:          string;
  type:        'item';
  title:       string;
  description: string;
  price:       number;
  condition:   Condition;
  images:      string[];   // uris — empty = placeholder
  dept:        string;
  seller:      string;
  timestamp:   string;
  sold:        boolean;
  featured:    boolean;
};

export type NoteListing = {
  id:          string;
  type:        'note';
  title:       string;
  subject:     string;
  description: string;
  price:       number;
  noteType:    NoteType;   // pdf = instant, physical = meetup
  pages:       number;
  dept:        string;
  seller:      string;
  rating:      number;
  sales:       number;
  timestamp:   string;
  sold:        boolean;
  featured:    boolean;
};

export type Listing = ItemListing | NoteListing;

// ─── Mock data ────────────────────────────────────────────────────────────────
export const MOCK_LISTINGS: Listing[] = [
  // ── Featured items ──────────────────────────────────────────────────────────
  {
    id: 'n1', type: 'note', featured: true, sold: false,
    title:       'Complete DSA Notes',
    subject:     'Data Structures & Algorithms',
    description: 'Full semester notes covering arrays, linked lists, trees, graphs, sorting. Exam-focused with solved examples.',
    price:       250, noteType: 'pdf', pages: 68,
    dept: 'CS', seller: 'ali.raza', rating: 4.9, sales: 41,
    timestamp: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
  },
  {
    id: 'i1', type: 'item', featured: true, sold: false,
    title:       'Engineering Drawing Set',
    description: 'Barely used. Includes drafter, scales, compass, divider, set squares. Perfect condition.',
    price:       800, condition: 'slight', images: [], dept: 'ME',
    seller: 'usman.t',
    timestamp: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
  },
  {
    id: 'n2', type: 'note', featured: true, sold: false,
    title:       'Circuit Analysis — 60 Pages',
    subject:     'Circuit Analysis',
    description: 'Detailed notes with solved problems. Covers KVL, KCL, Thevenin, Norton, AC/DC circuits.',
    price:       180, noteType: 'pdf', pages: 60,
    dept: 'EE', seller: 'ahmed.k', rating: 4.7, sales: 34,
    timestamp: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
  },

  // ── Notes ───────────────────────────────────────────────────────────────────
  {
    id: 'n3', type: 'note', featured: false, sold: false,
    title:       'OOP Complete Notes',
    subject:     'Object Oriented Programming',
    description: 'Classes, objects, inheritance, polymorphism, encapsulation. Physical copy available.',
    price:       120, noteType: 'physical', pages: 45,
    dept: 'CS', seller: 'zara.malik', rating: 4.5, sales: 18,
    timestamp: new Date(Date.now() - 4 * 86400 * 1000).toISOString(),
  },
  {
    id: 'n4', type: 'note', featured: false, sold: false,
    title:       'Marketing Principles',
    subject:     'Principles of Marketing',
    description: 'Full semester BBA marketing notes. Includes past paper answers.',
    price:       150, noteType: 'pdf', pages: 52,
    dept: 'BBA', seller: 'sara.ch', rating: 4.3, sales: 12,
    timestamp: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
  },
  {
    id: 'n5', type: 'note', featured: false, sold: false,
    title:       'Thermodynamics Notes',
    subject:     'Engineering Thermodynamics',
    description: 'Handwritten + typed notes. Laws of thermodynamics, cycles, heat transfer.',
    price:       200, noteType: 'physical', pages: 80,
    dept: 'ME', seller: 'hina.j', rating: 4.6, sales: 9,
    timestamp: new Date(Date.now() - 6 * 86400 * 1000).toISOString(),
  },

  // ── Items ───────────────────────────────────────────────────────────────────
  {
    id: 'i2', type: 'item', featured: false, sold: false,
    title:       'Scientific Calculator',
    description: 'Casio FX-991ES Plus. Works perfectly. Selling because graduated.',
    price:       1200, condition: 'slight', images: [], dept: 'CS',
    seller: 'bilal.dev',
    timestamp: new Date(Date.now() - 7 * 86400 * 1000).toISOString(),
  },
  {
    id: 'i3', type: 'item', featured: false, sold: false,
    title:       'Mechanics Textbook Set',
    description: '3 books — Engineering Mechanics, Fluid Mechanics, Strength of Materials. Good condition.',
    price:       650, condition: 'used', images: [], dept: 'ME',
    seller: 'usman.t',
    timestamp: new Date(Date.now() - 8 * 86400 * 1000).toISOString(),
  },
  {
    id: 'i4', type: 'item', featured: false, sold: false,
    title:       'Lab Coat (Medium)',
    description: 'White lab coat, medium size, used one semester only.',
    price:       300, condition: 'slight', images: [], dept: 'EE',
    seller: 'ahmed.k',
    timestamp: new Date(Date.now() - 9 * 86400 * 1000).toISOString(),
  },
  {
    id: 'i5', type: 'item', featured: false, sold: false,
    title:       'Brand New Notebook Set',
    description: 'Pack of 5 A4 notebooks, never opened. Bought extra.',
    price:       150, condition: 'new', images: [], dept: 'BBA',
    seller: 'sara.ch',
    timestamp: new Date(Date.now() - 10 * 86400 * 1000).toISOString(),
  },
];

export const FEATURED  = MOCK_LISTINGS.filter(l => l.featured);
export const NOTES     = MOCK_LISTINGS.filter(l => l.type === 'note'  && !l.featured) as NoteListing[];
export const ITEMS     = MOCK_LISTINGS.filter(l => l.type === 'item'  && !l.featured) as ItemListing[];