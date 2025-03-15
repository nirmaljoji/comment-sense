import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { logger } from "./logger"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiUrl() {
  const apiUrl = process.env.NODE_ENV === "production" 
    ? 'https://comment-sense-1.onrender.com'
    : 'http://localhost:8000'
    

  
  return apiUrl
}
