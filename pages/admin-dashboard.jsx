import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Dashboard from '../components/Dashboard';
import { AuthProvider, useAuth } from '../components/AuthProvider';

function Protected() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);
  if (loading || !user) return null;
  return <Dashboard />;
}

export default function AdminDashboardPage() {
  return (
    <AuthProvider>
      <Protected />
    </AuthProvider>
  );
}
