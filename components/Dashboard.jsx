"use client";
import { motion } from 'framer-motion';
import { useAuth } from './AuthProvider';

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen grid place-items-center bg-black text-gray-100">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-2xl md:text-3xl font-semibold text-cyan-300">Welcome to Admin Panel, Aryan Zaky Prayogo</h1>
        <p className="text-gray-300 mt-2 text-sm">{user ? user.email : 'Signed in'}</p>
      </motion.div>
    </div>
  );
}
