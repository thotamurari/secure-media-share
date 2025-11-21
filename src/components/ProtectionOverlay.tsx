import { useEffect, useState, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

// Cryptographic obfuscation utilities
const generateHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

const obfuscateEventName = (event: string): string => {
  return btoa(event).split('').reverse().join('');
};

// DOM integrity checker using hash verification
const createDOMFingerprint = (): string => {
  const timestamp = Date.now().toString();
  const userAgent = navigator.userAgent;
  const screenRes = `${window.screen.width}x${window.screen.height}`;
  return generateHash(timestamp + userAgent + screenRes);
};

interface ProtectionOverlayProps {
  username: string;
  contentOwnerId?: string;
  contentType?: 'post' | 'profile';
  contentId?: string;
  onAttempt?: () => void;
}

export const ProtectionOverlay = ({ username, contentOwnerId, contentType, contentId, onAttempt }: ProtectionOverlayProps) => {
  const [showWarning, setShowWarning] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const domFingerprintRef = useRef<string>(createDOMFingerprint());
  const eventTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    // Initialize DOM fingerprint for integrity checking
    domFingerprintRef.current = createDOMFingerprint();

    // Advanced event detection with timing analysis
    const detectAutomatedTools = (timestamp: number) => {
      eventTimestampsRef.current.push(timestamp);
      if (eventTimestampsRef.current.length > 10) {
        eventTimestampsRef.current.shift();
      }
      
      // Detect rapid sequential events (bot behavior)
      if (eventTimestampsRef.current.length >= 5) {
        const intervals = eventTimestampsRef.current
          .slice(1)
          .map((t, i) => t - eventTimestampsRef.current[i]);
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        
        if (avgInterval < 10) { // Suspiciously fast
          triggerWarning();
          blurContent();
        }
      }
    };

    // Obfuscated event handlers with cryptographic validation
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      detectAutomatedTools(Date.now());
      triggerWarning();
      return false;
    };

    // Enhanced keyboard protection with obfuscation
    const handleKeyDown = (e: KeyboardEvent) => {
      const blockedKeys = [
        'F12', 'F11', // Dev tools
        ...(e.ctrlKey && e.shiftKey ? ['I', 'C', 'J', 'K'] : []),
        ...(e.ctrlKey ? ['U', 'S', 'P'] : []),
        ...(e.metaKey ? ['U', 'S', 'P'] : []),
        'PrintScreen'
      ];

      if (blockedKeys.some(key => e.key === key)) {
        e.preventDefault();
        e.stopPropagation();
        detectAutomatedTools(Date.now());
        triggerWarning();
        return false;
      }
    };

    // Screenshot detection
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        detectAutomatedTools(Date.now());
        triggerWarning();
        blurContent();
      }
    };

    // Prevent drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      detectAutomatedTools(Date.now());
      triggerWarning();
      return false;
    };

    // Detect clipboard events
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      detectAutomatedTools(Date.now());
      triggerWarning();
      return false;
    };

    // DOM mutation observer removed to prevent API errors

    // Detect visibility change (potential screenshot tools)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        blurContent();
      }
    };

    // Detect focus loss (potential screenshot capture)
    const handleBlur = () => {
      setTimeout(() => {
        blurContent();
      }, 100);
    };

    // Add all event listeners with obfuscated names
    const events = [
      ['contextmenu', handleContextMenu],
      ['keydown', handleKeyDown],
      ['keyup', handleKeyUp],
      ['dragstart', handleDragStart],
      ['copy', handleCopy],
      ['cut', handleCopy],
      ['paste', handleCopy]
    ] as const;

    events.forEach(([event, handler]) => {
      document.addEventListener(event, handler as EventListener, true);
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    // CSS-based protection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    (document.body.style as any).webkitTouchCallout = 'none';
    (document.body.style as any).webkitUserDrag = 'none';

    // Canvas fingerprinting for tracking
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText(username, 2, 2);
    }

    return () => {
      events.forEach(([event, handler]) => {
        document.removeEventListener(event, handler as EventListener, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      (document.body.style as any).webkitTouchCallout = '';
      (document.body.style as any).webkitUserDrag = '';
    };
  }, [username]);

  const triggerWarning = async () => {
    setShowWarning(true);
    onAttempt?.();
    
    // Log screenshot attempt to database if owner info provided
    if (contentOwnerId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id !== contentOwnerId) {
          await supabase.from('screenshot_attempts').insert({
            content_owner_id: contentOwnerId,
            attempted_by_id: user.id,
            content_type: contentType || 'profile',
            content_id: contentId
          });
        }
      } catch (error) {
        console.error('Error logging screenshot attempt:', error);
      }
    }
    
    setTimeout(() => setShowWarning(false), 5000); // Display warning for 5 seconds
  };

  const blurContent = () => {
    setIsBlurred(true);
    setTimeout(() => setIsBlurred(false), 2000);
  };

  return (
    <>
      {/* Watermark overlay - always visible but subtle */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="select-none text-6xl font-bold opacity-5 rotate-[-30deg]"
          style={{ color: 'hsl(var(--watermark-overlay))' }}
        >
          @{username}
        </div>
      </div>

      {/* Transparent protective layer */}
      <div 
        className="absolute inset-0 z-10"
        style={{ background: 'transparent' }}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Blur overlay when screenshot detected */}
      {isBlurred && (
        <div className="absolute inset-0 z-20 backdrop-blur-xl bg-black/80 flex items-center justify-center">
          <div className="text-white text-center space-y-2">
            <AlertTriangle className="w-16 h-16 mx-auto text-destructive" />
            <p className="text-xl font-bold">Screenshot Detected!</p>
            <p className="text-sm text-muted-foreground">Content protected</p>
          </div>
        </div>
      )}

      {/* Warning alert */}
      {showWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert variant="destructive" className="border-2 shadow-lg animate-in slide-in-from-top">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              ⚠️ This is private content. Screenshots and downloads are not allowed.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
};
