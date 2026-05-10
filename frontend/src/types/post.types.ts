// src/types/post.types.ts

// =============================================================================
// Post status — mirrors backend post_status enum exactly
// =============================================================================

export type PostStatus =
  | 'draft'        // Row created, no media yet (or text-only awaiting publish)
  | 'uploading'    // Media upload in flight / attached to row
  | 'processing'   // Media processing on Cloudinary (videos)
  | 'published'    // Visible to all users
  | 'failed';      // Upload or publish failed — user can retry

// =============================================================================
// Pending post — represents an in-flight or failed post in the local store
//
// This record persists across app restarts via AsyncStorage so the user
// can resume interrupted uploads without losing their content.
// =============================================================================

export type PendingPostStatus =
  | 'creating_draft'   // Step 1 in flight (no real post_id yet)
  | 'uploading'        // Step 2 in flight
  | 'publishing'       // Step 3 in flight
  | 'published'        // Terminal success (removed from pending shortly after)
  | 'failed';          // Terminal failure — user must tap to retry

export type PendingPost = {
  // Identity
  postId:         string;       // Real server post_id (set after step 1 completes)
  tempSlot?:      string;       // Local-only ID used in feed before step 1 returns
  idempotencyKey: string;       // UUID v4 — used to detect duplicate draft creation

  // State
  status:         PendingPostStatus;
  progress:       number;       // 0–100, for progress indicators
  retryCount:     number;       // Number of times the user has manually retried
  error?:         string;       // Human-readable error for the UI

  // Content — persisted so retry can re-submit without the user re-entering data
  content:        string;
  mediaUri?:      string;       // Local file URI from ImagePicker
  mediaType?:     'image' | 'video';
  mimeType?:      string;
  pickerWidth?:   number | null;
  pickerHeight?:  number | null;

  // Timestamps
  createdAt:      number;       // Date.now() when submitPost was called
  updatedAt:      number;
};

// =============================================================================
// API response types
// =============================================================================

export type ApiPost = {
  id:             string;
  content:        string;
  media_url:      string | null;
  media_type:     'image' | 'video' | 'reel' | null;
  media_width:    number | null;
  media_height:   number | null;
  status:         PostStatus;
  failure_reason: string | null;
  created_at:     string;
  updated_at:     string;
  user: {
    id:          string;
    username:    string;
    avatar_url?: string;
    dept?:       string;
    is_premium:  boolean;
    is_verified: boolean;
  };
  like_count:     number;
  comment_count:  number;
  share_count:    number;
  is_liked:       boolean;
  is_saved:       boolean;
};

export type ApiComment = {
  id:         string;
  text:       string;
  created_at: string;
  user: { id: string; username: string; avatar_url?: string };
};

// =============================================================================
// useCreatePost public interface
// =============================================================================

export type SubmitPostParams = {
  content:        string;
  mediaUri?:      string;
  mediaType?:     'image' | 'video';
  mimeType?:      string;
  pickerWidth?:   number | null;
  pickerHeight?:  number | null;
  /** Called immediately after the draft is created so the screen can navigate back */
  onNavigated?:   () => void;
};