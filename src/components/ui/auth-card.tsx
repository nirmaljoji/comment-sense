"use client";

import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/utils'
import { Switch } from './switch';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'; // Import tooltip components

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
  const [enableLogging, setEnableLogging] = useState(false); // Changed default to false
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

        // Sign up - direct API call to backend (now includes enableLogging)
        const response = await fetch(`${API_URL}/api/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, enable_logging: enableLogging }), // Use snake_case for API
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
      // Convert detail to string to avoid [object Object] errors
    
      throw new Error('Failed to login');
    }

    const data = await response.json();
    
    // Store tokens using TokenManager
    TokenManager.setTokens(data.access_token, data.refresh_token);
    
    // Redirect to dashboard
    router.push('/dashboard');
  };

  return (
    <div className="relative">
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
              <>
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
                
                {/* New logging opt-in slider with info icon */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-2">
                    <label htmlFor="logging-toggle" className="text-sm font-medium">
                      Enable logging
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoCircledIcon className="h-4 w-4 text-gray-500 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs p-3">
                          <p>The data we collect is only used to improve the responses of the bot. We cannot access your uploaded Course Evaluations. Opting in for logging will only show us the model's responses.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch
                    id="logging-toggle"
                    checked={enableLogging}
                    onCheckedChange={(checked) => {
                      console.log('Logging preference changed:', checked);
                      setEnableLogging(checked);
                    }}
                    className="data-[state=checked]:bg-red-600"
                  />
                </div>
              </>
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
          {/* Footer content - unchanged */}
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
                    // Note: enableLogging state is preserved intentionally
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
                    // Note: enableLogging state is preserved intentionally
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
