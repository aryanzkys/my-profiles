import '../styles/globals.css';
import { PerformanceProvider } from '../components/PerformanceContext';
import { DataProvider } from '../components/DataContext';

export default function App({ Component, pageProps }) {
  return (
    <PerformanceProvider>
      <DataProvider>
        <Component {...pageProps} />
      </DataProvider>
    </PerformanceProvider>
  );
}
