import React, { useState, useEffect } from 'react';
import { 
  Youtube, Plus, Search, Settings as SettingsIcon, Terminal, Sliders, 
  RefreshCw, Play, Trash2, Copy, Check, Loader2, CloudUpload, 
  TrendingUp, LogOut, AlertCircle, Database, ListChecks, UserCheck, 
  Info, X, ChevronRight, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles,
  Link, Lock, Type, Send, Activity, Menu, Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Video, ScheduleRule, AuditLog, SystemSettings } from './types';

// Modular Sub-components
import Sidebar from './components/Sidebar';
import MetricCards from './components/MetricCards';
import RocketIdle from './components/RocketIdle';
import PipelineHealth from './components/PipelineHealth';
import AuthScreen from './components/AuthScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'queue' | 'scheduler' | 'logs' | 'settings'>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState<boolean>(false);
  
  // Database state
  const [users, setUsers] = useState<User[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  // Local form & UI states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [logFilter, setLogFilter] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  
  // Add manual video form state
  const [manualUrl, setManualUrl] = useState<string>('');
  const [manualTitle, setManualTitle] = useState<string>('');
  const [manualDesc, setManualDesc] = useState<string>('');
  const [manualPrivacy, setManualPrivacy] = useState<'private' | 'unlisted' | 'public'>('private');
  const [manualTags, setManualTags] = useState<string>('');
  const [manualTargetUserId, setManualTargetUserId] = useState<string>('');
  const [showManualForm, setShowManualForm] = useState<boolean>(false);
  const [manualAutoOptimizeSeo, setManualAutoOptimizeSeo] = useState<boolean>(true);

  // Add scheduler rule form state
  const [showRuleForm, setShowRuleForm] = useState<boolean>(false);
  const [ruleAutoOptimizeSeo, setRuleAutoOptimizeSeo] = useState<boolean>(true);
  const [ruleName, setRuleName] = useState<string>('');
  const [ruleSourceUrl, setRuleSourceUrl] = useState<string>('');
  const [ruleTargetUserId, setRuleTargetUserId] = useState<string>('');
  const [rulePrefix, setRulePrefix] = useState<string>('');
  const [ruleSuffix, setRuleSuffix] = useState<string>('');
  const [ruleDescTemplate, setRuleDescTemplate] = useState<string>('');
  const [ruleTags, setRuleTags] = useState<string>('');
  const [rulePrivacy, setRulePrivacy] = useState<'private' | 'unlisted' | 'public'>('private');
  const [ruleInterval, setRuleInterval] = useState<number>(120);
  const [ruleMaxLatestVideos, setRuleMaxLatestVideos] = useState<number>(4);
  const [triggeringRuleId, setTriggeringRuleId] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // AI Diagnostic States
  const [diagnosingVideoId, setDiagnosingVideoId] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{
    errorType: string;
    explanation: string;
    solution: string;
    steps: string[];
    canSolveByCookies: boolean;
    canSolveByMock: boolean;
  } | null>(null);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState<boolean>(false);

  // Settings form editing state
  const [editClientId, setEditClientId] = useState<string>('');
  const [editClientSecret, setEditClientSecret] = useState<string>('');
  const [editMaxConcurrent, setEditMaxConcurrent] = useState<number>(1);
  const [editMaxRetries, setEditMaxRetries] = useState<number>(3);
  const [editRetryInterval, setEditRetryInterval] = useState<number>(5);
  const [editQuality, setEditQuality] = useState<'best' | '1080p' | '720p' | '480p'>('720p');
  const [editYoutubeCookies, setEditYoutubeCookies] = useState<string>('');
  const [editYoutubePoToken, setEditYoutubePoToken] = useState<string>('');
  const [editYoutubeVisitorData, setEditYoutubeVisitorData] = useState<string>('');
  const [editGeminiApiKey, setEditGeminiApiKey] = useState<string>('');

  // Copy helper
  const [copied, setCopied] = useState<boolean>(false);

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Notification helper
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loginId, password: loginPassword })
      });
      if (res.ok) {
        setIsAuthenticated(true);
        fetchState(true);
      } else {
        showNotification('error', 'Invalid ID or Password');
      }
    } catch (err) {
      showNotification('error', 'Login request failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setIsAuthenticated(false);
  };

  // Fetch complete application state from backend
  const fetchState = async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const res = await fetch('/api/state');
      if (res.status === 401) {
        setIsAuthenticated(false);
        if (showLoader) setIsLoading(false);
        return;
      }
      if (res.ok) {
        setIsAuthenticated(true);
        const data = await res.json();
        setUsers(data.users || []);
        setVideos(data.videos || []);
        setRules(data.scheduleRules || []);
        setLogs(data.logs || []);
        if (data.settings) {
          setSettings(data.settings);
          // Only initialize settings inputs on first fetch
          if (showLoader) {
            setEditClientId(data.settings.googleClientId || '');
            setEditClientSecret(data.settings.googleClientSecret ? '••••••••' : '');
            setEditMaxConcurrent(data.settings.maxConcurrentUploads || 1);
            setEditMaxRetries(data.settings.maxRetries || 3);
            setEditRetryInterval(data.settings.autoRetryIntervalMinutes || 5);
            setEditQuality(data.settings.downloadQuality || '1080p');
            setEditYoutubeCookies(data.settings.youtubeCookies || '');
            setEditYoutubePoToken(data.settings.youtubePoToken || '');
            setEditYoutubeVisitorData(data.settings.youtubeVisitorData || '');
            setEditGeminiApiKey(data.settings.geminiApiKey ? '••••••••' : '');
          }
        }
      }
    } catch (err) {
      console.error('Failed to sync backend state:', err);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  // Real-time polling for status updates (every 2 seconds)
  useEffect(() => {
    fetchState(true);
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchState(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    if (autoRefresh) {
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, [videos, logs, autoRefresh]);

  // Synchronize selectedUserId with loaded users
  useEffect(() => {
    if (users.length > 0) {
      const exists = users.some(u => u.id === selectedUserId);
      if (!exists && selectedUserId !== 'all') {
        setSelectedUserId(users[0].id);
      }
    } else {
      setSelectedUserId('all');
    }
  }, [users]);

  // Google OAuth flow popup trigger (compliant with AI Studio iframe restrictions)
  const handleLinkChannel = async () => {
    if (!settings?.googleClientId) {
      showNotification('error', 'Google Client ID is missing. Please save your API keys in the Settings tab first.');
      setActiveTab('settings');
      return;
    }

    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/auth/url?origin=${encodeURIComponent(window.location.origin)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to construct auth URL.');
      }
      const { url } = await res.json();

      // Open OAuth consent page directly in popup window
      const authWindow = window.open(
        url,
        'google_oauth_popup',
        'width=600,height=700,status=no,resizable=yes,scrollbars=yes'
      );

      if (!authWindow) {
        showNotification('error', 'Popup was blocked! Please enable popups in your browser settings to link Google Accounts.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Listen for the cross-origin OAuth completion event from popup callback HTML
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      // Security Check: Match origin pattern
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.code) {
        try {
          setIsLoading(true);
          const response = await fetch('/api/auth/callback-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: event.data.code,
              origin: window.location.origin
            }),
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Authorization exchange failed.');
          }

          showNotification('success', 'YouTube account linked successfully!');
          fetchState();
        } catch (err: any) {
          showNotification('error', `Failed to complete login connection: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  // API Calls
  const handleDisconnectUser = async (userId: string) => {
    if (!confirm('Are you sure you want to disconnect this YouTube Channel? Scheduled automations for this account will stop.')) return;
    try {
      const res = await fetch('/api/auth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        showNotification('success', 'YouTube account disconnected.');
        fetchState();
      }
    } catch (e) {
      showNotification('error', 'Failed to disconnect account.');
    }
  };

  const handleManualAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl) return;

    try {
      setIsActionLoading(true);
      const res = await fetch('/api/videos/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: manualUrl,
          title: manualTitle,
          description: manualDesc,
          privacyStatus: manualPrivacy,
          targetUserId: manualTargetUserId,
          tags: manualTags ? manualTags.split(',').map(t => t.trim()) : [],
          autoOptimizeSeo: manualAutoOptimizeSeo,
        }),
      });

      if (res.ok) {
        showNotification('success', 'Video successfully added to the republish queue!');
        setManualUrl('');
        setManualTitle('');
        setManualDesc('');
        setManualTags('');
        setShowManualForm(false);
        setActiveTab('queue');
        fetchState();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to queue video.');
      }
    } catch (e) {
      showNotification('error', 'Error occurred connecting to server.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video record and its temporary downloaded files?')) return;
    try {
      const res = await fetch('/api/videos/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });
      if (res.ok) {
        showNotification('success', 'Video removed from database.');
        fetchState();
      }
    } catch (e) {
      showNotification('error', 'Failed to remove video.');
    }
  };

  const handleRetryVideo = async (videoId: string) => {
    try {
      const res = await fetch('/api/videos/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });
      if (res.ok) {
        showNotification('success', 'Video set to queued for retry.');
        fetchState();
      }
    } catch (e) {
      showNotification('error', 'Failed to retry video.');
    }
  };

  const handleDiagnoseVideo = async (videoId: string) => {
    setDiagnosingVideoId(videoId);
    setIsDiagnosing(true);
    setDiagnosticResult(null);
    setDiagnosticError(null);
    setShowDiagnosticModal(true);
    try {
      const res = await fetch('/api/videos/ai-diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiagnosticResult(data.diagnosis);
      } else {
        setDiagnosticError(data.error || 'Failed to generate diagnostics. Please try again.');
      }
    } catch (e) {
      setDiagnosticError('Network error connecting to AI Troubleshooter.');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleOptimizeVideoSeo = async (videoId: string) => {
    try {
      setIsActionLoading(true);
      const res = await fetch('/api/videos/optimize-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });
      if (res.ok) {
        const data = await res.json();
        showNotification('success', `AI SEO optimized! Predicted CTR rating: ${data.video.cpsPrediction.ctr}%`);
        fetchState();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to optimize video.');
      }
    } catch (e) {
      showNotification('error', 'Failed to communicate with SEO server.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCloseRuleForm = () => {
    setShowRuleForm(false);
    setEditingRuleId(null);
    setRuleName('');
    setRuleSourceUrl('');
    setRulePrefix('');
    setRuleSuffix('');
    setRuleDescTemplate('');
    setRuleTags('');
    setRuleInterval(120);
    setRuleMaxLatestVideos(4);
    setRuleAutoOptimizeSeo(true);
    setRuleTargetUserId('');
  };

  const handleStartEditRule = (rule: ScheduleRule) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.name);
    setRuleSourceUrl(rule.sourceChannelUrl);
    setRuleTargetUserId(rule.targetUserId || '');
    setRulePrefix(rule.titlePrefix || '');
    setRuleSuffix(rule.titleSuffix || '');
    setRuleDescTemplate(rule.descriptionTemplate || '');
    setRuleTags(rule.tags ? rule.tags.join(', ') : '');
    setRulePrivacy(rule.privacyStatus || 'private');
    setRuleInterval(rule.intervalMinutes || 120);
    setRuleMaxLatestVideos(rule.maxLatestVideos || 4);
    setRuleAutoOptimizeSeo(!!rule.autoOptimizeSeo);
    setShowRuleForm(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName || !ruleSourceUrl) return;

    try {
      setIsActionLoading(true);
      const isEditing = !!editingRuleId;
      const endpoint = isEditing ? '/api/rules/edit' : '/api/rules/add';
      const body = {
        id: editingRuleId,
        name: ruleName,
        sourceChannelUrl: ruleSourceUrl,
        titlePrefix: rulePrefix,
        titleSuffix: ruleSuffix,
        descriptionTemplate: ruleDescTemplate,
        tags: ruleTags ? ruleTags.split(',').map(t => t.trim()) : [],
        privacyStatus: rulePrivacy,
        intervalMinutes: ruleInterval,
        targetUserId: ruleTargetUserId,
        autoOptimizeSeo: ruleAutoOptimizeSeo,
        maxLatestVideos: ruleMaxLatestVideos,
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showNotification('success', isEditing ? 'Automation rule updated.' : 'Automation rule created.');
        handleCloseRuleForm();
        fetchState();
      } else {
        const err = await res.json();
        showNotification('error', err.error || `Failed to ${isEditing ? 'update' : 'create'} automation rule.`);
      }
    } catch (e) {
      showNotification('error', 'Error saving scheduler rule.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    try {
      const res = await fetch('/api/rules/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId }),
      });
      if (res.ok) {
        fetchState();
      }
    } catch (e) {
      showNotification('error', 'Failed to toggle rule state.');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return;
    try {
      const res = await fetch('/api/rules/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId }),
      });
      if (res.ok) {
        showNotification('success', 'Automation rule removed.');
        fetchState();
      }
    } catch (e) {
      showNotification('error', 'Failed to remove rule.');
    }
  };

  const handleTriggerRule = async (ruleId: string) => {
    try {
      setTriggeringRuleId(ruleId);
      const res = await fetch('/api/rules/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.addedCount > 0) {
          showNotification('success', `Found & queued ${data.addedCount} new video(s)! ✨`);
        } else {
          showNotification('info', 'No new videos found. Rule is up to date.');
        }
        fetchState();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to trigger rule refetch.');
      }
    } catch (e) {
      showNotification('error', 'Failed to trigger rule refetch.');
    } finally {
      setTriggeringRuleId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsActionLoading(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleClientId: editClientId,
          googleClientSecret: editClientSecret,
          maxConcurrentUploads: editMaxConcurrent,
          maxRetries: editMaxRetries,
          autoRetryIntervalMinutes: editRetryInterval,
          downloadQuality: editQuality,
          youtubeCookies: editYoutubeCookies,
          youtubePoToken: editYoutubePoToken,
          youtubeVisitorData: editYoutubeVisitorData,
          geminiApiKey: editGeminiApiKey,
        }),
      });

      if (res.ok) {
        showNotification('success', 'System parameters updated successfully.');
        fetchState();
      } else {
        showNotification('error', 'Failed to update system parameters.');
      }
    } catch (e) {
      showNotification('error', 'Error saving developer settings.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all system audit logs?')) return;
    try {
      const res = await fetch('/api/logs/clear');
      if (res.ok) {
        showNotification('success', 'Logs cleared.');
        fetchState();
      }
    } catch (e) {
      showNotification('error', 'Failed to clear logs.');
    }
  };

  const copyRedirectUri = () => {
    const callbackUri = `${window.location.origin}/auth/callback`;
    navigator.clipboard.writeText(callbackUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter by selected channel/user
  const displayVideos = selectedUserId === 'all' 
    ? videos 
    : videos.filter(v => v.targetUserId === selectedUserId);

  const displayRules = selectedUserId === 'all'
    ? rules
    : rules.filter(r => r.targetUserId === selectedUserId);

  // Stats derivation
  const stats = {
    total: displayVideos.length,
    queued: displayVideos.filter(v => v.status === 'queued').length,
    processing: displayVideos.filter(v => ['downloading', 'downloaded', 'uploading'].includes(v.status)).length,
    completed: displayVideos.filter(v => v.status === 'completed').length,
    failed: displayVideos.filter(v => v.status === 'failed').length,
    rulesActive: displayRules.filter(r => r.enabled).length,
  };

  const currentProcessingVideo = displayVideos.find(v => ['downloading', 'uploading'].includes(v.status));

  // Video Filtering and Searching
  const filteredVideos = displayVideos.filter(v => {
    const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.sourceUrl.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // Log Filtering and Searching
  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.message.toLowerCase().includes(logSearchQuery.toLowerCase()) || 
                          (l.details && l.details.toLowerCase().includes(logSearchQuery.toLowerCase()));
    const matchesLevel = logFilter === 'all' || l.level === logFilter;
    return matchesSearch && matchesLevel;
  });

  if (!isAuthenticated && !isLoading) {
    return (
      <AuthScreen 
        loginId={loginId}
        setLoginId={setLoginId}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        handleLogin={handleLogin}
        notification={notification}
        setNotification={setNotification}
        isActionLoading={isActionLoading}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-[#050508] font-sans antialiased flex text-white selection:bg-white/20 overflow-x-hidden">
      
      {/* Background Decorative Ambient Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#22104a] rounded-full blur-[140px] opacity-40 animate-pulse-slow-1 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#4a1010] rounded-full blur-[120px] opacity-30 animate-pulse-slow-2 pointer-events-none" />
      
      {/* Dynamic Pop-up Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-full border shadow-2xl backdrop-blur-md max-w-lg"
            style={{
              backgroundColor: notification.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : notification.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              borderColor: notification.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : notification.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)',
            }}
          >
            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
            {notification.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
            <span className="text-sm font-medium tracking-wide">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="p-0.5 rounded-full hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        stats={{
          queued: stats.queued,
          processing: stats.processing,
          rulesActive: displayRules.filter(r => r.enabled).length
        }}
        users={users}
        handleDisconnectUser={handleDisconnectUser}
        handleLinkChannel={handleLinkChannel}
        showNotification={showNotification}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        selectedUserId={selectedUserId}
        setSelectedUserId={setSelectedUserId}
      />

      {/* Right Main Content Area */}
      <div className="flex-1 min-h-screen flex flex-col overflow-hidden">
        
        {/* Top Header App Bar */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 sm:px-8 bg-[#06060a]/40 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger Toggle for Mobile/Tablet */}
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>

            <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">System Online</span>
              <span className="sm:hidden">Online</span>
            </div>

            {/* Active Channel Selector Dropdown */}
            {users.length > 0 ? (
              <div className="relative">
                <button 
                  onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
                  className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-white transition scale-100 active:scale-95"
                >
                  <span className="text-white/40 font-mono hidden md:inline">Channel:</span>
                  <div className="flex items-center gap-1.5">
                    {selectedUserId !== 'all' ? (
                      <>
                        <img 
                          src={users.find(u => u.id === selectedUserId)?.channelThumbnail || users.find(u => u.id === selectedUserId)?.picture || users[0].channelThumbnail || users[0].picture} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          className="w-4 h-4 rounded-full border border-white/10 object-cover shrink-0" 
                        />
                        <span className="font-bold text-white truncate max-w-[80px] xs:max-w-[120px] sm:max-w-[160px]">
                          {users.find(u => u.id === selectedUserId)?.channelTitle || users.find(u => u.id === selectedUserId)?.name || users[0].channelTitle || users[0].name}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[8px] font-bold shrink-0">ALL</div>
                        <span className="font-bold text-white">All Channels</span>
                      </>
                    )}
                    <span className="text-white/40 text-[9px]">▼</span>
                  </div>
                </button>

                {isChannelDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsChannelDropdownOpen(false)} />
                    <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-[#09090e] border border-white/10 shadow-2xl p-1.5 z-40 space-y-0.5 animate-fadeIn">
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedUserId('all');
                          setIsChannelDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left transition ${
                          selectedUserId === 'all' 
                            ? 'bg-white/10 text-white font-bold' 
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[9px] font-bold shrink-0">ALL</div>
                        <span>All Linked Channels</span>
                      </button>

                      {users.map((u) => (
                        <button 
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedUserId(u.id);
                            setIsChannelDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left transition ${
                            selectedUserId === u.id 
                              ? 'bg-white/10 text-white font-bold' 
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <img 
                            src={u.channelThumbnail || u.picture} 
                            alt="" 
                            referrerPolicy="no-referrer"
                            className="w-5 h-5 rounded-full border border-white/10 object-cover shrink-0" 
                          />
                          <span className="truncate">{u.channelTitle || u.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span className="hidden xs:inline">No Account Linked</span>
                <span className="xs:hidden">No Account</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 sm:px-4.5 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <button 
              onClick={handleLinkChannel}
              disabled={isActionLoading}
              className="flex items-center gap-2 px-3 sm:px-4.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition"
            >
              {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Youtube className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Link YouTube Channel</span>
              <span className="sm:hidden">Link</span>
            </button>
            <button 
              onClick={() => { setShowManualForm(true); setActiveTab('queue'); }}
              className="flex items-center gap-2 px-3 sm:px-4.5 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 hover:opacity-95 transition-all scale-100 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Republish Video</span>
              <span className="sm:hidden">Republish</span>
            </button>
          </div>
        </header>

        {/* Main Content Scroll Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative z-10 flex flex-col justify-between">
          <main className="flex-grow">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                <p className="text-slate-400 text-sm font-mono tracking-wider">LOADING SECURE REPUBLISHING NODE...</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                
                {/* DASHBOARD TAB VIEW */}
                {activeTab === 'dashboard' && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Metric Cards Grid */}
                    <MetricCards stats={stats} />

                    {/* Primary Grid Layout: Left active/recent task + right status checks */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Active Download/Upload Progress Card */}
                      <div className="lg:col-span-2">
                        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden backdrop-blur-md h-full flex flex-col justify-between">
                          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                          
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold font-display flex items-center gap-2 text-white/90">
                              <CloudUpload className="w-4 h-4 text-white/60" />
                              Active Replication Progress
                            </h2>
                            <span className="bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-3xs font-mono font-bold px-2 py-0.5 rounded-full">
                              ● Live
                            </span>
                          </div>

                          {currentProcessingVideo ? (
                            <div className="space-y-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex gap-4">
                                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 relative">
                                    <img src={currentProcessingVideo.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                                    </div>
                                  </div>
                                  <div>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-3xs font-mono font-bold uppercase tracking-wider ${
                                      currentProcessingVideo.status === 'downloading' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                      {currentProcessingVideo.status}
                                    </span>
                                    <h3 className="text-sm font-semibold text-white line-clamp-1 mt-1">{currentProcessingVideo.title}</h3>
                                    <p className="text-3xs text-white/40 font-mono mt-0.5 max-w-md truncate">{currentProcessingVideo.sourceUrl}</p>
                                  </div>
                                </div>
                                <span className="text-lg font-mono font-bold text-white/80">{currentProcessingVideo.progress}%</span>
                              </div>

                              {/* Progress bar container */}
                              <div className="space-y-1">
                                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                    style={{ width: `${currentProcessingVideo.progress}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
                                  <span>
                                    {currentProcessingVideo.status === 'downloading' ? 'Pulling video from stream source...' : 'Pushing chunk streams to YouTube API...'}
                                  </span>
                                  {currentProcessingVideo.fileSize && <span>File size: {currentProcessingVideo.fileSize}</span>}
                                </div>
                              </div>
                            </div>

                          ) : (
                            <RocketIdle />
                          )}
                        </div>
                      </div>

                      {/* Pipeline Health Card */}
                      <PipelineHealth 
                        usersCount={selectedUserId === 'all' ? users.length : 1}
                        rulesCount={displayRules.length}
                        hasActiveRules={displayRules.some(r => r.enabled)}
                      />

                    </div>

                    {/* Quick Video Addition Form - Row 4 */}
                    <div className="glass-panel p-6 rounded-3xl relative backdrop-blur-md">
                      <h2 className="text-sm font-bold font-display mb-4 flex items-center gap-2">
                        <Play className="w-4 h-4 text-red-500 fill-red-500" />
                        Republish Single Video Immediately
                      </h2>
                      
                      <form onSubmit={handleManualAddVideo} className="space-y-4">
                        <div>
                          <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1.5">Source Video URL *</label>
                          <div className="relative">
                            <Link className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
                            <input 
                              type="url" 
                              required
                              placeholder="https://www.youtube.com/watch?v=..." 
                              value={manualUrl}
                              onChange={(e) => setManualUrl(e.target.value)}
                              className="w-full glass-input rounded-xl pl-10 pr-10 py-2.5 text-sm text-white"
                            />
                            <button 
                              type="button"
                              onClick={async () => {
                                const text = await navigator.clipboard.readText();
                                if (text) setManualUrl(text);
                              }}
                              className="absolute right-3 top-2.5 p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition"
                              title="Paste clipboard"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1.5">Custom Title (Optional)</label>
                            <div className="relative">
                              <Type className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
                              <input 
                               type="text" 
                               placeholder="Leave empty to use source video title" 
                               value={manualTitle}
                               onChange={(e) => setManualTitle(e.target.value)}
                               className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm text-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1.5">Privacy Setting</label>
                            <div className="relative">
                              <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
                              <select 
                                value={manualPrivacy}
                                onChange={(e) => setManualPrivacy(e.target.value as any)}
                                className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm text-white bg-[#050508]/95"
                              >
                                <option value="private">Private (Default)</option>
                                <option value="unlisted">Unlisted</option>
                                <option value="public">Public</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {users.length > 0 && (
                          <div>
                            <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1.5">Target Account</label>
                            <select value={manualTargetUserId} onChange={e => setManualTargetUserId(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white bg-[#050508]/95">
                              <option value="">Default (First Linked)</option>
                              {users.map(u => <option key={u.id} value={u.id}>{u.channelTitle || u.name}</option>)}
                            </select>
                          </div>
                        )}

                        {settings?.geminiApiKey && (
                          <div className="flex items-center gap-2.5 py-2 px-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
                            <input 
                              type="checkbox" 
                              id="manualAutoOptimizeSeo"
                              checked={manualAutoOptimizeSeo}
                              onChange={(e) => setManualAutoOptimizeSeo(e.target.checked)}
                              className="w-4 h-4 text-indigo-500 bg-white/5 border-white/10 rounded focus:ring-indigo-500 focus:ring-offset-0"
                            />
                            <label htmlFor="manualAutoOptimizeSeo" className="text-xs font-semibold text-indigo-300 flex items-center gap-1 cursor-pointer select-none">
                              <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
                              Auto-Optimize Thumbnail, Tags & Predict CTR (CPS) with AI
                            </label>
                          </div>
                        )}

                        <button 
                          type="submit"
                          disabled={isActionLoading || !manualUrl}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Queue Video Republish
                        </button>
                      </form>
                    </div>

                    {/* Bottom Row - Linked Accounts & Live Audit Logs Side by Side */}
                    <div id="linked-accounts-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Active Channels */}
                      <div className="glass-panel p-6 rounded-3xl backdrop-blur-md flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-bold font-display mb-4 flex items-center justify-between border-b border-white/10 pb-2.5">
                            <span className="flex items-center gap-2 text-white/90"><UserCheck className="w-4 h-4 text-white/60" /> Linked Accounts</span>
                            <span className="text-3xs font-mono text-white/40 uppercase">{users.length} Linked</span>
                          </h3>

                          {users.length > 0 ? (
                            <div className="space-y-4">
                              {users.map((u) => (
                                <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                  <div className="flex items-center gap-3">
                                    <img 
                                      src={u.channelThumbnail || u.picture} 
                                      alt="" 
                                      referrerPolicy="no-referrer"
                                      className="w-9 h-9 rounded-full border border-white/15" 
                                    />
                                    <div>
                                      <p className="text-sm font-semibold text-white leading-snug">{u.channelTitle || u.name}</p>
                                      <p className="text-3xs text-white/40 font-mono truncate max-w-[130px]">{u.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-3xs font-mono font-bold">Active</span>
                                    <button 
                                      onClick={() => handleDisconnectUser(u.id)}
                                      className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-400 transition-colors"
                                      title="Disconnect"
                                    >
                                      <LogOut className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-12 text-center text-white/40 text-xs">
                              No channels linked yet. Configure developer settings and link your YouTube account.
                            </div>
                          )}
                        </div>
                        
                        <button onClick={handleLinkChannel} disabled={isActionLoading} className="w-full mt-4 py-3 flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                          {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          Link New Account
                        </button>
                      </div>

                      {/* Recent Activities Logs Snippet */}
                      <div className="glass-panel p-6 rounded-3xl flex flex-col h-[320px] backdrop-blur-md">
                        <h3 className="text-sm font-bold font-display mb-4 flex items-center justify-between border-b border-white/10 pb-2.5 flex-shrink-0">
                          <span className="flex items-center gap-2 text-white/90"><Terminal className="w-4 h-4 text-white/60" /> Live Audit Stream</span>
                          <button onClick={() => setActiveTab('logs')} className="text-2xs text-white/60 hover:text-white flex items-center gap-0.5 transition-all">
                            Full Console <ChevronRight className="w-3 h-3" />
                          </button>
                        </h3>

                        <div className="space-y-3 overflow-y-auto pr-1 flex-grow scrollbar-thin font-mono text-3xs">
                          {logs.slice(0, 8).map((log) => (
                            <div key={log.id} className="flex gap-2.5 items-start">
                              <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                                log.level === 'success' ? 'bg-emerald-500' : 
                                log.level === 'error' ? 'bg-red-500' : 
                                log.level === 'warn' ? 'bg-amber-500' : 'bg-blue-400'
                              }`} />
                              <div>
                                <span className="text-white/30 mr-1.5">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span className="text-white/80">{log.message}</span>
                              </div>
                            </div>
                          ))}
                          {logs.length === 0 && (
                            <div className="py-6 text-center text-white/40">No logs logged. Ready.</div>
                          )}
                        </div>

                        {/* Filter tabs at the bottom */}
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5 flex-shrink-0 text-[10px] font-bold font-mono">
                          {['all', 'info', 'success', 'warn', 'error'].map((level) => (
                            <button
                              key={level}
                              onClick={() => {
                                setLogFilter(level);
                                setActiveTab('logs');
                              }}
                              className={`px-2 py-1 rounded-md transition ${
                                logFilter === level ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
                              }`}
                            >
                              {level === 'all' ? 'All' : level === 'warn' ? 'Warning' : level.charAt(0).toUpperCase() + level.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}

              {/* QUEUE & LIBRARY TAB VIEW */}
              {activeTab === 'queue' && (
                <motion.div
                  key="queue"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold font-display">Video Pipeline & Library</h2>
                      <p className="text-xs text-white/40 mt-0.5">Filter, search, track, or trigger manual retries for processing streams.</p>
                    </div>

                    {/* Search and Filters Bar */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
                        <input 
                          type="text" 
                          placeholder="Search videos or URLs..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="glass-input rounded-xl pl-10 pr-4 py-2 text-sm text-white w-64"
                        />
                      </div>

                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="glass-input rounded-xl px-3 py-2 text-sm text-white bg-[#050508]/95"
                      >
                        <option value="all">All statuses</option>
                        <option value="queued">Queued</option>
                        <option value="downloading">Downloading</option>
                        <option value="downloaded">Downloaded</option>
                        <option value="uploading">Uploading</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  </div>

                  {/* Manual addition collapse card */}
                  <AnimatePresence>
                    {showManualForm && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="glass-panel p-6 rounded-2xl mb-4 relative backdrop-blur-md">
                          <button onClick={() => setShowManualForm(false)} className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition">
                            <X className="w-4 h-4" />
                          </button>
                          <h3 className="text-md font-bold font-display mb-4">Republish Custom Stream</h3>
                          <form onSubmit={handleManualAddVideo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4 md:col-span-2">
                              {users.length > 0 && (
                                <div>
                                  <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1">Target Account</label>
                                  <select value={manualTargetUserId} onChange={e => setManualTargetUserId(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white bg-[#050508]/95">
                                    <option value="">Default (First Linked)</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.channelTitle || u.name}</option>)}
                                  </select>
                                </div>
                              )}
                              <div>
                                <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1">Source URL *</label>
                                <input type="url" required placeholder="https://youtube.com/watch?v=..." value={manualUrl} onChange={e => setManualUrl(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white" />
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1">Custom Title</label>
                                <input type="text" placeholder="Leave empty to use source title" value={manualTitle} onChange={e => setManualTitle(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white" />
                              </div>
                              <div>
                                <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1">Privacy Level</label>
                                <select value={manualPrivacy} onChange={e => setManualPrivacy(e.target.value as any)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white bg-[#050508]/95">
                                  <option value="private">Private</option>
                                  <option value="unlisted">Unlisted</option>
                                  <option value="public">Public</option>
                                </select>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1">Metadata Description</label>
                                <textarea rows={2} placeholder="Add custom description details..." value={manualDesc} onChange={e => setManualDesc(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white" />
                              </div>
                              <div>
                                <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1">Video tags (Comma separated)</label>
                                <input type="text" placeholder="tutorials, lo-fi, react" value={manualTags} onChange={e => setManualTags(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white" />
                              </div>
                              {settings?.geminiApiKey && (
                                <div className="flex items-center gap-2.5 py-2 px-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
                                  <input 
                                    type="checkbox" 
                                    id="manualAutoOptimizeSeoModal"
                                    checked={manualAutoOptimizeSeo}
                                    onChange={(e) => setManualAutoOptimizeSeo(e.target.checked)}
                                    className="w-4 h-4 text-indigo-500 bg-white/5 border-white/10 rounded focus:ring-indigo-500 focus:ring-offset-0"
                                  />
                                  <label htmlFor="manualAutoOptimizeSeoModal" className="text-xs font-semibold text-indigo-300 flex items-center gap-1 cursor-pointer select-none">
                                    <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
                                    Auto-Optimize Thumbnail, Tags & Predict CTR (CPS) with AI
                                  </label>
                                </div>
                              )}
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                              <button type="button" onClick={() => setShowManualForm(false)} className="px-4 py-2 text-sm font-semibold rounded-xl text-white/80 hover:bg-white/10 transition">Cancel</button>
                              <button type="submit" disabled={isActionLoading} className="px-4 py-2 text-sm font-bold text-black rounded-xl bg-white hover:opacity-90 transition">
                                {isActionLoading ? 'Loading...' : 'Queue Pipeline'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Main Video List Grid */}
                  <div className="space-y-4">
                    {filteredVideos.map((video) => (
                      <div key={video.id} className="glass-panel p-4 sm:p-5 rounded-2xl flex flex-col gap-4 sm:gap-5 transition hover:border-white/20 hover:bg-white/10 backdrop-blur-md">
                        {/* Upper row: Thumbnail + main info details */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 flex items-start gap-3.5">
                            
                            {/* Image Thumbnail wrapper */}
                            <div className="w-24 sm:w-28 h-[64px] sm:h-[74px] rounded-xl overflow-hidden bg-white/5 border border-white/10 relative shrink-0">
                              <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                              {['downloading', 'uploading'].includes(video.status) && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <span className="text-xs font-mono font-bold text-white">{video.progress}%</span>
                                </div>
                              )}
                            </div>

                            {/* Text Metadata block */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                {/* Status Badge */}
                                <span className={`px-2 py-0.5 rounded text-3xs font-mono font-bold uppercase tracking-wider ${
                                  video.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                                  video.status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/25' :
                                  video.status === 'downloading' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/25 animate-pulse' :
                                  video.status === 'uploading' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25 animate-pulse' :
                                  video.status === 'downloaded' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/25' :
                                  'bg-white/10 text-white/60 border border-white/10'
                                }`}>
                                  {video.status}
                                </span>

                                <span className="text-3xs text-white/40 font-mono">
                                  Queued: {new Date(video.queuedAt).toLocaleDateString()} at {new Date(video.queuedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>

                                {video.scheduleRuleId && (
                                  <span className="px-2 py-0.5 bg-white/5 text-white/60 rounded border border-white/10 text-3xs font-mono">
                                    Rule Ingested
                                  </span>
                                )}
                              </div>

                              <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2" title={video.title}>{video.title}</h3>
                              
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-3xs text-white/40 font-mono">
                                <span className="truncate max-w-[110px] xs:max-w-[160px] sm:max-w-[240px] md:max-w-[320px] lg:max-w-[400px]" title={video.sourceUrl}>Source: {video.sourceUrl}</span>
                                {video.fileSize && <span>• Size: {video.fileSize}</span>}
                                {video.retryCount > 0 && <span className="text-amber-400 font-bold">• Retry: {video.retryCount}/{video.maxRetries}</span>}
                                {video.targetUserId && <span>• Target: {users.find(u => u.id === video.targetUserId)?.channelTitle || "Unknown"}</span>}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Mid Row: CPS Prediction details (Takes full width below thumbnail/title for pristine presentation) */}
                        {video.cpsPrediction && (
                          <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-xs text-white/90">
                            <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 mb-2">
                              <span className="flex items-center gap-1.5 text-3xs font-mono font-bold uppercase text-indigo-300">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> SEO Click Rating (CPS)
                              </span>
                              <span className={`px-2 py-0.5 rounded text-3xs font-mono font-bold uppercase tracking-wider ${
                                video.cpsPrediction.level.includes('🔥') ? 'bg-red-500/10 text-red-400 border border-red-500/25 animate-pulse' :
                                video.cpsPrediction.level.includes('🚀') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' :
                                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                              }`}>
                                {video.cpsPrediction.level}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-2.5">
                              <div>
                                <span className="text-3xs text-white/40 block font-mono uppercase tracking-wider">Estimated CTR</span>
                                <span className="text-md font-bold text-white font-mono">{video.cpsPrediction.ctr}%</span>
                              </div>
                              <div>
                                <span className="text-3xs text-white/40 block font-mono uppercase tracking-wider">SEO Score</span>
                                <span className="text-md font-bold text-white font-mono">{video.cpsPrediction.score}/100</span>
                              </div>
                            </div>
                            {video.cpsPrediction.tips?.length > 0 && (
                              <div className="mt-2 space-y-1 bg-white/2 p-2 rounded-lg border border-white/5">
                                <span className="text-[10px] text-indigo-200/60 font-mono block uppercase font-bold tracking-wider">AI Optimizer Recommendations:</span>
                                <ul className="list-disc pl-4 space-y-1 text-[11px] text-white/70">
                                  {video.cpsPrediction.tips.slice(0, 3).map((tip, idx) => (
                                    <li key={idx} className="leading-snug">{tip}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Bottom Row: Inline Progress and Action Controls */}
                        <div className="flex flex-row items-center justify-between gap-3 border-t border-white/10 pt-3.5">
                          
                          <div className="flex-1 min-w-0">
                            {/* Live inline progress bars for downloading or uploading */}
                            {['downloading', 'uploading'].includes(video.status) && (
                              <div className="max-w-[140px] xs:max-w-[180px] text-left">
                                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1 border border-white/10">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${video.progress}%` }} />
                                </div>
                                <span className="text-3xs font-mono text-white/60">{video.status === 'downloading' ? 'Downloading...' : 'Uploading...'}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {settings?.geminiApiKey && !['downloading', 'uploading'].includes(video.status) && (
                              <button 
                                onClick={() => handleOptimizeVideoSeo(video.id)}
                                disabled={isActionLoading}
                                className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                                title="Generate clickbait-optimized thumbnail and predict clicks-per-second CTR rating"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span className="hidden xs:inline">{video.cpsPrediction ? 'Regen SEO' : 'AI Optimize SEO'}</span>
                              </button>
                            )}

                            {video.status === 'completed' && video.youtubeId && (
                              <a 
                                href={`https://youtube.com/watch?v=${video.youtubeId}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition flex items-center gap-1.5"
                              >
                                <Youtube className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                                <span className="hidden xs:inline">View Video</span>
                              </a>
                            )}

                            {video.status === 'failed' && (
                              <div className="flex items-center gap-2">
                                <div className="text-right max-w-[80px] xs:max-w-[140px]">
                                  <p className="text-3xs text-red-400 truncate font-mono" title={video.error}>{video.error || 'System error'}</p>
                                </div>
                                <button 
                                  onClick={() => handleDiagnoseVideo(video.id)}
                                  className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25 hover:bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                                  title="AI Smart Diagnostics & Troubleshooter"
                                >
                                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                                  <span className="hidden xs:inline">AI Troubleshoot</span>
                                </button>
                                <button 
                                  onClick={() => handleRetryVideo(video.id)}
                                  className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/25 hover:bg-blue-500/20 text-blue-400 transition"
                                  title="Force Retry Pipeline"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            <button 
                              onClick={() => handleDeleteVideo(video.id)}
                              className="p-2 rounded-xl bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-400 transition"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                        </div>
                      </div>
                    ))}

                    {filteredVideos.length === 0 && (
                      <div className="glass-panel py-20 text-center text-white/30 rounded-3xl backdrop-blur-md">
                        <AlertCircle className="w-10 h-10 mx-auto text-white/20 mb-3" />
                        <p className="text-sm font-semibold text-white/60">No videos found</p>
                        <p className="text-xs text-white/40 max-w-xs mx-auto mt-1">
                          No records matched your search query or status filter selection.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* AUTOMATION SCHEDULER TAB VIEW */}
              {activeTab === 'scheduler' && (
                <motion.div
                  key="scheduler"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold font-display">Auto-Publish Scheduler Rules</h2>
                      <p className="text-xs text-white/40 mt-0.5">Automate downloads and republication from source channels by interval rules.</p>
                    </div>

                    <button 
                      onClick={() => {
                        handleCloseRuleForm();
                        setShowRuleForm(true);
                      }}
                      className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold shadow-lg shadow-white/5 hover:opacity-95 transition"
                    >
                      New Auto Rule
                    </button>
                  </div>

                  {/* Add automation rule collapsible modal card */}
                  <AnimatePresence>
                    {showRuleForm && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="glass-panel p-6 rounded-3xl mb-4 relative backdrop-blur-md">
                          <button onClick={handleCloseRuleForm} className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition">
                            <X className="w-4 h-4" />
                          </button>
                          <h3 className="text-md font-bold font-display mb-4">
                            {editingRuleId ? 'Edit Auto Ingest Rule' : 'Create Auto Ingest Rule'}
                          </h3>
                          
                          <form onSubmit={handleSaveRule} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-4">
                              <div>
                                <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1">Rule Name *</label>
                                <input type="text" required placeholder="e.g. Ingest Nature Channel" value={ruleName} onChange={e => setRuleName(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white" />
                              </div>
                              <div>
                                <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1">Source YouTube Channel URL *</label>
                                <input type="url" required placeholder="https://www.youtube.com/channel/UC..." value={ruleSourceUrl} onChange={e => setRuleSourceUrl(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white mb-4" />
                              </div>
                              {users.length > 0 && (
                                <div>
                                  <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1">Target Account</label>
                                  <select value={ruleTargetUserId} onChange={e => setRuleTargetUserId(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white bg-[#050508]/95">
                                    <option value="">Default (First Linked)</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.channelTitle || u.name}</option>)}
                                  </select>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1">Title Prefix (Optional)</label>
                                  <input type="text" placeholder="[LIVESTREAM] " value={rulePrefix} onChange={e => setRulePrefix(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white" />
                                </div>
                                <div>
                                  <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1">Title Suffix (Optional)</label>
                                  <input type="text" placeholder=" - 2026 Repost" value={ruleSuffix} onChange={e => setRuleSuffix(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white" />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1">Description Template</label>
                                <textarea rows={2} placeholder="Add custom footnotes or template metadata..." value={ruleDescTemplate} onChange={e => setRuleDescTemplate(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white" />
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1">Check Freq (Min)</label>
                                  <input type="number" required min={10} value={ruleInterval} onChange={e => setRuleInterval(Number(e.target.value))} className="w-full glass-input rounded-xl px-3 py-2.5 text-sm text-white" />
                                </div>
                                <div>
                                  <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1">Default Privacy</label>
                                  <select value={rulePrivacy} onChange={e => setRulePrivacy(e.target.value as any)} className="w-full glass-input rounded-xl px-3 py-2.5 text-sm text-white bg-[#050508]/95">
                                    <option value="private">Private</option>
                                    <option value="unlisted">Unlisted</option>
                                    <option value="public">Public</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1">Max Videos (1-15)</label>
                                  <input type="number" required min={1} max={15} value={ruleMaxLatestVideos || ''} onChange={e => setRuleMaxLatestVideos(Number(e.target.value))} className="w-full glass-input rounded-xl px-3 py-2.5 text-sm text-white" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1">Video tags (Comma separated)</label>
                                <input type="text" placeholder="auto-upload, republisher, archive" value={ruleTags} onChange={e => setRuleTags(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white" />
                              </div>
                              {settings?.geminiApiKey && (
                                <div className="flex items-center gap-2.5 py-2 px-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
                                  <input 
                                    type="checkbox" 
                                    id="ruleAutoOptimizeSeo"
                                    checked={ruleAutoOptimizeSeo}
                                    onChange={(e) => setRuleAutoOptimizeSeo(e.target.checked)}
                                    className="w-4 h-4 text-indigo-500 bg-white/5 border-white/10 rounded focus:ring-indigo-500 focus:ring-offset-0"
                                  />
                                  <label htmlFor="ruleAutoOptimizeSeo" className="text-xs font-semibold text-indigo-300 flex items-center gap-1 cursor-pointer select-none">
                                    <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
                                    Auto-Optimize Thumbnails & Predict CPS click rating for rules
                                  </label>
                                </div>
                              )}
                            </div>

                            <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-white/10">
                              <button type="button" onClick={handleCloseRuleForm} className="px-4 py-2 text-sm font-semibold rounded-xl text-white/80 hover:bg-white/10 transition">Cancel</button>
                              <button type="submit" disabled={isActionLoading} className="px-5 py-2 text-sm font-bold text-black rounded-xl bg-white hover:opacity-90 transition">
                                {isActionLoading ? 'Saving...' : (editingRuleId ? 'Update Rule' : 'Establish Rule')}
                              </button>
                            </div>
                          </form>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Rules Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {displayRules.map((rule) => (
                      <div key={rule.id} className="glass-panel p-6 rounded-3xl space-y-4 relative overflow-hidden group">
                        
                        {/* Interactive indicator gradient */}
                        <div className={`absolute top-0 left-0 w-full h-[3px] transition ${
                          rule.enabled ? 'bg-gradient-to-r from-blue-500/80 to-cyan-400/80' : 'bg-white/10'
                        }`} />

                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-white text-md tracking-tight">{rule.name}</h3>
                            <p className="text-3xs text-white/40 font-mono mt-0.5 max-w-sm truncate" title={rule.sourceChannelUrl}>
                              Channel URL: {rule.sourceChannelUrl}
                              {rule.targetUserId && (
                                <span className="mt-1 block text-3xs text-blue-400 font-mono">Target: {users.find(u => u.id === rule.targetUserId)?.channelTitle || "Unknown"}</span>
                              )}
                            </p>
                          </div>

                          {/* Rule Toggle Switch */}
                          <div className="flex items-center gap-2">
                            <span className={`text-3xs font-mono font-bold uppercase ${rule.enabled ? 'text-emerald-400' : 'text-white/30'}`}>
                              {rule.enabled ? 'Active' : 'Paused'}
                            </span>
                            <button
                              onClick={() => handleToggleRule(rule.id)}
                              className={`w-10 h-5.5 rounded-full p-0.5 transition-colors relative ${rule.enabled ? 'bg-blue-500' : 'bg-white/5 border border-white/10'}`}
                            >
                              <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform ${rule.enabled ? 'translate-x-4.5' : 'translate-x-0'}`} />
                            </button>
                          </div>
                        </div>

                        {/* Details parameters panel */}
                        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 text-3xs font-mono">
                          <div>
                            <p className="text-white/40 uppercase tracking-wide">Checks Every</p>
                            <p className="text-white/80 mt-0.5">{rule.intervalMinutes} Mins</p>
                          </div>
                          <div>
                            <p className="text-white/40 uppercase tracking-wide">Privacy</p>
                            <p className="text-white/80 mt-0.5 capitalize">{rule.privacyStatus}</p>
                          </div>
                          <div>
                            <p className="text-white/40 uppercase tracking-wide">Max Videos</p>
                            <p className="text-white/80 mt-0.5 font-bold text-cyan-400">{rule.maxLatestVideos || 4} latest</p>
                          </div>
                          <div>
                            <p className="text-white/40 uppercase tracking-wide">AI Auto SEO</p>
                            <p className="text-white/80 mt-0.5">{rule.autoOptimizeSeo ? 'Enabled ✨' : 'Disabled'}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-white/40 uppercase tracking-wide">Last check</p>
                            <p className="text-white/80 mt-0.5">
                              {rule.lastCheckedAt ? new Date(rule.lastCheckedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Never checked'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/10 pt-3">
                          <div className="flex flex-wrap gap-1">
                            {rule.tags.map((t, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-white/10 text-white/60 rounded text-3xs font-mono">
                                #{t}
                              </span>
                            ))}
                            {rule.tags.length === 0 && <span className="text-3xs text-white/30 font-mono">No tags configured</span>}
                          </div>

                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleStartEditRule(rule)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-400 transition text-3xs font-bold uppercase tracking-wider"
                              title="Edit rule"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </button>

                            <button
                              disabled={triggeringRuleId === rule.id}
                              onClick={() => handleTriggerRule(rule.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-3xs font-bold uppercase tracking-wider transition ${
                                triggeringRuleId === rule.id
                                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80 hover:text-white'
                              }`}
                              title="Refetch / Run rule now"
                            >
                              <RefreshCw className={`w-3 h-3 ${triggeringRuleId === rule.id ? 'animate-spin' : ''}`} />
                              {triggeringRuleId === rule.id ? 'Checking...' : 'Refetch'}
                            </button>

                            <button 
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-400 transition"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    ))}

                    {rules.length === 0 && (
                      <div className="glass-panel py-20 text-center text-white/40 rounded-3xl md:col-span-2 backdrop-blur-md">
                        <Sliders className="w-10 h-10 mx-auto text-white/20 mb-3" />
                        <p className="text-sm font-semibold text-white/60">No automation rules created</p>
                        <p className="text-xs text-white/40 max-w-xs mx-auto mt-1">
                          Create an automation rule to continuously scan a YouTube channel and import newly posted videos automatically.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* AUDIT LOGS TAB VIEW */}
              {activeTab === 'logs' && (
                <motion.div
                  key="logs"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold font-display">System Audit Logs</h2>
                      <p className="text-xs text-white/40 mt-0.5">Real-time system events logging, downloader subprocess activities, and re-upload progress diagnostics.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <Search className="w-4 h-4 text-white/40 absolute left-3 top-3" />
                        <input 
                          type="text" 
                          placeholder="Search log messages..."
                          value={logSearchQuery}
                          onChange={(e) => setLogSearchQuery(e.target.value)}
                          className="glass-input rounded-xl pl-9 pr-4 py-2 text-sm text-white w-56"
                        />
                      </div>

                      <select
                        value={logFilter}
                        onChange={(e) => setLogFilter(e.target.value)}
                        className="glass-input rounded-xl px-3 py-2 text-sm text-white bg-[#050508]/95"
                      >
                        <option value="all">All log levels</option>
                        <option value="success">Success</option>
                        <option value="info">Info</option>
                        <option value="warn">Warning</option>
                        <option value="error">Error</option>
                      </select>

                      <button
                        onClick={handleClearLogs}
                        className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-400 text-sm font-semibold transition"
                      >
                        Clear logs
                      </button>
                    </div>
                  </div>

                  {/* Terminal Console */}
                  <div className="glass-panel rounded-3xl p-6 font-mono text-xs overflow-hidden flex flex-col min-h-[500px] backdrop-blur-md">
                    <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-4 shrink-0 text-white/40">
                      <span className="w-3 h-3 rounded-full bg-red-500/60" />
                      <span className="w-3 h-3 rounded-full bg-amber-500/60" />
                      <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
                      <span className="ml-2 font-mono text-[10px] font-semibold text-white/40 tracking-wider">AUDIT_LOG_CONSOLE_V3.0.0</span>
                    </div>

                    <div className="space-y-3.5 overflow-y-auto pr-1 flex-grow max-h-[550px] scrollbar-thin">
                      {filteredLogs.map((log) => (
                        <div key={log.id} className="flex gap-4 items-start hover:bg-white/2 pt-1 pb-1 px-2 rounded-lg transition-colors">
                          <span className="text-white/30 text-[10px] shrink-0 pt-0.5 select-none font-medium">
                            {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                          </span>

                          <span className={`px-2 py-0.5 rounded text-4xs font-bold uppercase tracking-widest shrink-0 select-none ${
                            log.level === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 
                            log.level === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/25' : 
                            log.level === 'warn' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' : 
                            'bg-blue-500/10 text-blue-400 border border-blue-500/25'
                          }`}>
                            {log.level}
                          </span>

                          <div className="space-y-1">
                            <p className="text-white/80 leading-relaxed break-all font-medium">{log.message}</p>
                            {log.details && (
                              <p className="text-white/60 text-[10px] leading-relaxed font-normal bg-white/5 p-2 rounded border border-white/10 max-w-3xl overflow-x-auto whitespace-pre-wrap">{log.details}</p>
                            )}
                          </div>
                        </div>
                      ))}

                      {filteredLogs.length === 0 && (
                        <div className="py-20 text-center text-white/30 font-medium">
                          No logging events registered. Operational.
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* DEVELOPER SETTINGS TAB VIEW */}
              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                >
                  
                  {/* Left Column Settings Form */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel p-6 rounded-3xl relative backdrop-blur-md">
                      <h2 className="text-lg font-bold font-display mb-4 flex items-center gap-2">
                        <Database className="w-5 h-5 text-white/80" />
                        System Credentials & Parameters
                      </h2>

                      <form onSubmit={handleSaveSettings} className="space-y-6">
                        
                        {/* Google Developer Credentials block */}
                        <div className="space-y-4">
                          <h3 className="text-xs font-mono text-white/40 uppercase tracking-widest border-b border-white/10 pb-2">Google Developer OAuth App</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1.5">Google Client ID</label>
                              <input 
                                type="text" 
                                placeholder="Add Client ID from Google Cloud Console"
                                value={editClientId}
                                onChange={(e) => setEditClientId(e.target.value)}
                                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1.5">Google Client Secret</label>
                              <input 
                                type="text" 
                                placeholder="Add Client Secret"
                                value={editClientSecret}
                                onChange={(e) => setEditClientSecret(e.target.value)}
                                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        {/* System operational metrics */}
                        <div className="space-y-4 pt-2">
                          <h3 className="text-xs font-mono text-white/40 uppercase tracking-widest border-b border-white/10 pb-2">Worker Task Pipelines</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1.5">Max Concurrent Task Limit</label>
                              <input 
                                type="number" 
                                min={1} 
                                max={5}
                                value={editMaxConcurrent}
                                onChange={(e) => setEditMaxConcurrent(Number(e.target.value))}
                                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1.5">Max Auto Retry Attempts</label>
                              <input 
                                type="number" 
                                min={0} 
                                max={10}
                                value={editMaxRetries}
                                onChange={(e) => setEditMaxRetries(Number(e.target.value))}
                                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1.5">Auto Retry Cooldown (Mins)</label>
                              <input 
                                type="number" 
                                min={1} 
                                value={editRetryInterval}
                                onChange={(e) => setEditRetryInterval(Number(e.target.value))}
                                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1.5">Default Stream Download Quality</label>
                            <select
                              value={editQuality}
                              onChange={(e) => setEditQuality(e.target.value as any)}
                              className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white bg-[#050508]/95"
                            >
                              <option value="best">Best Available (Lossless Source)</option>
                              <option value="1080p">High Definition (1080p Max)</option>
                              <option value="720p">Standard HD (720p Recommended)</option>
                              <option value="480p">Low Resource (480p Fast)</option>
                            </select>
                          </div>
                        </div>

                        {/* YouTube Bot Bypass Credentials block */}
                        <div className="space-y-4 pt-2">
                          <h3 className="text-xs font-mono text-white/40 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            YouTube Bot-Detection Bypass (Optional)
                          </h3>
                          <p className="text-3xs text-white/40 leading-relaxed font-mono">
                            Use these options to bypass "Sign in to confirm you're not a bot" errors caused by hosting/cloud network rate-limits.
                          </p>
                          
                          <div>
                            <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1.5">YouTube Browser Cookies (Netscape Format)</label>
                            <textarea 
                              placeholder="# Netscape HTTP Cookie File&#10;.youtube.com&#10;..."
                              value={editYoutubeCookies}
                              onChange={(e) => setEditYoutubeCookies(e.target.value)}
                              rows={4}
                              className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-white/20"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1.5">YouTube PO Token</label>
                              <input 
                                type="text" 
                                placeholder="Proof of Origin Token (PO Token)"
                                value={editYoutubePoToken}
                                onChange={(e) => setEditYoutubePoToken(e.target.value)}
                                className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-white/20"
                              />
                            </div>
                            <div>
                              <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1.5">Visitor Data</label>
                              <input 
                                type="text" 
                                placeholder="Visitor Data parameter"
                                value={editYoutubeVisitorData}
                                onChange={(e) => setEditYoutubeVisitorData(e.target.value)}
                                className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-white/20"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Gemini API Settings */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-medium text-white/70 flex items-center space-x-2">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <span>AI Metadata Generation (Gemini)</span>
                          </h4>
                          <div className="space-y-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                            <div>
                              <label className="block text-3xs font-mono text-white/40 uppercase tracking-wider mb-1.5">Gemini API Key</label>
                              <input 
                                type="password" 
                                placeholder="AI Studio API Key"
                                value={editGeminiApiKey}
                                onChange={(e) => setEditGeminiApiKey(e.target.value)}
                                className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-white/20"
                              />
                              <p className="text-[10px] text-white/40 mt-1">Get your free key from Google AI Studio. Used for rewriting titles/descriptions automatically.</p>
                            </div>
                          </div>
                        </div>

                        <button 
                          type="submit"
                          disabled={isActionLoading}
                          className="w-full py-2.5 rounded-xl bg-white hover:opacity-90 text-black font-bold text-sm shadow-lg shadow-white/5 flex items-center justify-center gap-2 transition"
                        >
                          {isActionLoading && <Loader2 className="w-4 h-4 animate-spin text-black" />}
                          Save System credentials & settings
                        </button>

                      </form>
                    </div>
                  </div>

                  {/* Right Column: Copyable OAuth callbacks instructional guidelines */}
                  <div className="space-y-6">
                    
                    <div className="glass-panel p-6 rounded-3xl space-y-4 backdrop-blur-md">
                      <h3 className="font-semibold text-white flex items-center gap-2 border-b border-white/10 pb-2.5 text-md font-display">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        Google Console Configuration
                      </h3>

                      <p className="text-2xs text-white/40 leading-relaxed font-normal">
                        To republish videos securely to your own YouTube channel, you must configure a Google OAuth 2.0 Client credentials on your Google Developer project dashboard.
                      </p>

                      <div className="space-y-3.5">
                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                          <span className="block text-3xs font-mono text-white/40 uppercase tracking-widest">Authorized Redirect URI</span>
                          <div className="flex items-center justify-between gap-2.5">
                            <span className="font-mono text-xs text-white/80 truncate max-w-[210px] select-all">
                              {window.location.origin}/auth/callback
                            </span>
                            <button 
                              onClick={copyRedirectUri}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition"
                              title="Copy Callback URL"
                            >
                              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="text-2xs space-y-3 pl-1 font-normal text-white/40 leading-relaxed">
                          <p className="flex items-start gap-2">
                            <span className="w-4 h-4 bg-white/10 text-white/80 font-bold rounded-full flex items-center justify-center font-mono text-3xs pt-[1px] shrink-0 border border-white/10">1</span>
                            <span>Visit the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-white/80 hover:text-white underline inline-flex items-center gap-0.5">Google Cloud Credentials Console</a>.</span>
                          </p>
                          <p className="flex items-start gap-2">
                            <span className="w-4 h-4 bg-white/10 text-white/80 font-bold rounded-full flex items-center justify-center font-mono text-3xs pt-[1px] shrink-0 border border-white/10">2</span>
                            <span>Click **Create Credentials &gt; OAuth Client ID**. Select **Web Application** as application type.</span>
                          </p>
                          <p className="flex items-start gap-2">
                            <span className="w-4 h-4 bg-white/10 text-white/80 font-bold rounded-full flex items-center justify-center font-mono text-3xs pt-[1px] shrink-0 border border-white/10">3</span>
                            <span>Paste the **Authorized Redirect URI** from above into your Authorized Redirect URIs panel.</span>
                          </p>
                          <p className="flex items-start gap-2">
                            <span className="w-4 h-4 bg-white/10 text-white/80 font-bold rounded-full flex items-center justify-center font-mono text-3xs pt-[1px] shrink-0 border border-white/10">4</span>
                            <span>Add **YouTube Data API v3** in the Enabled APIs screen of your Google Cloud Project.</span>
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>

                </motion.div>
              )}

            </AnimatePresence>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-12 py-6 border-t border-white/10 text-center text-3xs text-white/30 font-mono tracking-wider">
          <p>© 2026 YOUTUBE AUTO REPUBLISHER SYSTEM INC. • ALL RIGHTS RESERVED • SECURED FOR AUTHORIZED CHANNELS ONLY</p>
        </footer>

        {/* AI Diagnostics & Troubleshooter Modal */}
        <AnimatePresence>
          {showDiagnosticModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDiagnosticModal(false)}
                className="absolute inset-0 bg-black/85 backdrop-blur-sm"
              />

              {/* Modal Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10 font-sans text-white"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/5 bg-slate-950/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-md font-bold text-white">AI Diagnostics & Troubleshooter</h3>
                      <p className="text-3xs font-mono text-purple-400 uppercase tracking-wider">Powered by Gemini AI Engine</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowDiagnosticModal(false)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                  {isDiagnosing ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                      <h4 className="text-sm font-semibold text-white/90">Analyzing Raw Downloader Logs</h4>
                      <p className="text-xs text-white/40 max-w-xs mt-1 leading-relaxed">
                        Gemini is inspecting the yt-dlp call stack trace, diagnosing IP rate-limits, and planning a self-healing strategy...
                      </p>
                    </div>
                  ) : diagnosticError ? (
                    <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-center space-y-3">
                      <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                      <h4 className="text-sm font-semibold text-red-200">Diagnostics Generation Failed</h4>
                      <p className="text-xs text-white/60">{diagnosticError}</p>
                      <button
                        onClick={() => handleDiagnoseVideo(diagnosingVideoId || '')}
                        className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition"
                      >
                        Retry Analysis
                      </button>
                    </div>
                  ) : diagnosticResult ? (
                    <div className="space-y-6">
                      {/* Error Banner Category */}
                      <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          diagnosticResult.errorType.includes('Block') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          diagnosticResult.errorType.includes('URL') ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-3xs font-mono font-bold uppercase tracking-wider text-purple-400">Error Category</span>
                          <h4 className="text-sm font-bold text-white mt-0.5">{diagnosticResult.errorType}</h4>
                        </div>
                      </div>

                      {/* Explanation */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50 font-mono">Analysis Explanation</h4>
                        <p className="text-sm text-white/80 leading-relaxed bg-white/2 p-4 rounded-2xl border border-white/5">
                          {diagnosticResult.explanation}
                        </p>
                      </div>

                      {/* Solution Summary */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50 font-mono">Recommended Fix</h4>
                        <p className="text-sm text-white/80 leading-relaxed bg-white/2 p-4 rounded-2xl border border-white/5">
                          {diagnosticResult.solution}
                        </p>
                      </div>

                      {/* Step-by-Step Action Steps */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50 font-mono">Step-by-Step Instructions</h4>
                        <div className="space-y-3 pl-1">
                          {diagnosticResult.steps.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <span className="w-5 h-5 bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold rounded-full flex items-center justify-center font-mono text-3xs shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="text-sm text-white/70 leading-relaxed">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shortcut Actions */}
                      <div className="border-t border-white/5 pt-5 flex flex-wrap items-center justify-end gap-3">
                        {diagnosticResult.canSolveByCookies && (
                          <button
                            onClick={() => {
                              setShowDiagnosticModal(false);
                              setActiveTab('settings');
                            }}
                            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition active:scale-95 animate-bounce"
                          >
                            Go Configure Session Cookies
                          </button>
                        )}
                        {diagnosticResult.canSolveByMock && (
                          <button
                            onClick={() => {
                              setShowDiagnosticModal(false);
                              setActiveTab('queue');
                              setShowManualForm(true);
                              setManualUrl('watch?v=mock_video_demo');
                              setManualTitle('Sample Test Video');
                              setManualDesc('Running a test using our mock downloader bypass.');
                            }}
                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition active:scale-95"
                          >
                            Use Mock Video for Testing
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (diagnosingVideoId) handleRetryVideo(diagnosingVideoId);
                            setShowDiagnosticModal(false);
                          }}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition active:scale-95"
                        >
                          Force Retry Pipeline
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  </div>
  );
}
