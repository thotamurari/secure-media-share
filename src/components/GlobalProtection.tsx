import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const GlobalProtection = () => {
  const [showModal, setShowModal] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);

  const triggerAlert = (reason?: string) => {
    setShowModal(true);
    setIsBlurred(true);
    toast.error('⚠️ This is private content. Screenshots and downloads are not allowed.', {
      id: 'global-protection-alert',
      duration: 4000,
    });
    setTimeout(() => {
      setIsBlurred(false);
    }, 2500);
  };

  useEffect(() => {
    // 1. Keyboard event listeners for F12, PrintScreen, DevTools, screenshot shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 key (code: F12, keyCode: 123) or Ctrl+Shift+I / Meta+Shift+4 etc.
      if (
        e.key === 'F12' ||
        e.keyCode === 123 ||
        e.code === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'S', 'i', 'j', 'c', 's'].includes(e.key)) ||
        (e.metaKey && e.shiftKey && ['3', '4', '5', 'I', 'J', 'C', 'S', 'i', 'j', 'c', 's'].includes(e.key)) ||
        (e.ctrlKey && ['u', 'U', 's', 'S', 'p', 'P'].includes(e.key)) ||
        e.key === 'PrintScreen' ||
        e.code === 'PrintScreen'
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerAlert('Keyboard shortcut');
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        triggerAlert('PrintScreen');
      }
    };

    // 2. Right click contextmenu prevention
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerAlert('Right click');
      return false;
    };

    // 3. Copy / Cut / Drag prevention
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerAlert('Copy attempt');
      return false;
    };

    const handleDrag = (e: DragEvent) => {
      e.preventDefault();
      triggerAlert('Drag attempt');
      return false;
    };

    // 4. Visibility and blur change (detect screen sniper / screenshot tool)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
      } else {
        setTimeout(() => setIsBlurred(false), 1500);
      }
    };

    const handleWindowBlur = () => {
      setIsBlurred(true);
      setTimeout(() => setIsBlurred(false), 1500);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('copy', handleCopy, true);
    window.addEventListener('dragstart', handleDrag, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('copy', handleCopy, true);
      window.removeEventListener('dragstart', handleDrag, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  return (
    <>
      {/* Full screen blur protection when capture / screenshot detected */}
      {isBlurred && (
        <div className="fixed inset-0 z-[9998] backdrop-blur-2xl bg-black/85 flex flex-col items-center justify-center pointer-events-none select-none transition-all duration-200">
          <ShieldAlert className="w-20 h-20 text-destructive animate-pulse mb-3" />
          <h2 className="text-2xl font-bold text-white tracking-wide">Screenshot Protected</h2>
          <p className="text-muted-foreground text-sm mt-1">This private media is encrypted and protected</p>
        </div>
      )}

      {/* Prominent Modal Popup */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-card border-2 border-destructive text-card-foreground p-6 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto ring-8 ring-destructive/10">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-destructive">Private Content Protection</h3>
            <p className="text-base font-semibold text-foreground leading-relaxed">
              ⚠️ This is private content. Screenshots and downloads are not allowed.
            </p>
            <p className="text-xs text-muted-foreground">
              Developer tools (F12), screen capture, and copying are disabled to protect media rights.
            </p>
            <Button
              variant="destructive"
              className="w-full mt-4 font-semibold text-base py-2.5 shadow-lg"
              onClick={() => setShowModal(false)}
            >
              I Understand
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
