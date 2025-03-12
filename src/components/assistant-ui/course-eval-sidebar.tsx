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
import { useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { logger } from "@/lib/logger";

interface CourseEvalSidebarProps {
  files: { id: string; name: string }[];
  onDeleteFile: (id: string) => void;

  onFileUploaded: (file: { id: string; name: string }) => void;
}

export function CourseEvalSidebar({ files, onDeleteFile, onFileUploaded }: CourseEvalSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

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
    const formData = new FormData();
    
    // Generate a unique ID for the file
    const fileId = uuidv4();
    
    formData.append('file', file);
    formData.append('file_id', fileId);

    try {
      const response = await fetch('http://localhost:8000/api/files/upload', {
        method: 'POST',
        body: formData,
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
      setIsUploading(false);
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
              className="group flex items-center justify-between rounded-lg p-2 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#CC0000]" />
                <span className="text-sm text-gray-700">{file.name}</span>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
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
          ))}
        </div>
      </ScrollArea>

      {/* Add File Button */}
      <div className="p-4 border-t border-gray-200">
        <Button
          onClick={handleAddClick}
          className="w-full bg-[#CC0000] hover:bg-[#990000] text-white"
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Upload className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
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