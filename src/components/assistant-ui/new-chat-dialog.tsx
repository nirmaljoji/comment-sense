import { FC } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * NewChatDialog Component
 * 
 * This component displays a confirmation dialog when starting a new chat.
 * It warns users that their current chat and files will not be saved.
 */
const NewChatDialog: FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  const handleNewChat = () => {
    // Close the dialog
    onOpenChange(false);
    
    // Refresh the page
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a New Chat?</DialogTitle>
          <DialogDescription>
            Are you sure you want to start a new chat? Your current chat and files will not be saved.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button 
            variant="default"
            onClick={handleNewChat}
          >
            Start New Chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewChatDialog;