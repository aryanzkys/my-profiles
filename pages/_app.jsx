import '../styles/globals.css';
import { PerformanceProvider } from '../components/PerformanceContext';
import { DataProvider } from '../components/DataContext';
import dynamic from 'next/dynamic';

const Chatbot = dynamic(() => import('../components/Chatbot'), { ssr: false });

export default function App({ Component, pageProps }) {
  return (
    <PerformanceProvider>
      <DataProvider>
  <Component {...pageProps} />
  <Chatbot />
      </DataProvider>
    </PerformanceProvider>
  );
}
