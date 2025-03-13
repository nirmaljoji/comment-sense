"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HeroSection } from "@/components/ui/hero-section";
import { AuthCard } from "@/components/ui/auth-card";
import { BackgroundPattern } from "@/components/ui/background-pattern";
import { getApiUrl } from '@/lib/utils'

// Backend API URL - you can also use an environment variable
const API_URL = getApiUrl();

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    
    if (token) {
      // Verify token validity
      const verifyToken = async () => {
        try {
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            // Token is valid, redirect to dashboard
            router.push('/dashboard');
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('token');
            setLoading(false);
          }
        } catch (error) {
          console.error('Error verifying authentication:', error);
          localStorage.removeItem('token');
          setLoading(false);
        }
      };

      verifyToken();
    } else {
      setLoading(false);
    }
  }, [router]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 md:p-8 lg:p-12">
      {/* Background pattern */}
      <BackgroundPattern />
      
      <div className="container grid w-full max-w-7xl grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left section (2/3 of screen on large devices) */}
        <div className="col-span-1 flex flex-col justify-center lg:col-span-2">
          <HeroSection />
        </div>

        {/* Right section (1/3 of screen on large devices) */}
        <div className="col-span-1">
          <AuthCard />
        </div>
      </div>
    </main>
  );
}