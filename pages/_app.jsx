import '../styles/globals.css';
import { PerformanceProvider } from '../components/PerformanceContext';

export default function App({ Component, pageProps }) {
  return (
    <PerformanceProvider>
      <Component {...pageProps} />
    </PerformanceProvider>
  );
}
