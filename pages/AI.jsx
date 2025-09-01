import dynamic from 'next/dynamic';
import Head from 'next/head';
import { motion } from 'framer-motion';

const Chatbot = dynamic(() => import('../components/Chatbot'), { ssr: false });
const SpotifyFloating = dynamic(() => import('../components/SpotifyFloating'), { ssr: false });

export default function AIPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-black to-[#030b11] text-gray-100">
      <Head>
        <title>Aryan’s AI Assistant</title>
        <meta name="robots" content="index,follow" />
        <meta name="description" content="Chat with Aryan’s AI Assistant — trained by Aryan to help you get to know him better." />
      </Head>

      <header className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(60% 40% at 70% 0%, rgba(34,211,238,0.25), transparent 70%)' }} />
        <div className="container mx-auto px-4 py-10">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-2xl md:text-3xl font-semibold text-cyan-200">
            Aryan’s AI Assistant
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }} className="mt-2 text-sm md:text-base text-gray-300">
            Ask anything about Aryan — education, achievements, organizations, and more.
          </motion.p>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-24">
        <div className="relative mt-4">
          {/* Centered, wider full-screen styled chat */}
          <div className="grid place-items-center">
            <div className="w-full max-w-[1040px] px-1">
              <Chatbot initialOpen={true} fullScreen={true} />
            </div>
          </div>
        </div>
      </main>
  {/* Spotify floating button & modal */}
  <SpotifyFloating />
    </div>
  );
}
