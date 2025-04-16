'use client';

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, Trash2, Upload } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { logger } from "@/lib/logger";
import { getApiUrl } from '@/lib/utils';
import { Progress } from "@/components/ui/progress";

interface CourseEvalSidebarProps {
  files: { id: string; name: string }[];
  onDeleteFile: (id: string) => void;

  onFileUploaded: (file: { id: string; name: string }) => void;
}

export function CourseEvalSidebar({ files, onDeleteFile, onFileUploaded }: CourseEvalSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [processingStats, setProcessingStats] = useState<any>({});
  const [processingStage, setProcessingStage] = useState<string>("");

  const API_URL = getApiUrl()

  // Add event listener for the custom event
  useEffect(() => {
    const handleTriggerUpload = () => {
      handleAddClick();
    };
    
    window.addEventListener('trigger-eval-upload', handleTriggerUpload);
    
    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener('trigger-eval-upload', handleTriggerUpload);
    };
  }, []);
  
  // Effect to poll for progress updates when a file is being uploaded
  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null;
    let previousProgress = 0;
    
    if (isUploading && currentFileId) {
      // Start polling for progress
      progressInterval = setInterval(async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_URL}/api/files/progress/${currentFileId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const progressData = await response.json();
            
            // Implement smooth progress transitions
            const newProgress = progressData.progress || 0;
            
            // If progress is going backwards or jumping too much, smooth it out
            if (newProgress < previousProgress || newProgress - previousProgress > 20) {
              // Animate to the new value gradually
              const animateProgress = () => {
                setUploadProgress(prev => {
                  // Move 10% of the way to the target each frame
                  const step = (newProgress - prev) * 0.1;
                  return prev + step;
                });
              };
              
              // Update progress smoothly a few times
              const animation = setInterval(animateProgress, 100);
              setTimeout(() => clearInterval(animation), 500);
            } else {
              // Normal progress update
              setUploadProgress(newProgress);
            }
            
            previousProgress = newProgress;
            setUploadStatus(progressData.message || "");
            setProcessingStats(progressData.stats || {});
            setProcessingStage(progressData.status || "");
            
            // If processing is complete or errored, stop polling and reset upload state
            if (progressData.status === 'completed' || progressData.status === 'error') {
              // Set upload state to false to stop the spinner and change button text
              setIsUploading(false);
              setCurrentFileId(null);
              
              if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
              }
              
              // If there was an error, show it
              if (progressData.status === 'error') {
                toast.error(progressData.message || "An error occurred during file processing");
              }
            }
          }
        } catch (error) {
          logger.error('Error fetching progress:', error);
        }
      }, 1000); // Poll every second
    }
    
    // Cleanup interval on unmount or when upload completes
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [isUploading, currentFileId, API_URL]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a PDF, CSV, XLS, or XLSX file.');
      return;
    }

    // Check file size (e.g., 10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File is too large. Maximum size is 10MB.');
      return;
    }
setIsUploading(true);
setUploadProgress(0);
setUploadStatus("Preparing upload...");
setProcessingStage("started");

// Generate a unique ID for the file
const fileId = uuidv4();
setCurrentFileId(fileId);

const formData = new FormData();
    
    formData.append('file', file);
    formData.append('file_id', fileId);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/api/files/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      logger.info('File uploaded successfully:', data);
      
      // Update local files state with new file
      const newFile = {
        id: fileId,
        name: file.name
      };
      
      // You'll need to implement this function in MyAssistant
      onFileUploaded(newFile);
      
      toast.success('File uploaded successfully');
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      logger.error('Upload error:', error);
      toast.error('Failed to upload file. Please try again.');
    } finally {
      // We'll reset the upload state in the polling effect when it detects completion
      // Don't reset here as we want to keep showing progress
    }
  };

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.csv,.xls,.xlsx"
        onChange={handleFileUpload}
      />

      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Course Evaluations</h2>
        <p className="text-sm text-gray-500">Manage your evaluation files</p>
      </div>

      {/* File List */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 py-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="group grid grid-cols-[1fr_auto] gap-2 items-center rounded-lg p-2 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-[#CC0000] flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate">{file.name}</span>
              </div>
              
              <div className="flex-shrink-0">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-70 hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4 text-gray-500 hover:text-[#CC0000]" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Evaluation File</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{file.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-[#CC0000] hover:bg-[#990000]"
                        onClick={() => onDeleteFile(file.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Add File Button and Progress Card */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        {isUploading && (
          <div className="mb-3 rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Progress Card Header */}
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">Processing Evaluation</h3>
                <span className="text-sm font-semibold text-[#CC0000]">{Math.round(uploadProgress)}%</span>
              </div>
            </div>
            
            {/* Progress Card Body */}
            <div className="p-3 bg-white">
              {/* Progress Bar */}
              <Progress
                value={uploadProgress}
                className="h-2 w-full mb-3"
                indicatorClassName={`transition-all duration-500 ease-out ${uploadProgress === 100 ? "bg-green-500" : "bg-[#CC0000]"}`}
              />
              
              {/* Status Message */}
              <div className="text-sm text-gray-600 mb-2">
                {uploadStatus || "Processing file..."}
              </div>
              
              {/* Processing Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-2">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span>
                    {processingStats.processed_chunks ?
                      `${processingStats.processed_chunks} of ${processingStats.total_chunks || '?'} chunks processed` :
                      processingStats.total_chunks ?
                        `${processingStats.total_chunks} chunks created` :
                        "Analyzing content"}
                  </span>
                </div>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    {processingStats.estimated_time_remaining ?
                      `Est. time: ${processingStats.estimated_time_remaining}` :
                      uploadProgress < 95 ?
                        "Est. time: <1 min" :
                        "Completing..."}
                  </span>
                </div>
              </div>
              
              {/* Stage Indicator */}
              <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex justify-between items-center">
                  <span className="capitalize">
                    {uploadProgress === 0 ? "Starting" :
                     uploadProgress >= 95 ? "Finalizing" :
                     processingStats.current_stage ? processingStats.current_stage.replace('_', ' ') :
                     processingStage ? processingStage.replace('_', ' ') :
                     "Processing"}
                  </span>
                  {processingStats.current_batch && processingStats.total_batches && (
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                      Batch {processingStats.current_batch}/{processingStats.total_batches}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <Button
          onClick={handleAddClick}
          className="w-full bg-[#CC0000] hover:bg-[#990000] text-white"
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Upload className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Evaluation
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 