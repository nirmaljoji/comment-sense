import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiUrl() {
  return process.env.DEPLOY_ENV === "production"
    ? process.env.BACKEND_PUBLIC_PRODUCTION_API_URL
    : process.env.BACKEND_LOCAL_URL
}
