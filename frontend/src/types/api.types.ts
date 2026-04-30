// src/types/api.types.ts

// ─── Pagination ───────────────────────────────────────────────────────────────
export type CursorPage<T> = {
  items:      T[];
  nextCursor: string | null;  // null = no more pages
  hasMore:    boolean;
};

export type PageParams = {
  cursor?: string;
  limit?:  number;
};

// ─── User ─────────────────────────────────────────────────────────────────────
export type User = {
  id:           string;
  username:     string;
  full_name?:   string;
  bio?:         string;
  avatar_url?:  string;
  dept?:        string;
  university?:  string;
  year?:        number;
  is_premium:   boolean;
  is_tutor:     boolean;
  is_helper:    boolean;
  is_verified:  boolean;
  circle_count: number;
  post_count:   number;
  rating:       number;
  created_at:   string;
  // Viewer context
  is_following?: boolean;
};

// ─── Post ─────────────────────────────────────────────────────────────────────
export type Post = {
  id:            string;
  user:          Pick<User, 'id' | 'username' | 'avatar_url' | 'dept' | 'is_premium' | 'is_verified'>;
  content:       string;
  media_url?:    string;
  media_type?:   'image' | 'video' | 'reel';
  like_count:    number;
  comment_count: number;
  share_count:   number;
  is_liked:      boolean;
  is_saved:      boolean;
  created_at:    string;
};

export type Comment = {
  id:         string;
  user:       Pick<User, 'id' | 'username' | 'avatar_url'>;
  text:       string;
  parent_id?: string;
  created_at: string;
};

// ─── Market ───────────────────────────────────────────────────────────────────
export type MarketListing = {
  id:          string;
  seller:      Pick<User, 'id' | 'username' | 'avatar_url' | 'dept'>;
  type:        'item' | 'note';
  title:       string;
  description?: string;
  price:       number;
  dept?:       string;
  is_sold:     boolean;
  is_featured: boolean;
  created_at:  string;
  // Item
  condition?:  'new' | 'slight' | 'used';
  images?:     string[];
  // Note
  note_type?:  'pdf' | 'physical';
  pages?:      number;
  subject?:    string;
  file_url?:   string;
  rating?:     number;
  sales?:      number;
};

export type MarketOrder = {
  id:           string;
  listing:      MarketListing;
  buyer_id:     string;
  seller_id:    string;
  amount:       number;
  status:       'pending' | 'confirmed' | 'meeting_set' | 'delivered' | 'completed' | 'cancelled';
  meet_location?:string;
  meet_time?:   string;
  pages?:       number;
  created_at:   string;
};

// ─── Services ─────────────────────────────────────────────────────────────────
export type ServiceListing = {
  id:               string;
  provider:         Pick<User, 'id' | 'username' | 'avatar_url' | 'dept' | 'is_premium'>;
  type:             'tutor' | 'assignment';
  subjects:         string[];
  dept?:            string;
  bio?:             string;
  // Tutor
  rate_per_hour?:   number;
  is_available?:    boolean;
  sessions_done?:   number;
  // Assignment
  price_per_page?:  number;
  max_pages?:       number;
  delivery_days?:   number;
  assignments_done?:number;
  rating:           number;
  rating_count:     number;
};

export type ServiceBooking = {
  id:           string;
  service:      ServiceListing;
  client_id:    string;
  provider_id:  string;
  type:         'tutor' | 'assignment';
  hours?:       number;
  session_time?:string;
  pages?:       number;
  deadline?:    string;
  instructions?:string;
  amount:       number;
  status:       'pending' | 'accepted' | 'in_progress' | 'delivered' | 'completed' | 'cancelled';
  created_at:   string;
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export type Chat = {
  id:           string;
  type:         'dm' | 'group';
  name?:        string;
  avatar_url?:  string;
  last_message?:Message;
  unread_count: number;
  members?:     Pick<User, 'id' | 'username' | 'avatar_url'>[];
  updated_at:   string;
};

export type Message = {
  id:          string;
  chat_id:     string;
  sender:      Pick<User, 'id' | 'username' | 'avatar_url'>;
  type:        'text' | 'image' | 'file' | 'voice';
  text?:       string;
  media_url?:  string;
  file_name?:  string;
  file_size?:  number;
  duration?:   number;
  reply_to?:   Pick<Message, 'id' | 'text' | 'sender'>;
  reactions:   { emoji: string; username: string }[];
  status:      'sent' | 'delivered' | 'seen';
  created_at:  string;
};

// ─── Notification ─────────────────────────────────────────────────────────────
export type Notification = {
  id:         string;
  type:       string;
  title:      string;
  body?:      string;
  actor?:     Pick<User, 'id' | 'username' | 'avatar_url'>;
  data:       Record<string, any>;
  is_read:    boolean;
  created_at: string;
};