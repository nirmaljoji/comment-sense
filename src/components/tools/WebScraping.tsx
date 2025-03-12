import { makeAssistantToolUI } from "@assistant-ui/react";
import { useState } from "react";

type WebScrapingToolArgs = {
  url: string;
};

type WebScrapingToolResult = any;

export const WebScraping = makeAssistantToolUI<
  WebScrapingToolArgs,
  WebScrapingToolResult
>({
  toolName: "fetch",
  render: ({ args, result, status }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    
    return (
      <div className="mb-4 flex w-full flex-col gap-3 rounded-lg border py-3">
        <div className="flex items-center gap-2 px-4">
          <span className="text-blue-600">🌐</span>
          <p className="">
            Used tool: <b>Web Scraping Tool</b>
          </p>
          <div className="flex-grow" />
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>
        {!isCollapsed && (
          <div className="flex flex-col gap-2 border-t pt-2">
            <div className="px-4">
              {args.url}
            </div>
          </div>
        )}
      </div>
    );
  },
});