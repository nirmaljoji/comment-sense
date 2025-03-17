import { FC, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// Define the available AI models
const models = [
  {
    id: "anthropic",
    name: "Anthropic",
    logo: "/anthropic-logo.svg", // Path to your logo 
    fallbackLogo: (
      <div className="flex items-center justify-center size-5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
        <span className="text-purple-600 dark:text-purple-400 text-xs font-bold">A</span>
      </div>
    ),
  },
  {
    id: "gemini",
    name: "Gemini",
    logo: "/gemini-logo.svg", // Path to your logo
    fallbackLogo: (
      <div className="flex items-center justify-center size-5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
        <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">G</span>
      </div>
    ),
  },
  {
    id: "openai",
    name: "OpenAI",
    logo: "/openai-logo.svg", // Path to your logo
    fallbackLogo: (
      <div className="flex items-center justify-center size-5 bg-green-100 dark:bg-green-900/30 rounded-full">
        <span className="text-green-600 dark:text-green-400 text-xs font-bold">O</span>
      </div>
    ),
  },
];

export const ModelSelector: FC = () => {
  const [selectedModel, setSelectedModel] = useState(models[0]);

  return (
    <div className="absolute top-4 right-6 z-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 pr-3 pl-2 h-9 border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              {/* Try to load the image, fall back to the placeholder */}
              <div className="relative size-5">
                {selectedModel.fallbackLogo}
                <img
                  src={selectedModel.logo}
                  alt={`${selectedModel.name} logo`}
                  className="absolute inset-0 size-5 object-contain opacity-0 transition-opacity duration-300"
                  onLoad={(e) => {
                    (e.target as HTMLImageElement).classList.remove("opacity-0");
                    (e.target as HTMLImageElement).classList.add("opacity-100");
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <span className="text-sm font-medium">{selectedModel.name}</span>
            </div>
            <ChevronDown className="size-4 ml-1 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-48 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-gray-200 dark:border-gray-700"
        >
          {models.map((model) => (
            <DropdownMenuItem
              key={model.id}
              className={cn(
                "flex items-center gap-2 cursor-pointer px-3 py-2",
                selectedModel.id === model.id && "bg-gray-100 dark:bg-gray-700/50"
              )}
              onClick={() => setSelectedModel(model)}
            >
              <div className="relative size-5">
                {model.fallbackLogo}
                <img
                  src={model.logo}
                  alt={`${model.name} logo`}
                  className="absolute inset-0 size-5 object-contain opacity-0 transition-opacity duration-300"
                  onLoad={(e) => {
                    (e.target as HTMLImageElement).classList.remove("opacity-0");
                    (e.target as HTMLImageElement).classList.add("opacity-100");
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <span className="text-sm">{model.name}</span>
              
              {selectedModel.id === model.id && (
                <Check className="size-4 ml-auto text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};