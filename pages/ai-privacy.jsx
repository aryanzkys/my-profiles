import Head from 'next/head';

export default function AIPrivacy() {
  return (
    <main className="min-h-screen bg-[#05070a] text-gray-100">
      <Head>
        <title>Privacy Policy — Aryan’s AI Assistant</title>
        <meta name="robots" content="noindex,follow" />
        <meta name="description" content="Privacy Policy for Aryan’s AI Assistant (AI Pages)" />
      </Head>
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4 text-cyan-300">Privacy Policy — Aryan’s AI Assistant</h1>
        <p className="mb-4 text-gray-300">This Privacy Policy explains how Aryan’s AI Assistant (the “AI Pages”) handles your data and privacy when you interact with the chatbot and related features.</p>
        <h2 className="text-lg font-semibold mt-6 mb-2 text-cyan-200">1. What Data is Collected?</h2>
        <ul className="list-disc ml-6 mb-4">
          <li><b>Chat Messages:</b> Your questions and the AI’s responses are processed to generate answers. Messages may be logged for quality improvement and abuse prevention.</li>
          <li><b>Spotify Integration:</b> If you connect Spotify, your access token is stored locally in your browser and never sent to Aryan’s server. Search queries and previews are proxied securely.</li>
          <li><b>Usage Data:</b> Basic analytics (e.g., page visits, feature usage) may be collected in aggregate to improve the site.</li>
        </ul>
        <h2 className="text-lg font-semibold mt-6 mb-2 text-cyan-200">2. How is Data Used?</h2>
        <ul className="list-disc ml-6 mb-4">
          <li>To provide accurate and helpful AI responses.</li>
          <li>To improve the quality, safety, and reliability of the AI Assistant.</li>
          <li>To enable features like Spotify search and preview (if you connect Spotify).</li>
        </ul>
        <h2 className="text-lg font-semibold mt-6 mb-2 text-cyan-200">3. Data Storage & Security</h2>
        <ul className="list-disc ml-6 mb-4">
          <li>Chat history is stored locally in your browser for your convenience. Aryan does not permanently store your chat history unless you submit feedback or abuse reports.</li>
          <li>Spotify tokens and preferences are stored only in your browser’s local storage.</li>
          <li>All communication with the AI and Spotify APIs is encrypted (HTTPS).</li>
        </ul>
        <h2 className="text-lg font-semibold mt-6 mb-2 text-cyan-200">4. Your Choices</h2>
        <ul className="list-disc ml-6 mb-4">
          <li>You can clear your chat history at any time using the “Clear chat” button.</li>
          <li>You can disconnect Spotify at any time.</li>
          <li>If you have questions or requests about your data, contact Aryan at <a href="mailto:prayogoaryan63@gmail.com" className="underline text-cyan-300">prayogoaryan63@gmail.com</a>.</li>
        </ul>
        <h2 className="text-lg font-semibold mt-6 mb-2 text-cyan-200">5. Changes</h2>
        <p className="mb-4">This policy may be updated from time to time. Significant changes will be announced on the AI Pages.</p>
        <div className="mt-8 text-xs text-gray-400">Last updated: September 2025</div>
      </div>
    </main>
  );
}
