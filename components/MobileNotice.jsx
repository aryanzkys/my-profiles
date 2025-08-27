import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function isMobileOrTablet() {
  if (typeof window === 'undefined') return false;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const uaMatch = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Tablet/i.test(ua);
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const narrow = typeof window.innerWidth === 'number' && window.innerWidth <= 1024;
  return uaMatch || coarse || narrow;
}

export default function MobileNotice() {
  const [show, setShow] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    const dismissed = typeof window !== 'undefined' && localStorage.getItem('mobileNoticeDismissed') === '1';
    if (!dismissed && isMobileOrTablet()) setShow(true);
  }, []);

  const dismiss = () => {
    try {
      if (dontShow) localStorage.setItem('mobileNoticeDismissed', '1');
    } catch {}
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={dismiss} />
          <motion.div
            className="relative z-10 w-full max-w-md bg-neutral-900/95 border border-white/10 rounded-2xl p-5 shadow-2xl"
            initial={{ y: 30, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <div className="mb-3">
              <h3 className="text-white text-lg font-semibold">Best Experience on Desktop/Laptop</h3>
              <p className="text-gray-300 text-sm mt-1">
                For optimal performance and a smoother 3D experience, please open this website on a Desktop or Laptop. Mobile and tablet devices may have limited performance.
              </p>
              <div className="text-gray-300 text-sm mt-3">
                Tip: If you still prefer mobile, try enabling "Desktop site" in your browser for a better layout.
                <a
                  href="https://support.google.com/chrome/answer/13514529?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-cyan-300 underline hover:text-cyan-200"
                >
                  Chrome: Request desktop site
                </a>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300 select-none">
              <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
              Don't show again
            </label>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={dismiss} className="px-3 py-2 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15">
                Continue anyway
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
