import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VideoDemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Replace VIDEO_ID with your actual YouTube video ID when ready
const VIDEO_ID = 'rH7JrXC797g'; // Placeholder video ID

const VideoDemoDialog: React.FC<VideoDemoDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Comment Sense Demo
          </DialogTitle>
        </DialogHeader>
        
        <div className="aspect-video w-full mt-4">
          <iframe
            className="w-full h-full rounded-lg"
            src={`https://www.youtube.com/embed/${VIDEO_ID}`}
            title="Comment Sense Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Watch this quick demo to see how Comment Sense can help you analyze course evaluations
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoDemoDialog; 