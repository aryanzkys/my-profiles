import dynamic from 'next/dynamic';
import Overlay from '../components/Overlay';
import MobileNotice from '../components/MobileNotice';

const Scene = dynamic(() => import('../components/Scene'), { ssr: false });

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black relative">
      <Scene />
      <Overlay />
  <MobileNotice />
    </main>
  );
}
