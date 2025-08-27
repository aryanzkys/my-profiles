import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function isMobileUA() {
  if (typeof navigator === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
}

export default function MobileNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = typeof window !== 'undefined' && localStorage.getItem('mobileNoticeDismissed') === '1';
    if (!dismissed && isMobileUA()) setShow(true);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem('mobileNoticeDismissed', '1'); } catch {}
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
              <h3 className="text-white text-lg font-semibold">Pengalaman Terbaik di Desktop/Laptop</h3>
              <p className="text-gray-300 text-sm mt-1">
                Demi optimalisasi dan kelancaran saat membuka website, disarankan menggunakan perangkat Desktop atau Laptop.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={dismiss} className="px-3 py-2 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15">
                Tetap Lanjut
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
