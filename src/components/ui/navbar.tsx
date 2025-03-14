'use client';

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Progress } from "./progress";
import { useRouter } from 'next/navigation';
import { useEffect, useState, createContext, useContext } from 'react';
import { getApiUrl } from '@/lib/utils';

interface RequestStats {
  requestsUsed: number;
  requestsLimit: number;
}

interface RequestStatsContextType {
  stats: RequestStats;
  updateStats: () => Promise<void>;
  incrementRequests: () => void;
}

const RequestStatsContext = createContext<RequestStatsContextType | null>(null);

export function useRequestStats() {
  const context = useContext(RequestStatsContext);
  if (!context) {
    throw new Error('useRequestStats must be used within a RequestStatsProvider');
  }
  return context;
}

export function RequestStatsProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<RequestStats>({ requestsUsed: 0, requestsLimit: 100 });
  const router = useRouter();

  const fetchUserStats = async () => {
    try {
      const token = TokenManager.getToken();
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`${getApiUrl()}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          requestsUsed: data.requests_used,
          requestsLimit: data.requests_limit
        });
      } else {
        if (response.status === 401) {
          TokenManager.clearTokens();
          router.push('/');
        }
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const incrementRequests = () => {
    setStats(prev => ({
      ...prev,
      requestsUsed: Math.min(prev.requestsUsed + 1, prev.requestsLimit)
    }));
  };

  useEffect(() => {
    fetchUserStats();
    const interval = setInterval(fetchUserStats, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <RequestStatsContext.Provider value={{ stats, updateStats: fetchUserStats, incrementRequests }}>
      {children}
    </RequestStatsContext.Provider>
  );
}

// Token management utilities
const TokenManager = {
  clearTokens: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
  },
  getToken: () => localStorage.getItem('token')
};

export function Navbar() {
  const router = useRouter();
  const { stats } = useRequestStats();

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push('/');
  };

  return (
    <div className="border-b bg-white">
      <div className="flex h-16 items-center px-4 md:px-6">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold text-[#CC0000]">Comment Sense</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              Requests: {stats.requestsUsed}/{stats.requestsLimit}
            </div>
            <div className="w-32">
              <Progress 
                value={(stats.requestsUsed / stats.requestsLimit) * 100} 
                className="h-2"
                indicatorClassName="bg-[#CC0000]"
              />
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </div>
    </div>
  );
} 