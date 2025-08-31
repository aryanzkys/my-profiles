import '../styles/globals.css';
import { PerformanceProvider } from '../components/PerformanceContext';
import { DataProvider } from '../components/DataContext';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

const Chatbot = dynamic(() => import('../components/Chatbot'), { ssr: false });

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const path = router?.pathname || '';
  const isAdminArea = /^\/(?:admin|login)(?:$|\/)/i.test(path);
  return (
    <PerformanceProvider>
      <DataProvider>
  <Component {...pageProps} />
  {!isAdminArea && <Chatbot />}
      </DataProvider>
    </PerformanceProvider>
  );
}
