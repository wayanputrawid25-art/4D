'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth, logout } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">ForexOS</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md 
                           hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Welcome, {user?.name}!
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900">
                  Trading Accounts
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Manage your MT5 trading accounts
                </p>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <a href="/accounts" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  View accounts →
                </a>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900">
                  Strategies
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Create and manage trading strategies
                </p>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <a href="/strategies" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  View strategies →
                </a>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900">
                  Backtest
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Test your strategies with historical data
                </p>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <a href="/backtest" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  Run backtest →
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
