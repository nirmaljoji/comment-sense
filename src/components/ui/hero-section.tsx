import React from 'react';
import Image from 'next/image';
import { Button } from './button';
import { ThreeDText } from './3d-text';

export function HeroSection() {
  return (
    <div className="relative overflow-hidden">
      <div className="flex flex-col justify-center space-y-8">
        {/* Main heading with 3D effect */}
        <div className="relative">
          <ThreeDText 
            text="NC STATE" 
            className="text-6xl md:text-7xl lg:text-8xl tracking-tight"
          />
          <div className="mt-4 max-w-[42rem]">
            <h2 className="text-2xl font-semibold text-red-600 dark:text-red-400">
              Comment Sense
            </h2>
            <p className="mt-2 text-lg text-muted-foreground sm:text-xl">
              The intelligent platform for course evaluation analysis.
              Gain valuable insights and make informed decisions with our AI-powered tools.
            </p>
          </div>
        </div>
        
        {/* Call to action buttons */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button size="lg" className="bg-red-600 hover:bg-red-700">
            Learn More
          </Button>
          <Button size="lg" variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
            Watch Demo
          </Button>
        </div>
        
        {/* Trust indicators */}
        <div className="mt-8">
          <p className="text-sm text-muted-foreground">
            Trusted by students and faculty across campus
          </p>
          <div className="mt-4 flex items-center gap-4">
            {/* Placeholder for logos/trust badges */}
            <div className="flex items-center justify-center h-10 w-28 rounded bg-muted">
              <span className="text-xs text-muted-foreground">College of Engineering</span>
            </div>
            <div className="flex items-center justify-center h-10 w-28 rounded bg-muted">
              <span className="text-xs text-muted-foreground">Student Affairs</span>
            </div>
            <div className="flex items-center justify-center h-10 w-28 rounded bg-muted">
              <span className="text-xs text-muted-foreground">Faculty Senate</span>
            </div>
          </div>
        </div>
        
        {/* Feature highlights */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-2 rounded-full bg-red-100 p-2 w-fit dark:bg-red-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
            </div>
            <h3 className="font-medium">Course Insights</h3>
            <p className="text-sm text-muted-foreground">Analyze course evaluations with AI-powered tools</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-2 rounded-full bg-red-100 p-2 w-fit dark:bg-red-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </div>
            <h3 className="font-medium">Smart Feedback</h3>
            <p className="text-sm text-muted-foreground">Get personalized recommendations for improvement</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-2 rounded-full bg-red-100 p-2 w-fit dark:bg-red-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                <path d="M3 3v18h18"></path>
                <path d="m19 9-5 5-4-4-3 3"></path>
              </svg>
            </div>
            <h3 className="font-medium">Data Visualization</h3>
            <p className="text-sm text-muted-foreground">View trends and patterns in course evaluations</p>
          </div>
        </div>
      </div>
    </div>
  );
} 