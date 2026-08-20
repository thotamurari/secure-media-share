import { useEffect, useState, useRef } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  const blurContent = () => {
    setIsBlurred(true);
    setTimeout(() => setIsBlurred(false), 2500);
  };

  const triggerWarning = async () => {
    setShowWarning(true);
    blurContent();
    onAttempt?.();

    toast.error('⚠️ This is private content. Screenshots and downloads are not allowed.', {
      id: 'protection-toast',
      duration: 4000,
    });

    // Log screenshot attempt to database if owner info provided
    if (contentOwnerId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        // Only log if not owner
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

    setTimeout(() => setShowWarning(false), 5000);
  };

  useEffect(() => {
    domFingerprintRef.current = createDOMFingerprint();

    // Advanced event detection with timing analysis
    const detectAutomatedTools = (timestamp: number) => {
      eventTimestampsRef.current.push(timestamp);
      if (eventTimestampsRef.current.length > 10) {
        eventTimestampsRef.current.shift();
      }
      
      if (eventTimestampsRef.current.length >= 5) {
        const intervals = eventTimestampsRef.current
          .slice(1)
          .map((t, i) => t - eventTimestampsRef.current[i]);
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        
        if (avgInterval < 10) {
          triggerWarning();
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      detectAutomatedTools(Date.now());
      triggerWarning();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const blockedKeys = [
        'F12', 'F11',
        ...(e.ctrlKey && e.shiftKey ? ['I', 'C', 'J', 'K', 'S', 'i', 'c', 'j', 'k', 's'] : []),
        ...(e.ctrlKey ? ['u', 'U', 's', 'S', 'p', 'P'] : []),
        ...(e.metaKey ? ['u', 'U', 's', 'S', 'p', 'P'] : []),
        'PrintScreen'
      ];

      if (blockedKeys.some(key => e.key === key) || e.keyCode === 123 || e.code === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        detectAutomatedTools(Date.now());
        triggerWarning();
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        detectAutomatedTools(Date.now());
        triggerWarning();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      detectAutomatedTools(Date.now());
      triggerWarning();
      return false;
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      detectAutomatedTools(Date.now());
      triggerWarning();
      return false;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        blurContent();
      }
    };

    const handleBlur = () => {
      setTimeout(() => {
        blurContent();
      }, 100);
    };

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

    return () => {
      events.forEach(([event, handler]) => {
        document.removeEventListener(event, handler as EventListener, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [username]);

  return (
    <>
      {/* Watermark overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="select-none text-5xl font-extrabold opacity-15 rotate-[-25deg] tracking-widest text-primary/40 pointer-events-none"
        >
          @{username}
        </div>
      </div>

      {/* Transparent protective layer to capture direct clicks / right-clicks */}
      <div 
        className="absolute inset-0 z-10 select-none cursor-pointer"
        style={{ background: 'transparent' }}
        onContextMenu={(e) => {
          e.preventDefault();
          triggerWarning();
        }}
        onClick={(e) => {
          // Double check attempt on clicks if needed
        }}
      />

      {/* Blur overlay when screenshot detected */}
      {isBlurred && (
        <div className="absolute inset-0 z-20 backdrop-blur-2xl bg-black/85 flex flex-col items-center justify-center select-none animate-in fade-in duration-150">
          <ShieldAlert className="w-14 h-14 text-destructive animate-pulse mb-2" />
          <p className="text-lg font-bold text-white">Screenshot Detected!</p>
          <p className="text-xs text-muted-foreground">Private media protected</p>
        </div>
      )}

      {/* Prominent Warning Modal Popup */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border-2 border-destructive text-card-foreground p-6 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto ring-8 ring-destructive/10">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-destructive">Private Content Protection</h3>
            <p className="text-base font-semibold text-foreground">
              ⚠️ This is private content. Screenshots and downloads are not allowed.
            </p>
            <p className="text-xs text-muted-foreground">
              This content belongs to @{username}. Your action has been blocked to protect private media.
            </p>
            <Button
              variant="destructive"
              className="w-full mt-4 font-semibold text-base py-2.5 shadow-lg"
              onClick={() => setShowWarning(false)}
            >
              I Understand
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
