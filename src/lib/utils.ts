import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { logger } from "./logger"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiUrl() {
  const apiUrl = process.env.NODE_ENV === "production" 
    ? process.env.NEXT_PUBLIC_BACKEND_PRODUCTION_URL || 'https://comment-sense-qkru.onrender.com'
    : process.env.NEXT_PUBLIC_BACKEND_LOCAL_URL || 'http://localhost:8000'
    

  
  return apiUrl
}
