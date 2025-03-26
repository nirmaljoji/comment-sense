import { makeAssistantToolUI } from "@assistant-ui/react";
import { useState, useMemo } from "react";
 
type CourseEvaluationVectorsToolArgs = {
  toolName: string;
  argsText: string;
};

type CourseEvaluationVectorsToolResult = any;

interface Context {
  content: string;
  similarity_score: number;
}

interface ParsedResult {
  contexts: Context[];

}

export const CourseEvaluationVectors = makeAssistantToolUI<
CourseEvaluationVectorsToolArgs,
CourseEvaluationVectorsToolResult
>({
  toolName: "get_evaluations_context",
  render: ({ args, result, status }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    
    // Parse the result if it's a string in JSON format
    const parsedResult = useMemo(() => {
      if (typeof result === "string") {
        try {
          return JSON.parse(result) as ParsedResult;
        } catch (e) {
          console.error("Failed to parse result as JSON:", e);
          return null;
        }
      } else if (result && typeof result === "object") {
        return result as ParsedResult;
      }
      return null;
    }, [result]);
    
    // Function to format similarity score as percentage
    const formatScore = (score: number) => {
      return (score * 100).toFixed(1) + "%";
    };
    
    return (
      <div className="mb-4 flex w-full flex-col gap-3 rounded-lg border py-3">
        <div className="flex items-center gap-2 px-4">
          <span className="text-green-600">✓</span>
          <p className="">
            Looking into your <b>course evaluations</b> ...
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
                <div className="flex justify-between items-center mb-3">
                  <p className="font-semibold">Evaluation Contexts:</p>
                  {parsedResult?.contexts && (
                    <span className="text-sm text-gray-500">
                      {parsedResult.contexts.length} {parsedResult.contexts.length === 1 ? 'result' : 'results'}
                    </span>
                  )}
                </div>
                
                {parsedResult && parsedResult.contexts ? (
                  <div className="max-h-[400px] overflow-y-auto pr-2 -mr-2">
                    <div className="space-y-2">
                      {parsedResult.contexts.map((context, index) => (
                        <div 
                          key={index} 
                          className="rounded border border-gray-200 overflow-hidden"
                        >
                          <div className="flex justify-between items-center bg-gray-50 px-3 py-1.5 border-b">
                            <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
                            <span className="text-xs font-medium text-gray-500">{formatScore(context.similarity_score)}</span>
                          </div>
                          <div className="p-3 bg-white">
                            <p className="whitespace-pre-wrap text-sm text-gray-700 max-h-[150px] overflow-y-auto">{context.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap">
                    {typeof result === "string"
                      ? result
                      : JSON.stringify(result, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
});
