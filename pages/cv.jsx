import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

const EXTERNAL_CV_URL = 'https://rxresu.me/prayogoaryan63/cv-aryan-zaky-prayogo';

export default function CvRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.replace(EXTERNAL_CV_URL);
    }
  }, []);

  useEffect(() => {
    if (router.asPath !== EXTERNAL_CV_URL) {
      router.replace(EXTERNAL_CV_URL, undefined, { shallow: true });
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6">
      <Head>
        <title>Redirecting to CV…</title>
        <meta name="robots" content="noindex,follow" />
      </Head>
      <div className="max-w-md text-center space-y-3">
        <p className="text-lg font-semibold">Redirecting to Aryan’s CV</p>
        <p className="text-sm text-neutral-400">
          Hang tight! You&apos;ll be redirected to the latest version of my CV hosted on Reactive Resume.
          If nothing happens, click the button below.
        </p>
        <a
          href={EXTERNAL_CV_URL}
          className="inline-flex items-center justify-center rounded-lg bg-neutral-100 text-neutral-950 px-4 py-2 text-sm font-semibold hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-neutral-950"
        >
          Open CV manually
        </a>
      </div>
    </main>
  );
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: EXTERNAL_CV_URL,
      permanent: false
    }
  };
}
