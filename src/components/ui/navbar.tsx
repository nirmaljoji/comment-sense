'use client';

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Progress } from "./progress";

interface NavbarProps {
  requestsUsed?: number;
  requestsLimit?: number;
}

export function Navbar({ requestsUsed = 0, requestsLimit = 100 }: NavbarProps) {
  return (
    <div className="border-b bg-white">
      <div className="flex h-16 items-center px-4 md:px-6">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold text-[#CC0000]">Comment Sense</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              Requests: {requestsUsed}/{requestsLimit}
            </div>
            <div className="w-32">
              <Progress 
                value={(requestsUsed / requestsLimit) * 100} 
                className="h-2"
                indicatorClassName="bg-[#CC0000]"
              />
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </div>
    </div>
  );
} 