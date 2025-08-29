import dynamic from 'next/dynamic';
import Head from 'next/head';

const MessageToAryan = dynamic(() => import('../components/MessageToAryan'), { ssr: false });

export default function MessagePage() {
  return (
    <>
      <Head>
        <title>Message to Aryan</title>
        <meta name="description" content="Send a message to Aryan" />
      </Head>
      <div className="min-h-screen w-full flex items-center justify-center px-4 py-16 bg-black">
        <MessageToAryan />
      </div>
    </>
  );
}
