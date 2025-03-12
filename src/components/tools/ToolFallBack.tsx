
import { makeAssistantToolUI } from "@assistant-ui/react";
import { useState } from "react";
 
type ToolFallbackArgs = {
  toolName: string;
  argsText: string;
};

type ToolFallbackResult = any;

export const ToolFallback = makeAssistantToolUI<
  ToolFallbackArgs,
  ToolFallbackResult
>({
  toolName: "get_stock_price",
  render: ({ args, result, status }) => {

    console.log("HELLLOOOOO"+ result)
    const [isCollapsed, setIsCollapsed] = useState(true);
    return (
      <div className="mb-4 flex w-full flex-col gap-3 rounded-lg border py-3">
        <div className="flex items-center gap-2 px-4">
          <span className="text-green-600">✓</span>
          <p className="">
            Used tool: <b>{args.toolName}</b>
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
              <pre className="whitespace-pre-wrap">{args.argsText}</pre>
            </div>
            {result !== undefined && (
              <div className="border-t border-dashed px-4 pt-2">
                <p className="font-semibold">Result:</p>
                <pre className="whitespace-pre-wrap">
                  {typeof result === "string"
                    ? result
                    : JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
});
