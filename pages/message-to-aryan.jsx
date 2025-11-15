import dynamic from 'next/dynamic';
import Head from 'next/head';

const MessageToAryan = dynamic(() => import('../components/MessageToAryan'), { ssr: false });

export default function MessagePage() {
  return (
    <>
      <Head>
        <title>Message to Aryan — Private Channel</title>
        <meta name="description" content="Direct encrypted messaging channel to reach Aryan. Secure, private, and exclusive." />
        <meta property="og:title" content="Message to Aryan — Private Channel" />
        <meta property="og:description" content="Send a direct message through an exclusive, encrypted channel." />
      </Head>
      <div className="min-h-screen w-full relative overflow-hidden bg-black">
        {/* Animated background layers */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          {/* Radial glows */}
          <div className="absolute inset-0" style={{
            background: `radial-gradient(1200px 600px at 50% 0%, rgba(34,211,238,0.12), transparent 50%), radial-gradient(900px 550px at 85% 15%, rgba(232,121,249,0.1), transparent 60%)`
          }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.15]" style={{
            backgroundImage: `linear-gradient(transparent 97%, rgba(148,163,184,0.12) 98%), linear-gradient(90deg, transparent 97%, rgba(148,163,184,0.12) 98%)`,
            backgroundSize: '42px 42px',
            transform: 'perspective(1000px) rotateX(60deg) translateY(-25%)',
            transformOrigin: 'top center'
          }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black" />
          
          {/* Floating orbs */}
          <div className="absolute top-[15%] left-[10%] h-64 w-64 rounded-full bg-cyan-500/5 blur-[90px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[20%] right-[15%] h-80 w-80 rounded-full bg-fuchsia-500/5 blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        </div>

        <div className="relative flex items-center justify-center min-h-screen px-4 py-16">
          <MessageToAryan />
        </div>
      </div>
    </>
  );
}
