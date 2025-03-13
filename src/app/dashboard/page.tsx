"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MyAssistant } from '@/components/MyAssistant';
import { jwtDecode } from 'jwt-decode';
import { getApiUrl } from '@/lib/utils'

// Backend API URL - you can also use an environment variable
const API_URL = getApiUrl();

// Token will be refreshed if it expires in less than this many seconds
const TOKEN_REFRESH_THRESHOLD = 5 * 60; // 5 minutes in seconds

interface JWTPayload {
  exp?: number;
  type?: string;
  [key: string]: any;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

interface ChatIdResponse {
  active_chat_id: string;
}

// Token management utilities
const TokenManager = {
  getAccessToken: () => localStorage.getItem('token'),
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
  },
  hasValidTokens: () => {
    return !!(localStorage.getItem('token') && localStorage.getItem('refresh_token'));
  }
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const router = useRouter();

  // Function to check if token is close to expiry
  const isTokenExpiringSoon = (token: string): boolean => {
    try {
      const decoded = jwtDecode<JWTPayload>(token);
      if (!decoded.exp) return false;
      
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - currentTime;
      console.log('Time until token expiry (seconds):', timeUntilExpiry);
      
      return timeUntilExpiry < TOKEN_REFRESH_THRESHOLD;
    } catch (error) {
      console.error('Error decoding token:', error);
      return false;
    }
  };

  // Function to refresh the token using refresh token
  const refreshTokens = async (): Promise<{ accessToken: string; refreshToken: string }> => {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      console.log('Attempting to refresh tokens...');
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data: TokenResponse = await response.json();
      
      if (!data.access_token || !data.refresh_token) {
        throw new Error('Invalid token response from server');
      }

      TokenManager.setTokens(data.access_token, data.refresh_token);
      console.log('✅ Successfully refreshed tokens');
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token
      };
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  };

  // Function to set a new chat ID
  const setNewChatId = async (accessToken: string): Promise<string> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/set-chat-id`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to set chat ID');
      }

      const data: ChatIdResponse = await response.json();
      setChatId(data.active_chat_id);
      return data.active_chat_id;
    } catch (error) {
      console.error('Error setting chat ID:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Authentication check with token refresh and chat ID setup
    const verifyAndRefreshToken = async () => {
      try {
        if (!TokenManager.hasValidTokens()) {
          router.push('/');
          return;
        }

        const token = TokenManager.getAccessToken();
        let currentAccessToken = token;
        
        // Check if token is about to expire
        if (token && isTokenExpiringSoon(token)) {
          try {
            const { accessToken } = await refreshTokens();
            currentAccessToken = accessToken;
            // Use new access token for verification
            const response = await fetch(`${API_URL}/api/auth/me`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });

            if (!response.ok) {
              TokenManager.clearTokens();
              router.push('/');
              return;
            }
          } catch (refreshError) {
            TokenManager.clearTokens();
            router.push('/');
            return;
          }
        }

        // Set new chat ID after successful authentication
        if (currentAccessToken) {
          await setNewChatId(currentAccessToken);
        }
      } catch (error) {
        console.error('Error verifying authentication:', error);
        TokenManager.clearTokens();
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    verifyAndRefreshToken();
    
    // Set up periodic token refresh check
    const refreshInterval = setInterval(() => {
      const token = TokenManager.getAccessToken();
      if (token && isTokenExpiringSoon(token)) {
        refreshTokens().catch(() => {
          TokenManager.clearTokens();
          router.push('/');
        });
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(refreshInterval);
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <main className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex-1">
        <MyAssistant chatId={chatId} />
      </div>
    </main>
  );
}