// src/constants/mockServices.ts

export type ServiceType = 'tutor' | 'assignment';

export type TutorListing = {
  id:        string;
  type:      'tutor';
  username:  string;
  name:      string;
  subjects:  string[];      // e.g. ['Python', 'OOP', 'DSA']
  dept:      string;
  rate:      number;        // Rs per hour
  rating:    number;
  sessions:  number;        // total sessions done
  bio:       string;
  available: boolean;       // online / available now
  premium:   boolean;
  avatar?:   string;
};

export type AssignmentListing = {
  id:          string;
  type:        'assignment';
  username:    string;
  name:        string;
  subjects:    string[];    // subjects they handle
  dept:        string;
  pricePerPage:number;      // Rs per page
  rating:      number;
  done:        number;      // total assignments completed
  bio:         string;
  maxPages:    number;      // max pages they accept
  deliveryDays:number;      // typical delivery in days
  premium:     boolean;
  avatar?:     string;
};

export type ServiceListing = TutorListing | AssignmentListing;

// ─── Mock tutors ──────────────────────────────────────────────────────────────
export const MOCK_TUTORS: TutorListing[] = [
  {
    id: 't1', type: 'tutor', username: 'ali.raza', name: 'Ali Raza',
    subjects: ['Python', 'OOP', 'DSA'], dept: 'CS',
    rate: 500, rating: 4.9, sessions: 23,
    bio: 'CS final year. Taught 23 students. Clear concepts, patient teaching, exam-focused.',
    available: true, premium: true,
  },
  {
    id: 't2', type: 'tutor', username: 'ahmed.k', name: 'Ahmed Khan',
    subjects: ['Circuit Analysis', 'Electronics', 'Signals'], dept: 'EE',
    rate: 450, rating: 4.7, sessions: 18,
    bio: 'EE student with strong fundamentals. Solved hundreds of past paper questions.',
    available: true, premium: false,
  },
  {
    id: 't3', type: 'tutor', username: 'zara.malik', name: 'Zara Malik',
    subjects: ['Calculus', 'Linear Algebra', 'Statistics'], dept: 'CS',
    rate: 400, rating: 4.8, sessions: 31,
    bio: 'Math tutor for CS and EE students. Concepts made simple with visual examples.',
    available: false, premium: false,
  },
  {
    id: 't4', type: 'tutor', username: 'hina.j', name: 'Hina Javed',
    subjects: ['Architectural Design', 'AutoCAD', 'Sketching'], dept: 'ARCH',
    rate: 600, rating: 4.6, sessions: 12,
    bio: 'Final year ARCH student. Portfolio-ready teaching. Studio critique experience.',
    available: true, premium: true,
  },
  {
    id: 't5', type: 'tutor', username: 'usman.t', name: 'Usman Tariq',
    subjects: ['Thermodynamics', 'Fluid Mechanics', 'CAD'], dept: 'ME',
    rate: 480, rating: 4.5, sessions: 9,
    bio: 'ME student. Helped juniors clear backlogs in thermo and fluids.',
    available: false, premium: false,
  },
];

// ─── Mock assignment helpers ──────────────────────────────────────────────────
export const MOCK_ASSIGNMENTS: AssignmentListing[] = [
  {
    id: 'a1', type: 'assignment', username: 'sara.ch', name: 'Sara Chaudhry',
    subjects: ['Marketing Reports', 'Business Plans', 'Case Studies'], dept: 'BBA',
    pricePerPage: 80, rating: 4.8, done: 14,
    bio: 'BBA student. Well-researched, plagiarism-free, APA/Harvard formatted reports.',
    maxPages: 30, deliveryDays: 2, premium: false,
  },
  {
    id: 'a2', type: 'assignment', username: 'ali.raza', name: 'Ali Raza',
    subjects: ['Programming Assignments', 'Lab Reports', 'Projects'], dept: 'CS',
    pricePerPage: 120, rating: 4.9, done: 28,
    bio: 'Complete coding assignments in Python, C++, Java. Clean code + documentation.',
    maxPages: 20, deliveryDays: 1, premium: true,
  },
  {
    id: 'a3', type: 'assignment', username: 'nadia.s', name: 'Nadia Shah',
    subjects: ['Essay Writing', 'Literature Reviews', 'Research Papers'], dept: 'BBA',
    pricePerPage: 70, rating: 4.6, done: 19,
    bio: 'Strong academic writer. Citations, references and formatting included.',
    maxPages: 40, deliveryDays: 3, premium: false,
  },
  {
    id: 'a4', type: 'assignment', username: 'ahmed.k', name: 'Ahmed Khan',
    subjects: ['EE Lab Reports', 'Circuit Simulations', 'Calculations'], dept: 'EE',
    pricePerPage: 100, rating: 4.7, done: 11,
    bio: 'Detailed EE lab reports with proper diagrams, calculations and conclusions.',
    maxPages: 25, deliveryDays: 2, premium: false,
  },
];