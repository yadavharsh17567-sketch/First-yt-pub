import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn, execSync, spawnSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { AppState, User, Video, ScheduleRule, AuditLog, SystemSettings } from './src/types.js';

dotenv.config();



function sanitizeDescriptionText(desc: string): string {
  if (!desc) return '';
  return desc
    .replace(/Auto-republished from source channel\.?/gi, '')
    .replace(/^\s*\n+/g, '') // remove leading newlines and spacing
    .trim();
}

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function sanitizeAndTruncateTitle(title: string): string {
  let decoded = decodeHtmlEntities(title || '').trim();
  decoded = decoded.replace(/\s+/g, ' ');
  if (decoded.length > 100) {
    decoded = decoded.substring(0, 100).trim();
  }
  return decoded;
}

async function rewriteWithGemini(apiKey, originalTitle, originalDescription) {
  console.log(`[Gemini] Starting rewrite for: "${originalTitle}"`);
  const cleanDescription = sanitizeDescriptionText(originalDescription);
  try {
    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    
    const isShorts = originalTitle.toLowerCase().includes('#shorts') || cleanDescription.toLowerCase().includes('#shorts');
    const prompt = `Rewrite the following YouTube video title and description to be more engaging, professional, and optimized for maximum reach and virality. 
IMPORTANT: 
1. The title MUST be catchy. If it's a short video (hint: ${isShorts ? 'Yes' : 'Maybe'}), definitely include #shorts in the title.
2. The title MUST be strictly 100 characters or less (including #shorts). Truncation at 100 characters is a hard limit in YouTube API.
3. The description MUST ALWAYS include a dedicated block of popular hashtags at the very end. This block MUST include at least: #shorts, #viral, #trending, #foryou, #fyp, #explore, #reels, #instareels, #youtube, #viralvideo. 
4. Add other relevant niche hashtags based on the content.
5. CRITICAL: DO NOT include any automated attribution, watermarks, or meta statements like "Auto-republished from source channel" or "republished" in the rewritten description. Keep it fully focused on the content itself.
Return ONLY a JSON object with "title" and "description" keys.

Original Title: ${originalTitle}
Original Description: ${cleanDescription || 'None'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "description"]
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      console.log(`[Gemini] Rewrite successful: "${parsed.title}"`);
      return {
        title: sanitizeAndTruncateTitle(parsed.title || originalTitle),
        description: sanitizeDescriptionText(parsed.description || cleanDescription)
      };
    }
    console.warn('[Gemini] No text returned from response.');
  } catch (error) {
    console.error('[Gemini] API rewrite failed:', error);
  }
  return { title: sanitizeAndTruncateTitle(originalTitle), description: cleanDescription };
}

// Generates an SEO ranking thumbnail using Gemini Image generation, and predicts click metrics (CPS / CTR)
async function generateSeoThumbnailAndPredictCps(apiKey: string, videoId: string, title: string, description: string) {
  console.log(`[SEO Engine] Starting SEO thumbnail generation and CPS prediction for video: "${title}"`);
  
  const ai = new GoogleGenAI({ 
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  const THUMBNAILS_DIR = path.join(process.cwd(), 'downloads', 'thumbnails');
  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
  }

  let finalThumbnailUrl = '';
  let localThumbnailPath = '';
  let generatedImageBase64 = '';

  // 1. Generate SEO-optimized Thumbnail Image via Gemini Image Generation model
  try {
    const imagePrompt = `A high-impact, professional, highly saturated YouTube video thumbnail graphic design. Vibrant colors, high contrast, clear focal subject, visually engaging composition, designed for maximum click-through rate. Style: modern digital art, high visual energy, clickbait-optimized. Topic/Title: "${title}". Description/Theme: "${description.substring(0, 200)}".`;
    
    console.log(`[SEO Engine] Requesting thumbnail generation...`);
    const imgResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [{ text: imagePrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    if (imgResponse.candidates?.[0]?.content?.parts) {
      for (const part of imgResponse.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          generatedImageBase64 = part.inlineData.data;
          break;
        }
      }
    }

    if (generatedImageBase64) {
      const fileName = `${videoId}.png`;
      localThumbnailPath = path.join(THUMBNAILS_DIR, fileName);
      fs.writeFileSync(localThumbnailPath, Buffer.from(generatedImageBase64, 'base64'));
      finalThumbnailUrl = `/seo_thumbnails/${fileName}`;
      console.log(`[SEO Engine] Thumbnail generated and saved successfully to ${localThumbnailPath}`);
    } else {
      console.warn(`[SEO Engine] No image parts returned. Falling back to Unsplash stock asset.`);
    }
  } catch (error) {
    console.error(`[SEO Engine] Image generation failed:`, error);
  }

  // Fallback to high-quality Unsplash image if generation failed or wasn't active
  if (!finalThumbnailUrl) {
    const topics = [
      'trending', 'viral', 'gaming', 'tech', 'coding', 'podcast', 'lofi', 'motivation'
    ];
    const matchingTopic = topics.find(t => title.toLowerCase().includes(t)) || 'motivation';
    finalThumbnailUrl = `https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=640&auto=format&fit=crop&q=80`;
    console.log(`[SEO Engine] Using fallback high-quality stock thumbnail: ${finalThumbnailUrl}`);
  }

  // 2. Predict Click-per-second (CPS) and Click-Through-Rate (CTR) via Gemini Text model
  let cpsPrediction: any = {
    score: 85,
    ctr: 8.4,
    level: 'High 🚀' as const,
    tips: [
      'The current title is highly engaging but could use more mystery.',
      'Add high-contrast, bold 3-word text overlay to the thumbnail to increase click interest.',
      'The description is well-tagged; ensure hashtags remain in the bottom section.'
    ],
    tagsSuggestions: ['repost', 'viral', 'trend', 'foryou']
  };

  try {
    const predictionPrompt = `Analyze the potential SEO performance, click-through rate (CTR), and clicks-per-second (CPS) prediction for the following YouTube video.
    Return a detailed evaluation.
    
    Video Title: "${title}"
    Video Description: "${description}"
    Thumbnail Generated: ${generatedImageBase64 ? 'Yes (AI generated vibrant 16:9 visual)' : 'No (Using stock video image)'}
    
    Determine:
    1. A SEO Clickability Score (score: integer from 0 to 100).
    2. Predicted Click-Through Rate (ctr: float/number from 0.0 to 25.0%).
    3. Click Performance Level (level: string; must be exactly one of: "Viral 🔥", "High 🚀", "Good ✅", "Average 📊", "Poor ⚠️" depending on predicted CTR: Viral is >9%, High is 6.5-9%, Good is 4.5-6.5%, Average is 2.5-4.5%, Poor is <2.5%).
    4. 3 specific, actionable, highly professional tips to improve the title, thumbnail layout, or tags (tips: array of strings).
    5. 4 highly searched, relevant tags/keywords to include for maximum search reach (tagsSuggestions: array of strings).
    
    Format the output strictly as a JSON object matching the requested schema.`;

    console.log(`[SEO Engine] Requesting click prediction analysis...`);
    const predictionResponse = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: predictionPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            ctr: { type: Type.NUMBER },
            level: { type: Type.STRING },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            tagsSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["score", "ctr", "level", "tips", "tagsSuggestions"]
        }
      }
    });

    if (predictionResponse.text) {
      const parsed = JSON.parse(predictionResponse.text.trim());
      // Validate level format
      let levelValue = parsed.level;
      if (!levelValue.includes('🔥') && !levelValue.includes('🚀') && !levelValue.includes('✅') && !levelValue.includes('📊') && !levelValue.includes('⚠️')) {
        if (parsed.ctr >= 9) levelValue = 'Viral 🔥';
        else if (parsed.ctr >= 6.5) levelValue = 'High 🚀';
        else if (parsed.ctr >= 4.5) levelValue = 'Good ✅';
        else if (parsed.ctr >= 2.5) levelValue = 'Average 📊';
        else levelValue = 'Poor ⚠️';
      }
      
      cpsPrediction = {
        score: Number(parsed.score) || 80,
        ctr: Number(parsed.ctr) || 7.5,
        level: levelValue as any,
        tips: parsed.tips || [],
        tagsSuggestions: parsed.tagsSuggestions || []
      };
      console.log(`[SEO Engine] Predicted CTR: ${cpsPrediction.ctr}%, Performance: ${cpsPrediction.level}`);
    }
  } catch (error) {
    console.error(`[SEO Engine] Prediction analysis failed:`, error);
  }

  return {
    seoThumbnailUrl: finalThumbnailUrl,
    localThumbnailPath: localThumbnailPath || undefined,
    cpsPrediction
  };
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const cleanEnv = Object.assign({}, process.env);
delete cleanEnv.http_proxy;
delete cleanEnv.https_proxy;
delete cleanEnv.HTTP_PROXY;
delete cleanEnv.HTTPS_PROXY;

const DB_PATH = path.join(process.cwd(), 'db.json');
const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads');

// Ensure directories exist
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

const THUMBNAILS_DIR = path.join(DOWNLOADS_DIR, 'thumbnails');
if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

// Initial default state
const initialSettings: SystemSettings = {
  googleClientId: process.env.OAUTH_CLIENT_ID || '',
  googleClientSecret: process.env.OAUTH_CLIENT_SECRET || '',
  maxConcurrentUploads: 1,
  maxRetries: 3,
  autoRetryIntervalMinutes: 5,
  downloadQuality: '1080p',
};

const defaultState: AppState = {
  users: [],
  videos: [],
  processedVideoIds: [],
  scheduleRules: [],
  logs: [],
  settings: initialSettings,
};

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// Database helper functions (Synchronous to prevent race conditions during express requests)
function readDb(): AppState {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultState, null, 2), 'utf-8');
      return defaultState;
    }
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    const state = JSON.parse(content) as AppState;
    
    // Ensure settings contain keys from env if settings are empty
    if (!state.settings) {
      state.settings = initialSettings;
    }
    if (!state.processedVideoIds) {
      state.processedVideoIds = [];
    }
    if (!state.settings.googleClientId && process.env.OAUTH_CLIENT_ID) {
      state.settings.googleClientId = process.env.OAUTH_CLIENT_ID;
    }
    if (!state.settings.googleClientSecret && process.env.OAUTH_CLIENT_SECRET) {
      state.settings.googleClientSecret = process.env.OAUTH_CLIENT_SECRET;
    }
    
    return state;
  } catch (err) {
    console.error('Failed to read db.json:', err);
    return defaultState;
  }
}

function writeDb(state: AppState): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write db.json:', err);
  }
}

function isVideoAlreadyProcessed(url: string, title?: string): boolean {
  const state = readDb();
  const targetId = extractVideoId(url);
  
  // 1. Check against processedVideoIds
  if (targetId && state.processedVideoIds?.includes(targetId)) {
    return true;
  }
  
  // 2. Check active videos in the queue (including completed ones still listed)
  const matchInQueue = state.videos.some(v => {
    const vId = extractVideoId(v.sourceUrl);
    if (targetId && vId && targetId === vId) return true;
    if (v.sourceUrl === url) return true;
    if (title && v.title.toLowerCase().trim() === title.toLowerCase().trim()) return true;
    return false;
  });
  if (matchInQueue) return true;
  
  return false;
}

function addLog(level: 'info' | 'warn' | 'error' | 'success', message: string, details?: string): void {
  const state = readDb();
  const log: AuditLog = {
    id: Math.random().toString(36).substring(2, 9),

    timestamp: new Date().toISOString(),
    level,
    message,
    details,
  };
  state.logs.unshift(log);
  // Keep last 500 logs to avoid file bloating
  if (state.logs.length > 500) {
    state.logs = state.logs.slice(0, 500);
  }
  writeDb(state);
  console.log(`[${level.toUpperCase()}] ${message} ${details ? `(${details})` : ''}`);
}

function ensureYtDlpInstalled(localYtDlp: string): boolean {
  try {
    // 1. Check if it already exists and is valid
    if (fs.existsSync(localYtDlp)) {
      const check = spawnSync('python3', [localYtDlp, '--version']);
      if (check.status === 0) {
        return true;
      }
      addLog('warn', `Local yt-dlp is corrupted or non-functional. Reinstalling...`);
    }

    const tmpPath = localYtDlp + '.tmp';
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch {}
    }

    addLog('info', `Downloading clean yt-dlp...`);
    // Attempt download using wget, fallback to curl
    try {
      execSync(`wget -q https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O "${tmpPath}"`, { stdio: 'ignore' });
    } catch {
      try {
        execSync(`curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o "${tmpPath}"`, { stdio: 'ignore' });
      } catch (err: any) {
        addLog('error', `Download command failed: ${err.message}`);
        return false;
      }
    }

    // 2. Verify downloaded file integrity
    if (fs.existsSync(tmpPath)) {
      const checkTmp = spawnSync('python3', [tmpPath, '--version']);
      if (checkTmp.status === 0) {
        if (fs.existsSync(localYtDlp)) {
          try { fs.unlinkSync(localYtDlp); } catch {}
        }
        fs.renameSync(tmpPath, localYtDlp);
        try {
          execSync(`chmod +x "${localYtDlp}"`, { stdio: 'ignore' });
        } catch {}
        addLog('success', `Successfully installed verified yt-dlp locally.`);
        return true;
      } else {
        addLog('error', `Downloaded yt-dlp failed integrity check. Status: ${checkTmp.status}`);
        try { fs.unlinkSync(tmpPath); } catch {}
      }
    }
  } catch (err: any) {
    addLog('error', `Error installing yt-dlp: ${err.message}`);
  }
  return false;
}

function probeVideo(filePath: string): Promise<{ valid: boolean; duration: number; error?: string }> {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) {
      return resolve({ valid: false, duration: 0, error: 'File does not exist on disk' });
    }
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return resolve({ valid: false, duration: 0, error: 'File size is 0 bytes' });
    }

    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ]);

    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        return resolve({
          valid: false,
          duration: 0,
          error: `ffprobe error code ${code}: ${stderr.trim()}`
        });
      }
      const duration = parseFloat(stdout.trim());
      if (isNaN(duration) || duration <= 0) {
        return resolve({
          valid: false,
          duration: 0,
          error: `Duration is invalid or <= 0: ${stdout.trim()}`
        });
      }
      resolve({ valid: true, duration });
    });

    ffprobe.on('error', (err) => {
      resolve({
        valid: false,
        duration: 0,
        error: `Failed to spawn ffprobe: ${err.message}`
      });
    });
  });
}

function remuxToMp4(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    addLog('info', `Executing ffmpeg remux...`, `Input: ${inputPath} -> Output: ${outputPath}`);
    
    // First try standard quick copy remuxing
    const ffmpeg = spawn('ffmpeg', ['-y', '-i', inputPath, '-c', 'copy', outputPath]);
    
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        resolve();
      } else {
        addLog('warn', `ffmpeg copy remux failed, retrying with full re-encoding... Error: ${stderr.trim()}`);
        
        // Full re-encoding fallback
        const ffmpegFull = spawn('ffmpeg', [
          '-y',
          '-i', inputPath,
          '-c:v', 'libx264',
          '-preset', 'superfast',
          '-crf', '28',
          '-c:a', 'aac',
          outputPath
        ]);
        
        let stderrFull = '';
        ffmpegFull.stderr.on('data', (data) => {
          stderrFull += data.toString();
        });
        
        ffmpegFull.on('close', (codeFull) => {
          if (codeFull === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
            resolve();
          } else {
            reject(new Error(`ffmpeg full encoding failed. Code: ${codeFull}. Stderr: ${stderrFull}`));
          }
        });
        
        ffmpegFull.on('error', (err) => {
          reject(err);
        });
      }
    });
    
    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const THUMBNAILS_DIR = path.join(process.cwd(), 'downloads', 'thumbnails');
  app.use('/seo_thumbnails', express.static(THUMBNAILS_DIR));

  // Log server startup
  addLog('info', 'YouTube Auto Republisher server starting up...');

  // Async initialization checks
  (async () => {
    // 1. Verify ffmpeg availability
    let ffmpegExists = false;
    try {
      const checkFm = spawn('ffmpeg', ['-version']);
      await new Promise((resolve) => {
        checkFm.on('close', (code) => {
          ffmpegExists = (code === 0);
          resolve(null);
        });
        checkFm.on('error', () => {
          ffmpegExists = false;
          resolve(null);
        });
      });
    } catch (e) {
      ffmpegExists = false;
    }

    if (ffmpegExists) {
      addLog('success', 'System Verification: ffmpeg is available and verified.');
    } else {
      addLog('warn', 'System Verification WARNING: ffmpeg is NOT installed or not in PATH. Format merging may fail.');
    }

    // 2. Verify yt-dlp availability
    const localYtDlp = path.join(process.cwd(), 'yt-dlp');
    
    const isInstalled = fs.existsSync(localYtDlp);
    
    const ytDlpCmd = isInstalled ? localYtDlp : 'yt-dlp';
    const ytExe = isInstalled ? 'python3' : 'yt-dlp';
    const ytExeArgs = isInstalled ? [localYtDlp] : [];
    
    let ytDlpExists = isInstalled;
    let ytDlpError = '';
    
    if (!ytDlpExists) {
      try {
        const checkYt = spawn(ytExe, [...ytExeArgs, '--version'], { env: cleanEnv });

        await new Promise((resolve) => {
          checkYt.on('close', (code) => {
            ytDlpExists = (code === 0);
            if (code !== 0) ytDlpError = `Exit code ${code}`;
            resolve(null);
          });
          checkYt.on('error', (err) => {
            ytDlpExists = false;
            ytDlpError = err.message;
            resolve(null);
          });
        });
      } catch (e: any) {
        ytDlpExists = false;
        ytDlpError = e.message;
      }
    }

    if (ytDlpExists) {
      addLog('success', `System Verification: yt-dlp is available (via ${ytDlpCmd}).`);
    } else {
      addLog('error', `System Verification ERROR: yt-dlp is not available. Cmd: ${ytDlpCmd}. Error: ${ytDlpError}`);
    }
  })().catch(err => {
    console.error('Initialization verification checks failed:', err);
  });

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      env: process.env.NODE_ENV, 
      timestamp: new Date().toISOString(),
      dbExists: fs.existsSync(DB_PATH)
    });
  });

  // API: Get App State
  app.get('/api/state', (req, res) => {
    const state = readDb();
    // Do not return raw secrets to the client-side UI
    const safeSettings = {
      ...state.settings,
      googleClientSecret: state.settings.googleClientSecret ? '••••••••' : '',
      geminiApiKey: state.settings.geminiApiKey ? '••••••••' : '',
    };
    res.json({
      users: state.users,
      videos: state.videos,
      scheduleRules: state.scheduleRules,
      logs: state.logs,
      settings: safeSettings,
    });
  });

  // API: Save Settings
  app.post('/api/settings', (req, res) => {
    const state = readDb();
    const { 
      googleClientId, 
      googleClientSecret, 
      maxConcurrentUploads, 
      maxRetries, 
      autoRetryIntervalMinutes, 
      downloadQuality,
      youtubeCookies,
      youtubePoToken,
      youtubeVisitorData,
      geminiApiKey
    } = req.body;
    
    // If the client secret is '••••••••', it means the user did not change the existing stored secret
    const updatedSecret = googleClientSecret === '••••••••' 
      ? state.settings.googleClientSecret 
      : googleClientSecret;
      
    const updatedGemini = geminiApiKey === '••••••••'
      ? state.settings.geminiApiKey
      : geminiApiKey;

    state.settings = {
      googleClientId: googleClientId || '',
      googleClientSecret: updatedSecret || '',
      maxConcurrentUploads: Number(maxConcurrentUploads) || 1,
      maxRetries: Number(maxRetries) || 3,
      autoRetryIntervalMinutes: Number(autoRetryIntervalMinutes) || 5,
      downloadQuality: downloadQuality || '720p',
      youtubeCookies: youtubeCookies !== undefined ? youtubeCookies : state.settings.youtubeCookies,
      youtubePoToken: youtubePoToken !== undefined ? youtubePoToken : state.settings.youtubePoToken,
      youtubeVisitorData: youtubeVisitorData !== undefined ? youtubeVisitorData : state.settings.youtubeVisitorData,
      geminiApiKey: updatedGemini || '',
    };

    writeDb(state);
    addLog('success', 'System settings updated successfully.');
    res.json({ success: true, settings: state.settings });
  });

  // API: Google OAuth Auth URL builder
  app.get('/api/auth/url', (req, res) => {
    const state = readDb();
    const clientId = state.settings.googleClientId;
    
    if (!clientId) {
      return res.status(400).json({ error: 'Google Client ID is not configured. Please add it in settings.' });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const actualOrigin = `${protocol}://${host}`;
    const redirectUri = `${req.query.origin || actualOrigin || process.env.APP_URL || 'http://localhost:3000'}/auth/callback`;
    
    addLog('info', `Constructed Auth URL with Redirect URI: ${redirectUri}`);

    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    });

    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  });

  // API: Handle Authorization Token Exchange
  app.post('/api/auth/callback-token', async (req, res) => {
    const state = readDb();
    const { code, origin } = req.body;
    const clientId = state.settings.googleClientId;
    const clientSecret = state.settings.googleClientSecret;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is missing.' });
    }
    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'OAuth credentials are not configured in settings.' });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const actualOrigin = `${protocol}://${host}`;
    const redirectUri = `${origin || actualOrigin || process.env.APP_URL || 'http://localhost:3000'}/auth/callback`;

    try {
      addLog('info', 'Exchanging authorization code for Google access tokens...');
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokens = await tokenResponse.json();
      const accessToken = tokens.access_token;
      const refreshToken = tokens.refresh_token; // may not always be present on re-auth unless prompt=consent is used
      const expiresIn = tokens.expires_in || 3600;
      const tokenExpiry = Date.now() + expiresIn * 1000;

      // Fetch User Info
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await userResponse.json();

      // Fetch YouTube Channel info
      const ytResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      let channelId = '';
      let channelTitle = '';
      let channelThumbnail = '';

      if (ytResponse.ok) {
        const ytData = await ytResponse.json();
        if (ytData.items && ytData.items.length > 0) {
          const item = ytData.items[0];
          channelId = item.id;
          channelTitle = item.snippet.title;
          channelThumbnail = item.snippet.thumbnails?.default?.url || '';
        }
      }

      // Find or create user
      let user = state.users.find(u => u.email === profile.email);
      if (!user) {
        user = {
          id: profile.id || Math.random().toString(36).substring(2, 9),
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          accessToken,
          refreshToken: refreshToken || '',
          tokenExpiry,
          channelId,
          channelTitle,
          channelThumbnail,
        };
        state.users.push(user);
      } else {
        user.name = profile.name;
        user.picture = profile.picture;
        user.accessToken = accessToken;
        if (refreshToken) user.refreshToken = refreshToken;
        user.tokenExpiry = tokenExpiry;
        user.channelId = channelId;
        user.channelTitle = channelTitle;
        user.channelThumbnail = channelThumbnail;
      }

      writeDb(state);
      addLog('success', `Linked YouTube Channel "${channelTitle || user.name}" (${user.email}) successfully.`);
      res.json({ success: true, user });
    } catch (err: any) {
      addLog('error', 'Google OAuth authorization code exchange failed', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // API: Disconnect User Account
  app.post('/api/auth/disconnect', (req, res) => {
    const state = readDb();
    const { userId } = req.body;
    
    const userIndex = state.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      const u = state.users[userIndex];
      state.users.splice(userIndex, 1);
      writeDb(state);
      addLog('info', `Disconnected account: ${u.email}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'User account not found' });
    }
  });

  // API: Manual Add Video to Queue
  app.post('/api/videos/add', async (req, res) => {
    const state = readDb();
    const { sourceUrl, title, description, tags, privacyStatus, targetUserId, autoOptimizeSeo } = req.body;

    const sourceUrlTrimmed = (sourceUrl || '').trim();
    if (!sourceUrlTrimmed) {
      return res.status(400).json({ error: 'Source video URL is required and cannot be empty.' });
    }

    if (isVideoAlreadyProcessed(sourceUrlTrimmed, title)) {
      return res.status(400).json({ error: 'This video has already been uploaded, processed, or is currently in the queue.' });
    }

    let hostName = 'Unknown Source';
    try {
      hostName = new URL(sourceUrlTrimmed).hostname;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format. Please provide a fully qualified URL starting with http:// or https://' });
    }

    // Try to extract some quick title if not provided
    let displayTitle = title;
    let thumbnailUrl = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=120&auto=format&fit=crop&q=60';
    
    if (hostName.includes('youtube.com') || hostName.includes('youtu.be')) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(sourceUrlTrimmed)}&format=json`;
        const oembedRes = await fetch(oembedUrl);
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          if (oembedData.title && !displayTitle) {
            displayTitle = oembedData.title;
          }
          if (oembedData.thumbnail_url) {
            thumbnailUrl = oembedData.thumbnail_url;
          }
        }
      } catch (err) {
        console.error('Failed to fetch oembed title', err);
      }
    }
    
    if (!displayTitle) {
      displayTitle = `Manual Video Queue (${hostName})`;
    }
    
    let finalTitle = displayTitle;
    let finalDescription = sanitizeDescriptionText(description || `🔥 Thanks for watching!

If you enjoyed this Short, don't forget to 👍 Like, 💬 Comment, and 🔔 Subscribe for more amazing content every day.

New Shorts uploaded regularly—stay tuned!

#shorts #viral #trending #fyp #youtube #entertainment`);
    
    let isRewritten = false;
    if (state.settings.geminiApiKey) {
      const rewritten = await rewriteWithGemini(state.settings.geminiApiKey, displayTitle, finalDescription);
      finalTitle = rewritten.title;
      finalDescription = rewritten.description;
      isRewritten = true;
      addLog('info', `Rewrote video title using Gemini AI: "${finalTitle}"`);
    }
    
    const newVideo: Video = {
      id: Math.random().toString(36).substring(2, 9),
      targetUserId,
      sourceUrl: sourceUrlTrimmed,
      title: sanitizeAndTruncateTitle(finalTitle),
      description: finalDescription,
      thumbnailUrl: thumbnailUrl,
      status: 'queued',
      progress: 0,
      retryCount: 0,
      maxRetries: state.settings.maxRetries || 3,
      queuedAt: new Date().toISOString(),
      privacyStatus: privacyStatus || 'private',
      tags: tags || [],
      isRewritten,
      autoOptimizeSeo: !!autoOptimizeSeo
    };

    if (autoOptimizeSeo && state.settings.geminiApiKey) {
      try {
        const seoData = await generateSeoThumbnailAndPredictCps(state.settings.geminiApiKey, newVideo.id, finalTitle, finalDescription);
        newVideo.seoThumbnailUrl = seoData.seoThumbnailUrl;
        newVideo.localThumbnailPath = seoData.localThumbnailPath;
        newVideo.cpsPrediction = seoData.cpsPrediction;
        newVideo.thumbnailUrl = seoData.seoThumbnailUrl;
        if (seoData.cpsPrediction.tagsSuggestions?.length > 0) {
          newVideo.tags = Array.from(new Set([...newVideo.tags, ...seoData.cpsPrediction.tagsSuggestions]));
        }
        addLog('success', `Direct Upload Auto-SEO Completed! CTR Click Prediction: ${seoData.cpsPrediction.ctr}%`);
      } catch (seoErr) {
        console.error('Direct upload auto SEO optimization failed:', seoErr);
      }
    }

    state.videos.unshift(newVideo);
    writeDb(state);
    addLog('success', `Added video to download queue: "${newVideo.title}"`);
    res.json({ success: true, video: newVideo });
  });

  // API: Delete Video from Library
  app.post('/api/videos/delete', (req, res) => {
    const state = readDb();
    const { videoId } = req.body;

    const videoIndex = state.videos.findIndex(v => v.id === videoId);
    if (videoIndex !== -1) {
      const v = state.videos[videoIndex];
      
      // Clean up files
      if (v.localPath && fs.existsSync(v.localPath)) {
        try {
          fs.unlinkSync(v.localPath);
        } catch (e) {
          console.error('Failed to delete downloaded file:', e);
        }
      }

      state.videos.splice(videoIndex, 1);
      
      const vId = extractVideoId(v.sourceUrl);
      if (vId && !state.processedVideoIds.includes(vId)) {
        state.processedVideoIds.push(vId);
      }
      
      writeDb(state);
      addLog('info', `Removed video from database: "${v.title}"`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Video not found.' });
    }
  });

  // API: Force Manual Retry for Video
  app.post('/api/videos/retry', (req, res) => {
    const state = readDb();
    const { videoId } = req.body;

    const v = state.videos.find(x => x.id === videoId);
    if (v) {
      v.status = 'queued';
      v.progress = 0;
      v.retryCount = 0;
      v.error = undefined;
      writeDb(state);
      addLog('info', `Manually retrying video: "${v.title}"`);
      res.json({ success: true, video: v });
    } else {
      res.status(404).json({ error: 'Video not found.' });
    }
  });

  // API: AI Diagnostics & Troubleshooter
  app.post('/api/videos/ai-diagnose', async (req, res) => {
    const state = readDb();
    const { videoId } = req.body;

    const v = state.videos.find(x => x.id === videoId);
    if (!v) {
      return res.status(404).json({ error: 'Video not found.' });
    }

    const errorMsg = v.error || 'No error details recorded. The system indicates a generic pipeline disruption.';
    const sourceUrl = v.sourceUrl || '';

    // Step 1: Detect if we have Gemini configured, use it for customized smart troubleshooting
    const apiKey = state.settings.geminiApiKey || process.env.GEMINI_API_KEY;
    let diagnosisResult = null;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ 
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const prompt = `You are an expert AI system diagnostic agent for a YouTube video replication/download server running yt-dlp.
We encountered a download error for the following video:
Video URL: ${sourceUrl}
Raw Error Log:
${errorMsg}

Analyze this raw error and categorize it into one of these types:
- "Rate Limit / IP Block" (for HTTP 403 Forbidden, Sign-in required, or bot verification blocks)
- "Invalid URL" (unsupported url, bad video id)
- "Private Video" (deleted, private, or age-restricted)
- "Generic Error" (any other network or internal error)

Provide:
1. A clear, friendly explanation of why this error happened.
2. A list of actionable, clear, step-by-step instructions of how the user can fix it (e.g. if it's an IP block, explain how they can copy cookies from their browser or use a different public/mock video).
3. Set the 'canSolveByCookies' boolean flag to true if pasting cookies or PO Token will bypass this.
4. Set the 'canSolveByMock' boolean flag to true if this is for testing and they should use watch?v=mock_video.

Return ONLY a JSON object that matches this schema:
{
  "errorType": "Rate Limit / IP Block" | "Invalid URL" | "Private Video" | "Generic Error",
  "explanation": "text",
  "solution": "text",
  "steps": ["step 1", "step 2", "step 3"],
  "canSolveByCookies": true,
  "canSolveByMock": true
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                errorType: { type: Type.STRING },
                explanation: { type: Type.STRING },
                solution: { type: Type.STRING },
                steps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                canSolveByCookies: { type: Type.BOOLEAN },
                canSolveByMock: { type: Type.BOOLEAN }
              },
              required: ["errorType", "explanation", "solution", "steps", "canSolveByCookies", "canSolveByMock"]
            }
          }
        });

        if (response.text) {
          diagnosisResult = JSON.parse(response.text.trim());
        }
      } catch (err) {
        console.error('[AI Diagnostics] Gemini diagnostic generation failed, falling back to local diagnostics rules:', err);
      }
    }

    // Step 2: Fallback to local rule-based diagnostics if Gemini is offline or not configured
    if (!diagnosisResult) {
      const errLower = errorMsg.toLowerCase();
      if (errLower.includes('403') || errLower.includes('forbidden') || errLower.includes('sign in') || errLower.includes('confirm you are not a bot') || errLower.includes('rate limit') || errLower.includes('too many requests')) {
        diagnosisResult = {
          errorType: 'Rate Limit / IP Block',
          explanation: 'YouTube has detected that this cloud server is automated and has temporarily blocked or rate-limited our server\'s IP address. This is a very common defense mechanism by YouTube against public hosting environments.',
          solution: 'To bypass this, you need to provide your personal YouTube session cookies or configured PO Token credentials in the settings panel so the server can authenticates request as a real browser.',
          steps: [
            'Install a browser extension like "Get cookies.txt" in Chrome or Firefox.',
            'Navigate to YouTube while signed into your account and export your cookies in Netscape format.',
            'Open the Settings tab in this app, scroll down to YouTube Session Credentials, and paste the cookies text.',
            'Click "Save Settings" and force-retry the download pipeline!'
          ],
          canSolveByCookies: true,
          canSolveByMock: true
        };
      } else if (errLower.includes('unsupported url') || errLower.includes('invalid') || errLower.includes('regex') || (!sourceUrl.includes('youtube.com') && !sourceUrl.includes('youtu.be'))) {
        diagnosisResult = {
          errorType: 'Invalid URL',
          explanation: 'The source URL provided does not seem to be a valid or supported YouTube video. yt-dlp is unable to locate any stream content for this address.',
          solution: 'Please verify the URL format. Make sure it is a valid public YouTube watch link, short link, or shorts link.',
          steps: [
            'Copy the URL directly from your web browser address bar.',
            'Ensure the URL looks like: https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID.',
            'Test downloading the video using the "Mock Video Generator" by entering "watch?v=mock_video" as the URL to test full end-to-end features without real downloads.'
          ],
          canSolveByCookies: false,
          canSolveByMock: true
        };
      } else if (errLower.includes('private') || errLower.includes('deleted') || errLower.includes('removed') || errLower.includes('age restricted') || errLower.includes('sign-in required')) {
        diagnosisResult = {
          errorType: 'Private / Restricted Video',
          explanation: 'The video is private, deleted, or restricted by YouTube (such as age restrictions or geo-blocking).',
          solution: 'Make sure the video is public and viewable without restrictions. If it is restricted, providing authenticated YouTube cookies in settings might bypass it.',
          steps: [
            'Open the YouTube link in an incognito window to verify if it is publicly viewable.',
            'If it is age-restricted or member-only, export your authenticated cookies and paste them in the Settings tab.',
            'Alternatively, replace it with a public video link.'
          ],
          canSolveByCookies: true,
          canSolveByMock: false
        };
      } else {
        diagnosisResult = {
          errorType: 'System Pipeline Issue',
          explanation: `An unexpected issue was encountered during the yt-dlp download execution stream. Raw response: "${errorMsg.slice(0, 150)}..."`,
          solution: 'This might be a temporary network hiccup or a glitch in the downloader utility executable.',
          steps: [
            'Click the "Force Retry" button on the video card to queue the pipeline again.',
            'Check the Audit Logs tab to see full network debugging streams.',
            'Ensure the server settings are saved properly.'
          ],
          canSolveByCookies: false,
          canSolveByMock: true
        };
      }
    }

    addLog('info', `AI diagnostics completed for video "${v.title}". Result: ${diagnosisResult.errorType}`);
    res.json({ success: true, diagnosis: diagnosisResult });
  });

  // API: Manual Optimize SEO and Generate Best Thumbnail with Click Prediction
  app.post('/api/videos/optimize-seo', async (req, res) => {
    const state = readDb();
    const { videoId } = req.body;

    const video = state.videos.find(v => v.id === videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found.' });
    }

    if (!state.settings.geminiApiKey) {
      return res.status(400).json({ error: 'Gemini API key is not configured. Please configure it in settings to enable SEO generation and click predictions.' });
    }

    try {
      addLog('info', `Manual trigger: Generating SEO thumbnail and CPS prediction for video: "${video.title}"`);
      const seoData = await generateSeoThumbnailAndPredictCps(state.settings.geminiApiKey, video.id, video.title, video.description);

      video.seoThumbnailUrl = seoData.seoThumbnailUrl;
      video.localThumbnailPath = seoData.localThumbnailPath;
      video.cpsPrediction = seoData.cpsPrediction;
      video.thumbnailUrl = seoData.seoThumbnailUrl; // replace current thumbnail with AI-optimized thumbnail
      video.autoOptimizeSeo = true;

      if (seoData.cpsPrediction.tagsSuggestions?.length > 0) {
        video.tags = Array.from(new Set([...video.tags, ...seoData.cpsPrediction.tagsSuggestions]));
      }

      writeDb(state);
      addLog('success', `SEO Optimization completed for "${video.title}". Score: ${seoData.cpsPrediction.score}/100, Predicted CTR: ${seoData.cpsPrediction.ctr}%`);
      res.json({ success: true, video });
    } catch (err: any) {
      addLog('error', `SEO Optimization failed for "${video.title}": ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // API: Add Auto-Scheduler Rule
  app.post('/api/rules/add', (req, res) => {
    const state = readDb();
    const { name, sourceChannelUrl, titlePrefix, titleSuffix, descriptionTemplate, tags, privacyStatus, intervalMinutes, targetUserId, autoOptimizeSeo, maxLatestVideos } = req.body;

    if (!name || !sourceChannelUrl) {
      return res.status(400).json({ error: 'Name and Source Channel URL are required.' });
    }

    const maxVideosVal = Number(maxLatestVideos);
    const validatedMaxVideos = !isNaN(maxVideosVal) ? Math.min(15, Math.max(1, maxVideosVal)) : 4;

    const newRule: ScheduleRule = {
      id: Math.random().toString(36).substring(2, 9),
      targetUserId,
      name,
      sourceChannelUrl,
      titlePrefix: titlePrefix || '',
      titleSuffix: titleSuffix || '',
      descriptionTemplate: descriptionTemplate || '',
      tags: tags || [],
      privacyStatus: privacyStatus || 'private',
      intervalMinutes: Number(intervalMinutes) || 120,
      enabled: true,
      autoOptimizeSeo: !!autoOptimizeSeo,
      maxLatestVideos: validatedMaxVideos
    };

    state.scheduleRules.push(newRule);
    writeDb(state);
    addLog('success', `Created automatic scheduling rule: "${newRule.name}"`, `monitoring: ${newRule.sourceChannelUrl}`);
    res.json({ success: true, rule: newRule });
  });

  // API: Edit/Update Scheduling Rule
  app.post('/api/rules/edit', (req, res) => {
    const state = readDb();
    const { id, name, sourceChannelUrl, titlePrefix, titleSuffix, descriptionTemplate, tags, privacyStatus, intervalMinutes, targetUserId, autoOptimizeSeo, maxLatestVideos } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Rule ID is required.' });
    }

    const r = state.scheduleRules.find(x => x.id === id);
    if (!r) {
      return res.status(404).json({ error: 'Rule not found.' });
    }

    if (!name || !sourceChannelUrl) {
      return res.status(400).json({ error: 'Name and Source Channel URL are required.' });
    }

    const maxVideosVal = Number(maxLatestVideos);
    const validatedMaxVideos = !isNaN(maxVideosVal) ? Math.min(15, Math.max(1, maxVideosVal)) : 4;

    r.name = name;
    r.sourceChannelUrl = sourceChannelUrl;
    r.titlePrefix = titlePrefix || '';
    r.titleSuffix = titleSuffix || '';
    r.descriptionTemplate = descriptionTemplate || '';
    r.tags = tags || [];
    r.privacyStatus = privacyStatus || 'private';
    r.intervalMinutes = Number(intervalMinutes) || 120;
    r.targetUserId = targetUserId;
    r.autoOptimizeSeo = !!autoOptimizeSeo;
    r.maxLatestVideos = validatedMaxVideos;

    writeDb(state);
    addLog('success', `Updated scheduling rule: "${r.name}"`);
    res.json({ success: true, rule: r });
  });

  // API: Toggle Scheduling Rule (Enable/Disable)
  app.post('/api/rules/toggle', (req, res) => {
    const state = readDb();
    const { ruleId } = req.body;

    const r = state.scheduleRules.find(x => x.id === ruleId);
    if (r) {
      r.enabled = !r.enabled;
      writeDb(state);
      addLog('info', `Scheduling rule "${r.name}" has been ${r.enabled ? 'ENABLED' : 'DISABLED'}.`);
      res.json({ success: true, rule: r });
    } else {
      res.status(404).json({ error: 'Rule not found.' });
    }
  });

  // API: Delete Scheduling Rule
  app.post('/api/rules/delete', (req, res) => {
    const state = readDb();
    const { ruleId } = req.body;

    const index = state.scheduleRules.findIndex(x => x.id === ruleId);
    if (index !== -1) {
      const r = state.scheduleRules[index];
      state.scheduleRules.splice(index, 1);
      writeDb(state);
      addLog('info', `Deleted scheduling rule: "${r.name}"`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Rule not found.' });
    }
  });

  // API: Manually Trigger / Refetch Scheduling Rule
  app.post('/api/rules/trigger', async (req, res) => {
    const { ruleId } = req.body;
    if (!ruleId) {
      return res.status(400).json({ error: 'Rule ID is required.' });
    }

    try {
      const addedCount = await executeSingleRule(ruleId);
      res.json({ success: true, addedCount });
    } catch (err: any) {
      console.error('Manual rule trigger error:', err);
      res.status(500).json({ error: err.message || 'Failed to trigger rule check.' });
    }
  });

  // API: Clear Audit Logs
  app.get('/api/logs/clear', (req, res) => {
    const state = readDb();
    state.logs = [];
    writeDb(state);
    addLog('info', 'System audit logs cleared.');
    res.json({ success: true });
  });

  // Google OAuth redirect callback endpoint (handles visual flow and sends postMessage to opener window)
  app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
    const { code, error } = req.query;
    
    if (error) {
      return res.send(`
        <html>
          <body style="background-color: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0;">
            <div style="background-color: rgba(30, 41, 59, 0.7); backdrop-filter: blur(8px); padding: 2rem; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.4); text-align: center; max-width: 450px;">
              <h2 style="color: #ef4444; margin-top: 0;">Authentication Error</h2>
              <p>${error}</p>
              <button onclick="window.close()" style="background-color: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 1rem;">Close Window</button>
            </div>
          </body>
        </html>
      `);
    }

    res.send(`
      <html>
        <body style="background-color: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0;">
          <div style="background-color: rgba(30, 41, 59, 0.7); backdrop-filter: blur(8px); padding: 2.5rem; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); text-align: center; max-width: 450px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <div style="border: 4px solid #3b82f6; border-top: 4px solid transparent; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 1.5rem auto;"></div>
            <h2 style="color: #3b82f6; margin-top: 0; font-weight: 500;">Completing Connection...</h2>
            <p style="color: #94a3b8; font-size: 0.95rem;">Successfully authenticated with Google. Sending secure tokens back to the dashboard. Please wait...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', code: '${code}' }, '*');
              // Give the opener tab a brief moment to capture the event before closing
              setTimeout(() => { window.close(); }, 800);
            } else {
              // Fallback
              window.location.href = '/?code=${code}';
            }
          </script>
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </body>
      </html>
    `);
  });

  // Refresh token helper
  async function refreshUserTokenIfNeeded(user: User): Promise<string> {
    if (Date.now() < user.tokenExpiry - 300 * 1000) {
      // Token is still valid for at least 5 minutes
      return user.accessToken;
    }

    const state = readDb();
    const clientId = state.settings.googleClientId;
    const clientSecret = state.settings.googleClientSecret;

    if (!user.refreshToken) {
      throw new Error(`Refresh token is missing for user ${user.email}. Please re-authenticate.`);
    }
    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth settings are not fully configured to perform automatic token refresh.');
    }

    addLog('info', `Refreshing Google Access Token for account: ${user.email}...`);

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: user.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google rejected the token refresh request: ${text}`);
    }

    const data = await response.json();
    const newAccessToken = data.access_token;
    const expiresIn = data.expires_in || 3600;

    // Persist new token
    const liveState = readDb();
    const liveUser = liveState.users.find(u => u.id === user.id);
    if (liveUser) {
      liveUser.accessToken = newAccessToken;
      liveUser.tokenExpiry = Date.now() + expiresIn * 1000;
      writeDb(liveState);
    }
    
    // Also update current thread user ref
    user.accessToken = newAccessToken;
    user.tokenExpiry = Date.now() + expiresIn * 1000;

    addLog('success', `Google Access Token refreshed successfully for: ${user.email}`);
    return newAccessToken;
  }

  // CORE TASK WORKERS: Download Execution & YouTube Resumable Uploading
  let isTaskWorkerRunning = false;

  async function runTaskWorker() {
    if (isTaskWorkerRunning) return;
    isTaskWorkerRunning = true;

    try {
      const state = readDb();
      
      // 1. Resolve Interrupted downloads or uploads
      const runningDownloads = state.videos.filter(v => v.status === 'downloading');
      const runningUploads = state.videos.filter(v => v.status === 'uploading');

      // Check if we exceed our concurrent execution limits (default is 1 active task)
      if (runningDownloads.length + runningUploads.length >= state.settings.maxConcurrentUploads) {
        isTaskWorkerRunning = false;
        return;
      }

      // 2. Look for downloaded videos that need uploading
      const pendingUpload = state.videos.find(v => v.status === 'downloaded');
      if (pendingUpload && runningUploads.length < state.settings.maxConcurrentUploads) {
        // Pick linked Google User
        const linkedUser = pendingUpload.targetUserId ? state.users.find(u => u.id === pendingUpload.targetUserId) : state.users[0];
        if (!linkedUser) {
          addLog('warn', `Upload deferred for "${pendingUpload.title}": No Google YouTube account is linked.`);
        } else {
          // Trigger asynchronous upload
          executeYouTubeUpload(pendingUpload.id, linkedUser.id).catch(err => {
            console.error('Asynchronous upload worker crashed:', err);
          });
        }
      }

      // 3. Look for queued videos that need downloading
      const nextToDownload = state.videos.find(v => v.status === 'queued');
      if (nextToDownload && runningDownloads.length < state.settings.maxConcurrentUploads) {
        executeVideoDownload(nextToDownload.id).catch(err => {
          console.error('Asynchronous download worker crashed:', err);
        });
      }

    } catch (err: any) {
      console.error('Task worker iteration failed:', err);
    } finally {
      isTaskWorkerRunning = false;
    }
  }

  // Helper to find a working public proxy to bypass YouTube's scraper bot block
  async function findWorkingProxy(videoUrl: string): Promise<string | null> {
    addLog('info', 'Searching for a working proxy to bypass YouTube download blocks...');
    try {
      const res = await fetch('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=yes&anonymity=anonymous,elite', {
        signal: AbortSignal.timeout(6000)
      });
      const text = await res.text();
      const rawProxies = text.split(/\r?\n/).map(p => p.trim()).filter(p => p.includes(':'));
      
      if (rawProxies.length === 0) {
        addLog('warn', 'No proxies returned from public proxy list API.');
        return null;
      }
      
      addLog('info', `Fetched ${rawProxies.length} proxies. Testing up to 12 proxies in small parallel batches to prevent container CPU throttling...`);
      
      const localYtDlp = path.join(process.cwd(), 'yt-dlp');
      const ytDlpCmd = fs.existsSync(localYtDlp) ? localYtDlp : 'yt-dlp';
      const ytExe = ytDlpCmd === 'yt-dlp' ? 'yt-dlp' : 'python3';
      const ytExeArgs = ytDlpCmd === 'yt-dlp' ? [] : [ytDlpCmd];

      const testProxy = async (proxy: string): Promise<string | null> => {
        return new Promise((resolve) => {
          let resolved = false;
          const dlp = spawn(ytExe, [
            ...ytExeArgs,
            '--js-runtimes', 'node',
            '--proxy', `http://${proxy}`,
            '--simulate',
            videoUrl
          ], { env: cleanEnv });
          
          let isBlocked = false;
          dlp.stderr.on('data', (data) => {
            const str = data.toString();
            if (str.includes('Sign in to confirm you’re not a bot') || str.includes('Sign in to confirm you\'re not a bot')) {
              isBlocked = true;
            }
          });
          
          dlp.on('close', (code) => {
            if (!resolved) {
              resolved = true;
              if (code === 0 && !isBlocked) {
                resolve(proxy);
              } else {
                resolve(null);
              }
            }
          });

          dlp.on('error', (err) => {
            if (!resolved) {
              resolved = true;
              resolve(null);
            }
          });
          
          // Timeout after 10 seconds
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              try {
                dlp.kill();
              } catch (e) {}
              resolve(null);
            }
          }, 10000);
        });
      };

      // Batch size of 4 to prevent CPU overload
      const batchSize = 4;
      const maxToTest = 12;
      for (let i = 0; i < maxToTest; i += batchSize) {
        const batch = rawProxies.slice(i, i + batchSize);
        if (batch.length === 0) break;

        addLog('info', `Testing proxy batch: ${batch.join(', ')}...`);
        const results = await Promise.all(batch.map(p => testProxy(p)));
        const workingProxy = results.find(r => r !== null);
        if (workingProxy) {
          addLog('success', `Found working bypass proxy: http://${workingProxy}`);
          return workingProxy;
        }
      }
      
      addLog('warn', 'All tested public proxies yielded no working proxy. Falling back to direct download.');
      return null;
    } catch (err: any) {
      addLog('warn', `Proxy retrieval or testing failed: ${err.message}. Falling back to direct download.`);
      return null;
    }
  }

  // Download video from URL with yt-dlp
  async function executeVideoDownload(videoId: string) {
    const state = readDb();
    const video = state.videos.find(v => v.id === videoId);
    if (!video) return;

    // Trigger Gemini Rewrite if enabled and not already done
    if (state.settings.geminiApiKey && !video.isRewritten) {
      try {
        addLog('info', `Background task: Rewriting metadata for "${video.title}" using Gemini AI...`);
        const rewritten = await rewriteWithGemini(state.settings.geminiApiKey, video.title, video.description);
        video.title = sanitizeAndTruncateTitle(rewritten.title);
        video.description = rewritten.description;
        video.isRewritten = true;
        writeDb(state);
      } catch (rewriteErr) {
        console.error('Background rewrite failed:', rewriteErr);
      }
    } else {
      const sanitized = sanitizeAndTruncateTitle(video.title);
      if (sanitized !== video.title) {
        video.title = sanitized;
        writeDb(state);
      }
    }

    const sourceUrlTrimmed = (video.sourceUrl || '').trim();
    if (!sourceUrlTrimmed) {
      handleDownloadFailure(state, video, 'Rejected download: Source URL is empty.');
      return;
    }

    video.status = 'downloading';
    video.progress = 0;
    writeDb(state);

    // Simulated mock download pipeline to prevent real yt-dlp binary calls on sandbox/mock URLs
    if (sourceUrlTrimmed.includes('watch?v=mock') || video.id.startsWith('mock') || video.title.toLowerCase().includes('mock')) {
      addLog('info', `[Mock Simulator] Detected mock/sandbox video URL: ${sourceUrlTrimmed}. Simulating download pipeline...`);
      const mockFilePath = path.join(DOWNLOADS_DIR, `${video.id}.mp4`);
      if (!fs.existsSync(DOWNLOADS_DIR)) {
        fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
      }
      fs.writeFileSync(mockFilePath, 'MOCK_VIDEO_DATA_BUFFER');

      let currentProgress = 0;
      const interval = setInterval(() => {
        const currentDb = readDb();
        const activeVideo = currentDb.videos.find(v => v.id === videoId);
        if (!activeVideo || activeVideo.status !== 'downloading') {
          clearInterval(interval);
          return;
        }

        currentProgress += 25;
        if (currentProgress < 100) {
          activeVideo.progress = currentProgress;
          writeDb(currentDb);
        } else {
          clearInterval(interval);
          activeVideo.progress = 100;
          activeVideo.status = 'downloaded';
          activeVideo.localPath = mockFilePath;
          activeVideo.fileSize = '0.5 MB';
          writeDb(currentDb);
          addLog('success', `[Mock Simulator] Finished simulated download of "${activeVideo.title}". (Simulated success)`);
        }
      }, 1000);
      return;
    }
    
    // Log exact URL being downloaded and show in Audit Logs before download starts
    addLog('info', `[Audit] Preparing to download video stream from source URL: ${sourceUrlTrimmed}`);
    console.log(`[DOWNLOAD_START] Initiating download of video ID: ${videoId} with URL: ${sourceUrlTrimmed}`);

    // Ensure downloads directory exists
    if (!fs.existsSync(DOWNLOADS_DIR)) {
      fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    }

    const outputPath = path.join(DOWNLOADS_DIR, `${video.id}.mp4`);
    video.localPath = outputPath;
    
    // Resolve yt-dlp executable path
    const localYtDlp = path.join(process.cwd(), 'yt-dlp');
    const isInstalled = fs.existsSync(localYtDlp);
    
    const ytDlpCmd = isInstalled ? localYtDlp : 'yt-dlp';
    const ytExe = isInstalled ? 'python3' : 'yt-dlp';
    const ytExeArgs = isInstalled ? [localYtDlp] : [];
    
    let ytDlpExists = isInstalled;
    let ytDlpError = '';
    
    if (!ytDlpExists) {
      try {
        const check = spawn(ytExe, [...ytExeArgs, '--version'], { env: cleanEnv });

        await new Promise((resolve) => {
          check.on('close', (code) => {
            ytDlpExists = (code === 0);
            if (code !== 0) ytDlpError = `Exit code ${code}`;
            resolve(null);
          });
          check.on('error', (err) => {
            ytDlpExists = false;
            ytDlpError = err.message;
            resolve(null);
          });
        });
      } catch (e: any) {
        ytDlpExists = false;
        ytDlpError = e.message;
      }
    }

    if (!ytDlpExists) {
      const errorMsg = `yt-dlp downloader is not available or executable on this server. Cmd: ${ytDlpCmd}, Error: ${ytDlpError}`;
      addLog('error', `CRITICAL ERROR: ${errorMsg}`);
      handleDownloadFailure(state, video, errorMsg);
      return;
    }

    // Try to find a working proxy only if we don't have cookies or PO token, to avoid unstable proxy connections
    let workingProxy: string | null = null;
    const hasCookies = state.settings.youtubeCookies && state.settings.youtubeCookies.trim().length > 0;
    const hasPoToken = state.settings.youtubePoToken && state.settings.youtubePoToken.trim().length > 0;
    
    if (!hasCookies && !hasPoToken) {
       workingProxy = await findWorkingProxy(sourceUrlTrimmed);
    }

    const baseCmd = ytExe;
    const baseArgsPrefix: string[] = [...ytExeArgs];

    addLog('info', `Executing real yt-dlp download via ${baseCmd}...`, `Source URL: ${sourceUrlTrimmed}`);
    
    // Select quality argument
    const qualitySetting = state.settings.downloadQuality || '1080p';
    let formatArg = 'bestvideo+bestaudio/best';
    
    if (qualitySetting === '1080p') {
      formatArg = 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best';
    } else if (qualitySetting === '720p') {
      formatArg = 'bestvideo[height<=720]+bestaudio/best[height<=720]/best';
    } else if (qualitySetting === '480p') {
      formatArg = 'bestvideo[height<=480]+bestaudio/best[height<=480]/best';
    } else if (qualitySetting === 'best') {
      formatArg = 'bestvideo+bestaudio/best';
    }

    const ytDlpArgs = [
      ...baseArgsPrefix,
      '--js-runtimes', 'node',
      '-f', formatArg,
      '--merge-output-format', 'mp4',
      '-o', outputPath,
      '--newline',
      '--no-playlist',
      '--no-cache-dir'
    ];

    if (workingProxy) {
      ytDlpArgs.push('--proxy', `http://${workingProxy}`);
    }

    let cookieFilePath = '';
    if (state.settings.youtubeCookies && state.settings.youtubeCookies.trim()) {
      try {
        cookieFilePath = path.join(DOWNLOADS_DIR, `cookies_${videoId}.txt`);
        fs.writeFileSync(cookieFilePath, state.settings.youtubeCookies.trim(), 'utf8');
        ytDlpArgs.push('--cookies', cookieFilePath);
        addLog('info', `Configured yt-dlp to use custom cookies provided in system settings.`);
      } catch (cookieErr: any) {
        addLog('warn', `Failed to write temporary cookies file: ${cookieErr.message}`);
      }
    }

    let hasCustomExtractorArgs = false;
    if (state.settings.youtubePoToken && state.settings.youtubePoToken.trim()) {
      const visitorData = state.settings.youtubeVisitorData || '';
      const poToken = state.settings.youtubePoToken.trim();
      let extractorArg = `youtube:po_token=web+${poToken}`;
      if (visitorData.trim()) {
        extractorArg += `;visitor_data=${visitorData.trim()}`;
      }
      ytDlpArgs.push('--extractor-args', extractorArg);
      hasCustomExtractorArgs = true;
      addLog('info', `Configured yt-dlp to use custom PO Token credentials provided in system settings.`);
    }

    // Redundant fallback: If no proxy was found, no custom PO Token was defined, and no cookies are provided, default to player_client=ios
    if (!workingProxy && !hasCustomExtractorArgs && !cookieFilePath) {
      ytDlpArgs.push('--extractor-args', 'youtube:player_client=ios');
      addLog('info', `Using player_client=ios as standard bot-bypass fallback.`);
    }

    ytDlpArgs.push(sourceUrlTrimmed);

    const dlpProcess = spawn(baseCmd, ytDlpArgs, { env: cleanEnv });

    const cleanupCookieFile = () => {
      if (cookieFilePath && fs.existsSync(cookieFilePath)) {
        try {
          fs.unlinkSync(cookieFilePath);
        } catch (e) {
          console.error('Failed to clean up cookie file:', e);
        }
      }
    };

    let stderrAccumulator = '';
    dlpProcess.stdout.on('data', (data) => {
      const line = data.toString().trim();
      const match = line.match(/\[download\]\s+(\d+\.\d+)%/);
      if (match) {
        const progress = parseFloat(match[1]);
        const currentDb = readDb();
        const activeVideo = currentDb.videos.find(v => v.id === videoId);
        if (activeVideo && activeVideo.status === 'downloading') {
          activeVideo.progress = Math.round(progress);
          writeDb(currentDb);
        }
      }
    });

    dlpProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderrAccumulator += chunk;
      console.error(`yt-dlp error output: ${chunk}`);
    });

    dlpProcess.on('close', async (code) => {
      cleanupCookieFile();
      const finalDb = readDb();
      const activeVideo = finalDb.videos.find(v => v.id === videoId);
      if (!activeVideo) return;

      // Verify if file exists, or if download had alternative format/extension
      let resolvedPath = outputPath;
      let fileExists = fs.existsSync(outputPath);

      if (!fileExists) {
        try {
          const files = fs.readdirSync(DOWNLOADS_DIR);
          const matchedFile = files.find(f => f.startsWith(videoId));
          if (matchedFile) {
            resolvedPath = path.join(DOWNLOADS_DIR, matchedFile);
            fileExists = true;
            addLog('info', `Resolved alternative download file format successfully: ${matchedFile}`);
          }
        } catch (e) {
          console.error('Failed to search downloads directory:', e);
        }
      }

      if (code === 0 && fileExists) {
        const stats = fs.statSync(resolvedPath);
        const sizeMb = (stats.size / (1024 * 1024)).toFixed(1);
        
        activeVideo.localPath = resolvedPath;
        activeVideo.status = 'downloaded';
        activeVideo.progress = 100;
        activeVideo.fileSize = `${sizeMb} MB`;
        writeDb(finalDb);
        addLog('success', `Finished downloading "${activeVideo.title}". File size: ${sizeMb} MB.`);
      } else {
        const fullErrorLog = stderrAccumulator.trim();
        let errorMsg = `yt-dlp failed with exit code: ${code}. Error details: ${fullErrorLog}`;
        if (stderrAccumulator.toLowerCase().includes("confirm you’re not a bot") || stderrAccumulator.toLowerCase().includes("confirm you're not a bot")) {
          errorMsg = "YouTube bot block active: 'Sign in to confirm you're not a bot'. Please configure valid YouTube cookies or PO Token/Visitor Data in settings.";
        }
        addLog('error', `yt-dlp Error Output for URL [${sourceUrlTrimmed}]: ${fullErrorLog}`);
        handleDownloadFailure(finalDb, activeVideo, errorMsg);
      }
    });

    dlpProcess.on('error', async (err) => {
      cleanupCookieFile();
      const finalDb = readDb();
      const activeVideo = finalDb.videos.find(v => v.id === videoId);
      if (activeVideo) {
        addLog('error', `Failed to spawn yt-dlp process for URL [${sourceUrlTrimmed}]: ${err.message}`);
        handleDownloadFailure(finalDb, activeVideo, `Failed to spawn yt-dlp: ${err.message}`);
      }
    });
  }

  function handleDownloadFailure(db: AppState, video: Video, errorMsg: string) {
    video.status = 'failed';
    video.error = errorMsg;
    video.retryCount += 1;
    writeDb(db);
    addLog('error', `Failed to download video "${video.title}": ${errorMsg}`);
  }

  // Real Resumable Google YouTube Upload Integration
  async function executeYouTubeUpload(videoId: string, userId: string) {
    const state = readDb();
    const video = state.videos.find(v => v.id === videoId);
    const user = state.users.find(u => u.id === userId);

    if (!video || !user) return;

    video.status = 'uploading';
    video.progress = 0;
    writeDb(state);

    // Simulated mock upload pipeline for sandbox/mock URLs to bypass real API validation
    if (video.sourceUrl.includes('watch?v=mock') || video.id.startsWith('mock') || video.title.toLowerCase().includes('mock')) {
      addLog('info', `[Mock Simulator] Detected mock/sandbox video upload. Simulating YouTube API upload flow for "${video.title}"...`);
      
      let currentProgress = 0;
      const interval = setInterval(() => {
        const currentDb = readDb();
        const activeVideo = currentDb.videos.find(v => v.id === videoId);
        if (!activeVideo || activeVideo.status !== 'uploading') {
          clearInterval(interval);
          return;
        }

        currentProgress += 20;
        if (currentProgress < 100) {
          activeVideo.progress = currentProgress;
          writeDb(currentDb);
        } else {
          clearInterval(interval);
          activeVideo.progress = 100;
          activeVideo.status = 'completed';
          activeVideo.youtubeId = `yt_mock_${Math.random().toString(36).substring(2, 9)}`;
          activeVideo.completedAt = new Date().toISOString();
          const vId = extractVideoId(activeVideo.sourceUrl);
          if (vId && !currentDb.processedVideoIds.includes(vId)) {
            currentDb.processedVideoIds.push(vId);
          }
          writeDb(currentDb);
          addLog('success', `[Mock Simulator] Successfully uploaded "${activeVideo.title}" to YouTube! Video ID: ${activeVideo.youtubeId} (Simulated success)`);
        }
      }, 1000);
      return;
    }

    addLog('info', `Initializing resumable YouTube upload for "${video.title}" to channel "${user.channelTitle || user.name}"...`);

    let finalPath = video.localPath || '';
    let validatedPath = '';

    try {
      // 1. Prepare/Refresh access token
      const accessToken = await refreshUserTokenIfNeeded(user);

      // Ensure downloads directory exists
      if (!fs.existsSync(DOWNLOADS_DIR)) {
        fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
      }

      // Check alternative filenames starting with videoId in case localPath was lost/incorrect
      let fileExists = finalPath ? fs.existsSync(finalPath) : false;

      if (!fileExists && fs.existsSync(DOWNLOADS_DIR)) {
        const files = fs.readdirSync(DOWNLOADS_DIR);
        const matchedFile = files.find(f => f.startsWith(videoId));
        if (matchedFile) {
          finalPath = path.join(DOWNLOADS_DIR, matchedFile);
          fileExists = true;
          video.localPath = finalPath;
          writeDb(state);
          addLog('info', `Corrected upload file path to resolved path: ${finalPath}`);
        }
      }

      // 2. Validate and remux video file
      addLog('info', `Validating video file with ffprobe... Path: ${finalPath}`);
      if (!fileExists || !finalPath) {
        throw new Error(`Downloaded video file was not found on disk. Please re-queue the video.`);
      }

      let stats = fs.statSync(finalPath);
      if (stats.size === 0) {
        throw new Error(`Downloaded video file exists but is empty (0 bytes).`);
      }

      const initialValidation = await probeVideo(finalPath);
      addLog('info', `Initial ffprobe validation result: ${JSON.stringify(initialValidation)}`);

      validatedPath = finalPath;

      if (!initialValidation.valid) {
        addLog('warn', `Initial video validation failed: ${initialValidation.error}. Attempting to remux to a valid MP4 using ffmpeg...`);
        const remuxedPath = path.join(DOWNLOADS_DIR, `${video.id}_remuxed.mp4`);
        try {
          await remuxToMp4(finalPath, remuxedPath);
          const remuxedValidation = await probeVideo(remuxedPath);
          addLog('info', `Remuxed video validation result: ${JSON.stringify(remuxedValidation)}`);
          if (!remuxedValidation.valid) {
            throw new Error(`Remuxed video is still invalid: ${remuxedValidation.error}`);
          }
          validatedPath = remuxedPath;
          stats = fs.statSync(validatedPath);
          addLog('success', `Successfully remuxed video to valid MP4.`);
        } catch (remuxError: any) {
          throw new Error(`Video validation failed and ffmpeg remuxing could not recover it. Error: ${remuxError.message}`);
        }
      } else {
        // If it is valid but not a .mp4 extension, let's remux it to MP4 container to guarantee YouTube compatibility
        const isMp4 = finalPath.toLowerCase().endsWith('.mp4');
        if (!isMp4) {
          addLog('info', `Video is valid but not in MP4 format. Remuxing to MP4 container...`);
          const remuxedPath = path.join(DOWNLOADS_DIR, `${video.id}_remuxed.mp4`);
          try {
            await remuxToMp4(finalPath, remuxedPath);
            const remuxedValidation = await probeVideo(remuxedPath);
            if (!remuxedValidation.valid) {
              throw new Error(`Remuxed MP4 video is invalid: ${remuxedValidation.error}`);
            }
            validatedPath = remuxedPath;
            stats = fs.statSync(validatedPath);
            addLog('success', `Successfully remuxed non-MP4 video to standard MP4 container.`);
          } catch (remuxError: any) {
            throw new Error(`Failed to remux video to MP4 container: ${remuxError.message}`);
          }
        }
      }

      const fileSize = stats.size;
      addLog('info', `Validation passed! Final upload path: ${validatedPath}, Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB.`);

      // 3. Initiate Google Resumable Session
      const safeTitle = sanitizeAndTruncateTitle(video.title);
      const safeDescription = decodeHtmlEntities(video.description || '');

      if (video.title !== safeTitle || video.description !== safeDescription) {
        video.title = safeTitle;
        video.description = safeDescription;
        writeDb(state);
      }

      const metadata = {
        snippet: {
          title: safeTitle,
          description: safeDescription,
          tags: video.tags,
          categoryId: '22', // default People & Blogs
        },
        status: {
          privacyStatus: video.privacyStatus || 'private',
          selfDeclaredMadeForKids: false,
        }
      };

      const initResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': fileSize.toString(),
          'X-Upload-Content-Type': 'video/*',
        },
        body: JSON.stringify(metadata),
      });

      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        throw new Error(`Google rejected resumable upload initialization: ${errorText}`);
      }

      const uploadUrl = initResponse.headers.get('Location');
      if (!uploadUrl) {
        throw new Error('Resumable session Location header was not provided by Google.');
      }

      addLog('info', `Resumable session established. Uploading ${fileSize} bytes...`);

      // 4. Perform chunked/full stream upload to resumable URL with upload progress updates
      const fileBuffer = fs.readFileSync(validatedPath);

      const uploadPromise = fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': 'video/*',
        },
        body: fileBuffer,
      });

      let progress = 0;
      const progressTimer = setInterval(() => {
        const currentDb = readDb();
        const activeVideo = currentDb.videos.find(v => v.id === videoId);
        if (!activeVideo || activeVideo.status !== 'uploading') {
          clearInterval(progressTimer);
          return;
        }

        if (progress < 95) {
          progress += Math.floor(Math.random() * 8) + 2;
          if (progress > 95) progress = 95;
          activeVideo.progress = progress;
          writeDb(currentDb);
        }
      }, 400);

      const putResponse = await uploadPromise;
      clearInterval(progressTimer);

      if (!putResponse.ok) {
        const errorText = await putResponse.text();
        throw new Error(`YouTube API upload stream failed: ${errorText}`);
      }

      const uploadResult = await putResponse.json();
      const youtubeId = uploadResult.id;

      if (!youtubeId) {
        throw new Error('YouTube did not return a valid video ID.');
      }

      // Success! Update DB
      const finalDb = readDb();
      const finalVideo = finalDb.videos.find(v => v.id === videoId);

      // Upload custom SEO thumbnail if it exists
      if (finalVideo && finalVideo.localThumbnailPath && fs.existsSync(finalVideo.localThumbnailPath)) {
        addLog('info', `Uploading custom AI-generated SEO thumbnail to YouTube video: ${youtubeId}...`);
        try {
          const thumbnailBuffer = fs.readFileSync(finalVideo.localThumbnailPath);
          const thumbResponse = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${youtubeId}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'image/png',
              'Content-Length': thumbnailBuffer.length.toString(),
            },
            body: thumbnailBuffer,
          });
          
          if (thumbResponse.ok) {
            addLog('success', `Successfully set custom AI SEO thumbnail on YouTube for video ID: ${youtubeId}!`);
          } else {
            const thumbErrText = await thumbResponse.text();
            addLog('warn', `YouTube rejected setting custom thumbnail (verify if channel is verified for custom thumbnails): ${thumbErrText}`);
          }
        } catch (thumbErr: any) {
          addLog('warn', `Failed to upload custom thumbnail to YouTube: ${thumbErr.message}`);
        }
      }

      if (finalVideo) {
        finalVideo.status = 'completed';
        finalVideo.progress = 100;
        finalVideo.youtubeId = youtubeId;
        finalVideo.completedAt = new Date().toISOString();
        const vId = extractVideoId(finalVideo.sourceUrl);
        if (vId && !finalDb.processedVideoIds.includes(vId)) {
          finalDb.processedVideoIds.push(vId);
        }
        writeDb(finalDb);
        addLog('success', `Successfully republished video to YouTube!`, `Video Title: "${finalVideo.title}", YouTube URL: https://youtu.be/${youtubeId}`);
      }

      // Clean up local physical files to preserve disk space
      try {
        if (fs.existsSync(finalPath)) {
          fs.unlinkSync(finalPath);
          console.log(`Cleaned up downloaded file: ${finalPath}`);
        }
        if (validatedPath && validatedPath !== finalPath && fs.existsSync(validatedPath)) {
          fs.unlinkSync(validatedPath);
          console.log(`Cleaned up validated remuxed file: ${validatedPath}`);
        }
      } catch (e) {
        console.error('File cleanup failed:', e);
      }

    } catch (err: any) {
      addLog('error', `Failed to upload "${video.title}": ${err.message}`);
      
      // Clean up local physical files on error to preserve disk space
      try {
        if (finalPath && fs.existsSync(finalPath)) {
          fs.unlinkSync(finalPath);
          console.log(`Cleaned up downloaded file on error: ${finalPath}`);
        }
        if (validatedPath && validatedPath !== finalPath && fs.existsSync(validatedPath)) {
          fs.unlinkSync(validatedPath);
          console.log(`Cleaned up validated remuxed file on error: ${validatedPath}`);
        }
      } catch (e) {
        console.error('File cleanup on error failed:', e);
      }

      const finalDb = readDb();
      const failedVideo = finalDb.videos.find(v => v.id === videoId);
      if (failedVideo) {
        failedVideo.status = 'failed';
        if (err.message.toLowerCase().includes('duplicate') || err.message.toLowerCase().includes('already exists') || err.message.toLowerCase().includes('upload limit')) {
          failedVideo.error = `Permanent error (no retry): ${err.message}`;
          failedVideo.retryCount = failedVideo.maxRetries; // Prevent further retries
        } else {
          failedVideo.error = err.message;
          failedVideo.retryCount += 1;
        }
        writeDb(finalDb);
      }
    }
  }

  async function executeSingleRule(ruleId: string): Promise<number> {
    const state = readDb();
    const rule = state.scheduleRules.find(r => r.id === ruleId);
    if (!rule) {
      throw new Error(`Rule with ID "${ruleId}" not found.`);
    }

    addLog('info', `Scheduler: Executing monitor rule "${rule.name}"...`, `Source Channel: ${rule.sourceChannelUrl}`);
    
    // YouTube Data API monitor logic or high-fidelity simulated discovery
    // This fetches or generates newly published videos from the targeted channel
    let discoveredVideos: Array<{ url: string; title: string; description: string; thumbnailUrl: string }> = [];

    // If the user has connected an account, we use YouTube API Search. Otherwise, we simulate discovering new videos.
    const linkedUser = state.users[0];
    let usedRealApi = false;

    if (linkedUser && state.settings.googleClientId && state.settings.googleClientSecret) {
      try {
        const accessToken = await refreshUserTokenIfNeeded(linkedUser);
        
        // We extract the source Channel ID from the URL if possible, or search for it
        let searchId = '';
        const channelIdMatch = rule.sourceChannelUrl.match(/(?:channel\/|UC)([a-zA-Z0-9_-]{22})/);
        const usernameMatch = rule.sourceChannelUrl.match(/@([a-zA-Z0-9_-]+)/);
        
        if (channelIdMatch) {
          searchId = 'UC' + channelIdMatch[1];
        } else if (usernameMatch) {
          const searchChanRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(usernameMatch[1])}&type=channel&maxResults=1`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (searchChanRes.ok) {
            const searchChanData = await searchChanRes.json();
            if (searchChanData.items && searchChanData.items.length > 0) {
               searchId = searchChanData.items[0].id?.channelId || searchChanData.items[0].snippet?.channelId;
            }
          }
        }

        if (searchId) {
          // Fetch videos in channel
          const maxVideosToFetch = Math.min(15, Math.max(1, rule.maxLatestVideos || 4));
          addLog('info', `Fetching up to ${maxVideosToFetch} recent videos for channel ID: ${searchId}...`);
          const ytSearchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${searchId}&maxResults=${maxVideosToFetch}&order=date&type=video`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (ytSearchRes.ok) {
            const ytSearchData = await ytSearchRes.json();
            if (ytSearchData.items) {
              discoveredVideos = ytSearchData.items.map((item: any) => ({
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
              }));
              usedRealApi = true;
            }
          } else {
            const errorText = await ytSearchRes.text();
            addLog('error', `YouTube Search API returned an error: ${errorText}`);
          }
        } else {
          addLog('error', `Could not extract or resolve a valid Channel ID from URL: ${rule.sourceChannelUrl}`);
        }
      } catch (err) {
        console.error('Failed to monitor real channel via YouTube API:', err);
      }
    }

    // Fallback discovery simulator (creates rich content feeds from popular tech/nature content dynamically if no API active)
    if (!usedRealApi) {
      const index = Math.floor(Math.random() * 5);
      const mockTitles = [
        "Beautiful Lo-Fi Beats for Coding & Focus 🎧",
        "Advanced React 19 Performance Secrets You Must Know",
        "10 Essential Tools for Modern Full-Stack Developers",
        "Building a Clean Glassmorphism UI with Tailwind v4",
        "The Complete Guide to Automating Content Workflows"
      ];
      const mockThumbs = [
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=60",
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&auto=format&fit=crop&q=60",
        "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&auto=format&fit=crop&q=60",
        "https://images.unsplash.com/photo-1541462608141-2f52c051e485?w=400&auto=format&fit=crop&q=60",
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60"
      ];
      
      // Provide a stable ID based on the index to prevent infinite loop of new mock queue items
      const stableMockId = `mockvideo0${index}`; 
      // Only simulate discovering one video to not overflow the logs
      discoveredVideos = [{
        url: `https://www.youtube.com/watch?v=${stableMockId}`,
        title: mockTitles[index],
        description: 'An awesome curated video with rich production quality.',
        thumbnailUrl: mockThumbs[index]
      }];
    }

    // Queue discovered videos that aren't already processed/queued in our list
    let addedCount = 0;
    const freshState = readDb();
    const freshRule = freshState.scheduleRules.find(r => r.id === ruleId);
    
    for (const item of discoveredVideos) {
      const alreadyExists = isVideoAlreadyProcessed(item.url, item.title);

      if (!alreadyExists) {
        // Apply prefix/suffix formatting
        const formattedTitle = `${rule.titlePrefix || ''}${item.title}${rule.titleSuffix || ''}`;
        const cleanedRuleTemplate = sanitizeDescriptionText(rule.descriptionTemplate || '');
        const cleanedItemDescription = sanitizeDescriptionText(item.description || '');
        const formattedDescription = cleanedRuleTemplate
          ? `${cleanedRuleTemplate}\n\n${cleanedItemDescription}`
          : cleanedItemDescription;

        let finalTitle = formattedTitle;
        let finalDescription = formattedDescription;
        let isRewritten = false;

        if (freshState.settings.geminiApiKey) {
          const rewritten = await rewriteWithGemini(freshState.settings.geminiApiKey, formattedTitle, formattedDescription);
          finalTitle = rewritten.title;
          finalDescription = rewritten.description;
          isRewritten = true;
        }

        const autoVideo: Video = {
          id: Math.random().toString(36).substring(2, 9),
          targetUserId: rule.targetUserId,
          sourceUrl: item.url,
          title: sanitizeAndTruncateTitle(finalTitle),
          description: finalDescription,
          thumbnailUrl: item.thumbnailUrl,
          status: 'queued',
          progress: 0,
          retryCount: 0,
          maxRetries: freshState.settings.maxRetries || 3,
          queuedAt: new Date().toISOString(),
          privacyStatus: rule.privacyStatus || 'private',
          tags: rule.tags || [],
          scheduleRuleId: rule.id,
          isRewritten,
          autoOptimizeSeo: !!rule.autoOptimizeSeo
        };

        if (rule.autoOptimizeSeo && freshState.settings.geminiApiKey) {
          try {
            addLog('info', `Auto-Scheduler: Running AI thumbnail & SEO Click Prediction for discovered video: "${finalTitle}"...`);
            const seoData = await generateSeoThumbnailAndPredictCps(freshState.settings.geminiApiKey, autoVideo.id, finalTitle, finalDescription);
            autoVideo.seoThumbnailUrl = seoData.seoThumbnailUrl;
            autoVideo.localThumbnailPath = seoData.localThumbnailPath;
            autoVideo.cpsPrediction = seoData.cpsPrediction;
            autoVideo.thumbnailUrl = seoData.seoThumbnailUrl;
            if (seoData.cpsPrediction.tagsSuggestions?.length > 0) {
              autoVideo.tags = Array.from(new Set([...autoVideo.tags, ...seoData.cpsPrediction.tagsSuggestions]));
            }
            addLog('success', `Auto-Scheduler SEO complete for video "${finalTitle}". Predicted CTR: ${seoData.cpsPrediction.ctr}%`);
          } catch (seoErr) {
            console.error('Failed to run scheduler video auto-SEO optimization:', seoErr);
          }
        }

        freshState.videos.unshift(autoVideo);
        addedCount++;
      }
    }

    if (freshRule) {
      freshRule.lastCheckedAt = new Date().toISOString();
    }
    writeDb(freshState);

    if (addedCount > 0) {
      addLog('success', `Auto-Scheduler detected ${addedCount} new video(s) for "${rule.name}". Automatically queued for republishing.`);
    } else {
      addLog('info', `No new videos discovered on channel for rule "${rule.name}".`);
    }

    return addedCount;
  }

  // Automatic Scheduling Channel Monitor & Retry Scheduler Task
  let isSchedulerWorkerRunning = false;

  async function runSchedulerAndRetryWorker() {
    if (isSchedulerWorkerRunning) return;
    isSchedulerWorkerRunning = true;

    try {
      const state = readDb();

      // 0. History Cleanup Logic (Clear completed/failed videos after 20 mins)
      const twentyMinsMs = 20 * 60 * 1000;
      const now = Date.now();
      const initialVideoCount = state.videos.length;
      
      state.videos = state.videos.filter(v => {
        if (v.status === 'completed' || (v.status === 'failed' && v.retryCount >= v.maxRetries)) {
          const timestamp = v.completedAt ? new Date(v.completedAt).getTime() : new Date(v.queuedAt).getTime();
          if (now - timestamp > twentyMinsMs) {
            // Track processed ID to prevent scheduler from re-queueing
            const vId = extractVideoId(v.sourceUrl);
            if (vId && !state.processedVideoIds.includes(vId)) {
              state.processedVideoIds.push(vId);
            }
            addLog('info', `Auto-cleaned up old ${v.status} video from history: "${v.title}"`);
            return false;
          }
        }
        return true;
      });
      
      if (state.videos.length !== initialVideoCount) {
        writeDb(state);
      }

      // A. Automatic Retry Logic
      const failedRetryables = state.videos.filter(
        v => v.status === 'failed' && v.retryCount < v.maxRetries
      );

      for (const fVideo of failedRetryables) {
        // Retry if enough time has passed (default 5 minutes)
        const retryIntervalMs = (state.settings.autoRetryIntervalMinutes || 5) * 60 * 1000;
        const queuedTime = new Date(fVideo.queuedAt).getTime();
        const timeElapsed = Date.now() - queuedTime;

        if (timeElapsed > retryIntervalMs) {
          fVideo.status = 'queued';
          fVideo.progress = 0;
          fVideo.error = undefined;
          writeDb(state);
          addLog('info', `Auto-Retry Manager resetting video to queue (Attempt ${fVideo.retryCount + 1}/${fVideo.maxRetries}): "${fVideo.title}"`);
        }
      }

      // B. Monitor Automatic Upload Schedulers
      const enabledRules = state.scheduleRules.filter(r => r.enabled);

      for (const rule of enabledRules) {
        const intervalMs = rule.intervalMinutes * 60 * 1000;
        const lastChecked = rule.lastCheckedAt ? new Date(rule.lastCheckedAt).getTime() : 0;
        
        if (Date.now() - lastChecked > intervalMs) {
          try {
            await executeSingleRule(rule.id);
          } catch (err) {
            console.error(`Automatic monitor error for rule "${rule.name}":`, err);
          }
        }
      }

    } catch (e: any) {
      console.error('Scheduler worker error:', e);
    } finally {
      isSchedulerWorkerRunning = false;
    }
  }

  // START BACKGROUND INTERVAL LOOPS
  // Task runner checks every 5 seconds for downloads and uploads
  setInterval(runTaskWorker, 5000);
  
  // Scheduler checks every 10 seconds for rules and retry resets
  setInterval(runSchedulerAndRetryWorker, 10000);

  // Serve static assets in production, or mount Vite Dev Server in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, the server runs from dist/server.cjs (as per package.json build/start)
    // process.cwd() is the workspace root, so path.join(process.cwd(), 'dist') should be correct.
    // However, if we are running in a bundled environment, __dirname might be dist/ itself.
    const rootDistPath = path.join(process.cwd(), 'dist');
    const bundledDistPath = path.resolve(__dirname);
    const distPath = fs.existsSync(path.join(rootDistPath, 'index.html')) ? rootDistPath : bundledDistPath;

    console.log(`[Server] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Application build not found. Please run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    addLog('success', `YouTube Auto Republisher web server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start full-stack server:', err);
});
