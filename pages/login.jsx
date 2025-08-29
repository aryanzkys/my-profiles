import dynamic from 'next/dynamic';
import { AuthProvider } from '../components/AuthProvider';

const LoginForm = dynamic(() => import('../components/LoginForm'), { ssr: false });

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}
