'use client';

// import { useEdgeRuntime } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { useVercelUseChatRuntime } from '@assistant-ui/react-ai-sdk';
import { MarkdownText } from '@/components/assistant-ui/markdown-text';
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { ThreadList } from "./assistant-ui/thread-list";
import { CourseEvalSidebar } from "./assistant-ui/course-eval-sidebar";
import { useState } from "react";
import { CourseEvaluationVectors } from "./tools/CourseEvaluationVectors";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { WebScraping } from "./tools/WebScraping";
import { TeachingMaterial } from "./tools/TeachingMaterial";
import { getApiUrl } from '@/lib/utils'

interface MyAssistantProps {
  chatId: string | null;
}

export function MyAssistant({ chatId }: MyAssistantProps) {
  // const runtime = useEdgeRuntime({ api: "/api/chat" });

  const token = localStorage.getItem('token');
  const API_URL = getApiUrl()
  const runtime = useChatRuntime({
    api: `${API_URL}/api/chat`,
    headers: {
      'X-Chat-ID': chatId || '',
      'Authorization': `Bearer ${token}`
    }
  });

  // This is example data - you should replace this with your actual file management logic
  const [files, setFiles] = useState<Array<{ id: string; name: string }>>([]);

  const handleDeleteFile = async (id: string) => {
    try {
      // Call API to delete file
      const response = await fetch(`${API_URL}/api/files/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      // Update UI
      setFiles(files.filter(file => file.id !== id));
      logger.info('File deleted successfully:', id);
      toast.success('File deleted successfully');
    } catch (error) {
      logger.error('Delete error:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleAddFile = () => {
    // Add your file upload logic here
    console.log('Add file clicked');
  };

  const handleFileUploaded = (newFile: { id: string; name: string }) => {
    setFiles(prevFiles => [...prevFiles, newFile]);
  };

  return (
    <AssistantRuntimeProvider 
    runtime={runtime}
    >
       <CourseEvaluationVectors />
       <WebScraping />
       <TeachingMaterial/>
      <div className="grid h-[calc(100vh-4rem)] grid-cols-[280px_1fr]">
        <CourseEvalSidebar
          files={files}
          onDeleteFile={handleDeleteFile}
          onFileUploaded={handleFileUploaded}
        />
        
        <div className="px-4 py-4">
          <Thread />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}