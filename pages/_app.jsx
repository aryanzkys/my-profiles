import '../styles/globals.css';
import { PerformanceProvider } from '../components/PerformanceContext';
import { DataProvider } from '../components/DataContext';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

const Chatbot = dynamic(() => import('../components/Chatbot'), { ssr: false });
const AnnouncementPopup = dynamic(() => import('../components/AnnouncementPopup'), { ssr: false });

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const path = router?.pathname || '';
  // Admin and login areas should not show the global floating Chatbot
  const isAdminArea = /^\/(?:admin|login)(?:$|\/)/i.test(path);
  // Suppress global floating Chatbot on the AI page; the AI page renders its own full-screen Chatbot
  const isAIPage = /^\/ai(?:\/|$)/i.test(path);
  return (
    <PerformanceProvider>
      <DataProvider>
  <Component {...pageProps} />
  <AnnouncementPopup />
  {!isAdminArea && !isAIPage && <Chatbot />}
      </DataProvider>
    </PerformanceProvider>
  );
}
