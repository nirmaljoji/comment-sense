"use client";

import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/utils'

// Backend API URL - you can also use an environment variable
const API_URL = getApiUrl();

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

export function AuthCard() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Check for existing token on component mount
  useEffect(() => {
    const checkExistingToken = async () => {
      if (TokenManager.hasValidTokens()) {
        try {
          const token = TokenManager.getAccessToken();
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            // Token is valid, redirect to dashboard
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          // Clear invalid token
          TokenManager.clearTokens();
        }
      }
    };

    checkExistingToken();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Validate passwords match
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        // Sign up - direct API call to backend
        const response = await fetch(`${API_URL}/api/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || 'Failed to sign up');
        }

        // Automatically log in after signup
        await login(email, password);
      } else {
        // Login
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    // Create form data for OAuth2 password flow
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    // Direct API call to backend
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Failed to login');
    }

    const data = await response.json();
    
    // Store tokens using TokenManager
    TokenManager.setTokens(data.access_token, data.refresh_token);
    
    // Redirect to dashboard
    router.push('/dashboard');
  };

  return (
    <div className="relative">
      {/* Wolf logo positioned on top of the card */}
      <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 z-10 w-32 h-32">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 576 512" 
          className="w-full h-full"
        >
          {/* Howling wolf silhouette */}
          <path 
            d="M543.8 287.6c17 28.6 23.8 53.9 23.8 84.4 0 8.4-.7 17.5-2.1 27.1-12.6 4.4-25.5 6.9-38.5 6.9-45.9 0-77.2-27.9-87-72.3-11.4-21.2-11.3-48.1 3.7-68.2 13.3-17.9 34.1-28.9 56.4-28.9 7.9 0 15.6 1.3 23.7 4z"
            fill="#4B5563"
          />
          <path 
            d="M32.4 287.6c-17 28.6-23.8 53.9-23.8 84.4 0 8.4.7 17.5 2.1 27.1 12.6 4.4 25.5 6.9 38.5 6.9 45.9 0 77.2-27.9 87-72.3 11.4-21.2 11.3-48.1-3.7-68.2-13.3-17.9-34.1-28.9-56.4-28.9-7.9 0-15.6 1.3-23.7 4z"
            fill="#4B5563"
          />
          <path 
            d="M520 336.2c0 67.2-71.8 114.1-158.9 114.1-27.3 0-57.3-6.9-82.8-18.4-25.5 11.5-55.5 18.4-82.8 18.4-87 0-158.9-46.9-158.9-114.1 0-67.1 71.8-114 158.9-114 36.3 0 70.3 8.1 97.2 21.8 26.8-13.7 60.8-21.8 97.1-21.8 87.1 0 158.9 46.9 158.9 114 .1 0 .1 0 .3 0z"
            fill="#6B7280"
          />
          <path 
            d="M321.7 201.8c3.5-10.8 9.9-20.3 18.5-28.3 8.6-8 19.3-14.2 31.2-18 11.9-3.8 24.5-4.9 36.9-3.4 12.4 1.5 24.2 5.6 34.8 11.7 10.6 6.2 19.9 14.2 27.1 23.7 7.2 9.5 12.3 20.3 15 31.8 2.7 11.5 3 23.3.9 34.8-2.1 11.5-6.7 22.4-13.4 31.9-6.7 9.5-15.3 17.4-25.3 23.3-10 5.9-21.2 9.6-32.8 10.9-11.6 1.3-23.4.2-34.5-3.2-11.1-3.4-21.2-9-29.8-16.3-8.6-7.3-15.5-16.2-20.2-26.2-4.7-10-7.1-20.9-7.1-31.9 0-11 2.4-21.9 7.1-31.9l-8.4-8.9z"
            fill="#4B5563"
          />
          <path 
            d="M254.3 201.8c-3.5-10.8-9.9-20.3-18.5-28.3-8.6-8-19.3-14.2-31.2-18-11.9-3.8-24.5-4.9-36.9-3.4-12.4 1.5-24.2 5.6-34.8 11.7-10.6 6.2-19.9 14.2-27.1 23.7-7.2 9.5-12.3 20.3-15 31.8-2.7 11.5-3 23.3-.9 34.8 2.1 11.5 6.7 22.4 13.4 31.9 6.7 9.5 15.3 17.4 25.3 23.3 10 5.9 21.2 9.6 32.8 10.9 11.6 1.3 23.4.2 34.5-3.2 11.1-3.4 21.2-9 29.8-16.3 8.6-7.3 15.5-16.2 20.2-26.2 4.7-10 7.1-20.9 7.1-31.9 0-11-2.4-21.9-7.1-31.9l8.4-8.9z"
            fill="#4B5563"
          />
          <path 
            d="M288 32c-33.8 0-61.3 17.7-61.3 39.4v170.8c0 21.8 27.5 39.4 61.3 39.4s61.3-17.7 61.3-39.4V71.4c0-21.7-27.5-39.4-61.3-39.4z"
            fill="#374151"
          />
          <path 
            d="M288 219.8c-10.4 0-18.9-8.5-18.9-18.9v-25.3c0-10.4 8.5-18.9 18.9-18.9s18.9 8.5 18.9 18.9v25.3c0 10.4-8.5 18.9-18.9 18.9z"
            fill="#1F2937"
          />
          <path 
            d="M249.2 100.6c-7.7-7.7-20.1-7.7-27.8 0-7.7 7.7-7.7 20.1 0 27.8 7.7 7.7 20.1 7.7 27.8 0 7.7-7.7 7.7-20.1 0-27.8zM354.6 100.6c-7.7-7.7-20.1-7.7-27.8 0-7.7 7.7-7.7 20.1 0 27.8 7.7 7.7 20.1 7.7 27.8 0 7.7-7.7 7.7-20.1 0-27.8z"
            fill="#1F2937"
          />
          {/* Howling mouth */}
          <path 
            d="M288 156c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24s24-10.7 24-24v-48c0-13.3-10.7-24-24-24z"
            fill="#111827"
          />
        </svg>
      </div>

      <Card className="border-2 shadow-lg overflow-hidden mt-16">
        {/* Red accent bar at the top */}
        <div className="h-1 bg-gradient-to-r from-red-700 to-red-500"></div>
        
        <CardHeader>
          <CardTitle className="text-2xl">{isSignUp ? 'Create Account' : 'Sign In'}</CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Create a new account to get started' 
              : 'Sign in to your account to continue'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Form fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
              />
            </div>
            
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
                />
              </div>
            )}
            
            {/* Sign in/Sign up buttons */}
            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={loading}
              >
                {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </div>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm">
            {isSignUp ? (
              <p>
                Already have an account?{' '}
                <button 
                  onClick={() => {
                    setIsSignUp(false);
                    setError('');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-red-600 hover:underline"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{' '}
                <button 
                  onClick={() => {
                    setIsSignUp(true);
                    setError('');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-red-600 hover:underline"
                >
                  Create one
                </button>
              </p>
            )}
          </div>
          
          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our <a href="#" className="underline hover:text-red-600">Terms of Service</a> and <a href="#" className="underline hover:text-red-600">Privacy Policy</a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 