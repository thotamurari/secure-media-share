import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProtectionOverlayProps {
  username: string;
  onAttempt?: () => void;
}

export const ProtectionOverlay = ({ username, onAttempt }: ProtectionOverlayProps) => {
  const [showWarning, setShowWarning] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerWarning();
      return false;
    };

    // Disable keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J, Ctrl+U, Ctrl+S
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'C', 'J'].includes(e.key)) ||
        (e.ctrlKey && ['U', 'S'].includes(e.key)) ||
        (e.metaKey && ['U', 'S'].includes(e.key)) ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
        triggerWarning();
        return false;
      }
    };

    // Detect PrintScreen
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        triggerWarning();
        blurContent();
      }
    };

    // Disable drag
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      triggerWarning();
      return false;
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('dragstart', handleDragStart);

    // Prevent selection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('dragstart', handleDragStart);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, []);

  const triggerWarning = () => {
    setShowWarning(true);
    onAttempt?.();
    setTimeout(() => setShowWarning(false), 4000);
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
