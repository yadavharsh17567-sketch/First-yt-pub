export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number; // timestamp
  channelId?: string;
  channelTitle?: string;
  channelThumbnail?: string;
}

export type VideoStatus = 'queued' | 'downloading' | 'downloaded' | 'uploading' | 'completed' | 'failed';

export interface Video {
  id: string;
  sourceUrl: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  seoThumbnailUrl?: string;
  localThumbnailPath?: string;
  status: VideoStatus;
  progress: number; // 0 to 100
  fileSize?: string;
  localPath?: string;
  youtubeId?: string;
  targetUserId?: string; // YouTube ID of the republished video
  error?: string;
  retryCount: number;
  maxRetries: number;
  queuedAt: string; // ISO string
  completedAt?: string; // ISO string
  privacyStatus: 'private' | 'unlisted' | 'public';
  tags: string[];
  scheduleRuleId?: string; // If auto-ingested
  isRewritten?: boolean;
  cpsPrediction?: {
    score: number;
    ctr: number;
    level: 'Viral 🔥' | 'High 🚀' | 'Good ✅' | 'Average 📊' | 'Poor ⚠️';
    tips: string[];
    tagsSuggestions: string[];
  };
  autoOptimizeSeo?: boolean;
}

export interface ScheduleRule {
  id: string;
  name: string;
  sourceChannelUrl: string;
  titlePrefix: string;
  titleSuffix: string;
  descriptionTemplate: string;
  tags: string[];
  privacyStatus: 'private' | 'unlisted' | 'public';
  intervalMinutes: number;
  enabled: boolean;
  targetUserId?: string;
  lastCheckedAt?: string;
  autoOptimizeSeo?: boolean;
  maxLatestVideos?: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: string;
}

export interface SystemSettings {
  googleClientId: string;
  googleClientSecret: string;
  maxConcurrentUploads: number;
  maxRetries: number;
  autoRetryIntervalMinutes: number;
  downloadQuality: 'best' | '1080p' | '720p' | '480p';
  youtubeCookies?: string;
  youtubePoToken?: string;
  youtubeVisitorData?: string;
  geminiApiKey?: string;
}

export interface AppState {
  users: User[];
  videos: Video[];
  processedVideoIds: string[];
  scheduleRules: ScheduleRule[];
  logs: AuditLog[];
  settings: SystemSettings;
}
