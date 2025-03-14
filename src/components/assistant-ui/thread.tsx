import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import type { FC } from "react";
import {
  ArrowDownIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
  SendHorizontalIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  StarIcon,
  PlusCircleIcon,
  HelpCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "../ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import LearnToUseDialog from "./learn-to-use-dialog";
import NewChatDialog from "./new-chat-dialog";
import { getApiUrl } from '@/lib/utils'
/* -------------------------------------------------------------------------
   useAutoScroll hook – continuously drives the scroll position using
   requestAnimationFrame and a small "bottom offset" so that the currently
   streaming text remains visible.
-------------------------------------------------------------------------- */
function useAutoScroll() {
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  // Define the extra space (in px) below the generated text before the Composer.
  const bottomPadding = 30;
  const lastScrollPos = useRef({ top: 0, height: 0 });
  const animRef = useRef<number | null>(null);

  // Handle user scroll events: if the user scrolls up (and not due to content growth),
  // disable auto scrolling; if the user reaches the bottom, re-enable it.
  const handleScroll = useCallback(() => {
    if (!scrollViewportRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setShowScrollButton(!isAtBottom);

    const scrollingUp = scrollTop < lastScrollPos.current.top;
    const contentGrew = scrollHeight > lastScrollPos.current.height;
    lastScrollPos.current = { top: scrollTop, height: scrollHeight };

    if (scrollingUp && !contentGrew) {
      setIsAutoScrolling(false);
    } else if (isAtBottom) {
      setIsAutoScrolling(true);
    }
  }, []);

  // Continuous scrolling effect. While auto scrolling is enabled,
  // we update scrollTop a fraction of the difference toward the target on every frame.
  useEffect(() => {
    if (!isAutoScrolling) {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      return;
    }

    function animate() {
      if (!scrollViewportRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current;
      const target = scrollHeight - clientHeight + bottomPadding;

      if (scrollTop < target) {
        // Advance by 10% of the remaining distance, with a minimum of 1px per frame.
        const newScrollTop = scrollTop + Math.max((target - scrollTop) * 0.1, 1);
        scrollViewportRef.current.scrollTop = newScrollTop;
      }
      animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [isAutoScrolling, bottomPadding]);

  // Listen for the custom "thread-message-send" event to re-enable auto scrolling.
  useEffect(() => {
    const handleMessageSend = () => {
      setIsAutoScrolling(true);
    };
    window.addEventListener("thread-message-send", handleMessageSend);
    return () => window.removeEventListener("thread-message-send", handleMessageSend);
  }, []);

  // On initial mount, scroll to the bottom.
  useEffect(() => {
    if (scrollViewportRef.current) {
      const { scrollHeight, clientHeight } = scrollViewportRef.current;
      scrollViewportRef.current.scrollTop = scrollHeight - clientHeight + bottomPadding;
    }
  }, [bottomPadding]);

  return {
    scrollViewportRef,
    handleScroll,
    showScrollButton,
    setIsAutoScrolling,
  };
}

/* -------------------------------------------------------------------------
   Main Thread Component (integrating the useAutoScroll hook)
-------------------------------------------------------------------------- */
export const Thread: FC = () => {
  const { scrollViewportRef, handleScroll, showScrollButton, setIsAutoScrolling } =
    useAutoScroll();

  return (
    <ThreadPrimitive.Root
      className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 box-border flex h-full flex-col overflow-hidden shadow-lg rounded-xl border border-gray-200 dark:border-gray-700"
      style={{
        ["--thread-max-width" as string]: "42rem",
        height: "100%",
      }}
    >
      {/* Messages Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <ScrollAreaPrimitive.Root className="relative flex-1 h-0">
          <ScrollAreaPrimitive.Viewport
            ref={scrollViewportRef}
            onScroll={handleScroll}
            className="absolute inset-0 overflow-y-auto"
          >
            <ThreadPrimitive.Viewport className="flex h-full flex-col items-center bg-inherit px-6 pt-8">
              <ThreadWelcome />
              <ThreadPrimitive.Messages
                components={{
                  UserMessage,
                  EditComposer,
                  AssistantMessage,
                }}
              />
              <ThreadPrimitive.If empty={false}>
                <div className="min-h-8 flex-grow" />
              </ThreadPrimitive.If>
              {/* Add a spacer at the bottom to ensure a small gap above the Composer */}
              <div style={{ minHeight: "30px" }} />
            </ThreadPrimitive.Viewport>
          </ScrollAreaPrimitive.Viewport>
          <ScrollAreaPrimitive.Scrollbar
            orientation="vertical"
            className="w-2.5 bg-gray-100/50 dark:bg-gray-800/50 rounded-r-lg transition-colors duration-150 hover:bg-gray-200/60 dark:hover:bg-gray-700/60"
          >
            <ScrollAreaPrimitive.Thumb className="bg-gray-400/50 dark:bg-gray-600/50 rounded-full relative before:content-[''] before:absolute before:inset-0" />
          </ScrollAreaPrimitive.Scrollbar>
        </ScrollAreaPrimitive.Root>
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={() => {
            setIsAutoScrolling(true);
          }}
          className="absolute bottom-24 right-8 z-10 rounded-full bg-primary text-primary-foreground shadow-md p-2 opacity-80 hover:opacity-100 transition-opacity"
          aria-label="Scroll to bottom"
        >
          <ArrowDownIcon className="h-5 w-5" />
        </button>
      )}

      {/* Composer Area */}
      <div className="w-full bg-inherit px-6 py-4 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="relative flex w-full max-w-[var(--thread-max-width)] mx-auto">
          <Composer
            onSend={() => {
              setIsAutoScrolling(true);
              // No forced jump needed; the continuous animation will scroll to show new content.
              setTimeout(() => {
                /* Allow the new message to render and be scrolled into view by continuous scrolling */
              }, 10);
            }}
          />
        </div>
      </div>
    </ThreadPrimitive.Root>
  );
};

/* -------------------------------------------------------------------------
   Composer Component – with added New Chat and Learn to Use options
-------------------------------------------------------------------------- */
const Composer: FC<{ onSend?: () => void }> = ({ onSend }) => {
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [learnDialogOpen, setLearnDialogOpen] = useState(false);

  return (
    <>
      <div className="flex w-full items-center gap-2">
        <div className="flex items-center gap-3 mr-4">
          <LargeIconButton
            tooltip="New Chat"
            onClick={() => setNewChatDialogOpen(true)}
          >
            <PlusCircleIcon className="h-1 w-1 size-5" />
          </LargeIconButton>
          
          <LargeIconButton
            tooltip="Learn to Use"
            onClick={() => setLearnDialogOpen(true)}
          >
            <HelpCircleIcon className="h-1 w-1 size-5" />
          </LargeIconButton>
        </div>
        
        <ComposerPrimitive.Root
          className="focus-within:border-ring/20 flex w-full flex-wrap items-end rounded-lg border bg-inherit px-2.5 shadow-sm transition-colors ease-in"
          onSubmit={onSend}
        >
          <ComposerPrimitive.Input
            rows={1}
            autoFocus
            placeholder="Write a message..."
            className="composer-input placeholder:text-muted-foreground max-h-40 flex-grow resize-none border-none bg-transparent px-2 py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
          />
          <ComposerAction />
        </ComposerPrimitive.Root>
      </div>

      {/* New Chat Confirmation Dialog */}
      <NewChatDialog 
        open={newChatDialogOpen} 
        onOpenChange={setNewChatDialogOpen} 
      />

      {/* Learn to Use Dialog */}
      <LearnToUseDialog 
        open={learnDialogOpen} 
        onOpenChange={setLearnDialogOpen} 
      />
    </>
  );
};

/* -------------------------------------------------------------------------
   Other Components (preserved implementations)
-------------------------------------------------------------------------- */
const ThreadWelcome: FC = () => {
  return (
    <ThreadPrimitive.Empty>
      <div className="flex w-full max-w-[var(--thread-max-width)] flex-col items-center space-y-5 py-8">
        {/* Simple animated icon - academic hat with sparkle */}
        <div className="relative size-14 text-blue-600 dark:text-blue-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-14 animate-pulse">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="absolute -right-1 -top-1 text-yellow-400">
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 animate-bounce" style={{ animationDuration: '2s' }}>
              <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
            </svg>
          </span>
        </div>
        
        {/* Title and description */}
        <div className="text-center space-y-2 max-w-md">
          <h3 className="text-xl font-semibold">Course Evaluation Assistant</h3>
          <p className="text-sm text-muted-foreground">
            Upload evaluations, get insights, and discover strategies to enhance your teaching.
          </p>
        </div>
        
        {/* Warning message about data persistence */}
        <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-md max-w-md">
          <p className="text-xs text-red-600 dark:text-red-400">
            <span className="font-semibold">Note:</span> All chats and uploaded files are deleted when you refresh or start a new chat. Please save important insights before closing.
          </p>
        </div>
        
        {/* Example questions - just two as requested */}
        <div className="flex flex-col sm:flex-row w-full gap-3 max-w-md">
          <ThreadPrimitive.Suggestion
            className="hover:bg-blue-50 dark:hover:bg-blue-900/20 flex flex-col justify-center rounded-lg border border-blue-100 dark:border-blue-900/30 p-2.5 transition-colors ease-in text-center"
            prompt="What areas from my course evaluations need the most improvement?"
            method="replace"
            autoSend
          >
            <span className="text-sm">
              Analyze evaluation weak points
            </span>
          </ThreadPrimitive.Suggestion>
          
          <ThreadPrimitive.Suggestion
            className="hover:bg-blue-50 dark:hover:bg-blue-900/20 flex flex-col justify-center rounded-lg border border-blue-100 dark:border-blue-900/30 p-2.5 transition-colors ease-in text-center"
            prompt="Analyze https://cft.vanderbilt.edu/guides-sub-pages/student-evaluations/ for teaching improvement tips"
            method="replace"
            autoSend
          >
            <span className="text-sm">
              Extract tips from URL
            </span>
          </ThreadPrimitive.Suggestion>
        </div>
        
        {/* Feedback reminder */}
        <div className="flex items-center text-xs text-muted-foreground pt-4">
          <ThumbsUpIcon className="size-3.5 mr-1.5" />
          <span>Your feedback helps us improve this assistant</span>
        </div>
      </div>
    </ThreadPrimitive.Empty>
  );
};

const ComposerAction: FC = () => {
  return (
    <>
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send"
            variant="default"
            className="my-2.5 size-8 p-2 transition-opacity ease-in"
          >
            <SendHorizontalIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel asChild>
          <TooltipIconButton
            tooltip="Cancel"
            variant="default"
            className="my-2.5 size-8 p-2 transition-opacity ease-in"
          >
            <CircleStopIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 [&:where(>*)]:col-start-2 w-full max-w-[var(--thread-max-width)] py-4">
      <UserActionBar />
      <div className="bg-muted text-foreground max-w-[calc(var(--thread-max-width)*0.8)] break-words rounded-3xl px-5 py-2.5 col-start-2 row-start-2">
        <MessagePrimitive.Content />
      </div>
      <BranchPicker className="col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="flex flex-col items-end col-start-1 row-start-2 mr-3 mt-2.5"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="bg-muted my-4 flex w-full max-w-[var(--thread-max-width)] flex-col gap-2 rounded-xl">
      <ComposerPrimitive.Input className="composer-input text-foreground flex h-8 w-full resize-none bg-transparent p-4 pb-0 outline-none" />
      <div className="mx-3 mb-3 flex items-center justify-center gap-2 self-end">
        <ComposerPrimitive.Cancel asChild>
          <Button variant="ghost">Cancel</Button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <Button>Send</Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="grid grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] relative w-full max-w-[var(--thread-max-width)] py-4">
      <div className="text-foreground max-w-[calc(var(--thread-max-width)*0.8)] break-words leading-7 col-span-2 col-start-2 row-start-1 my-1.5">
        <MessagePrimitive.Content components={{ Text: MarkdownText }} />
      </div>
      <AssistantActionBar />
      <BranchPicker className="col-start-2 row-start-2 -ml-2 mr-2" />
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative' | null>(null);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  const handleFeedbackSubmit = async () => {
    const token = localStorage.getItem('token');
    const API_URL = getApiUrl()
    try {
      // Send the feedback data to the backend
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          feedback_type: feedbackType,
          rating,
          feedback_text: feedbackText,
          // You can add user_id and message_id here if available
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }
      
      console.log('Feedback submitted successfully');
      
      // Reset the form
      setRating(0);
      setFeedbackText('');
      setFeedbackDialogOpen(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // You could show an error message to the user here
    }
  };

  const openFeedbackDialog = (type: 'positive' | 'negative') => {
    setFeedbackType(type);
    setFeedbackDialogOpen(true);
  };

  return (
    <>
      <ActionBarPrimitive.Root
        hideWhenRunning
        autohide="not-last"
        autohideFloat="single-branch"
        className="text-muted-foreground flex gap-1 col-start-3 row-start-2 -ml-1 data-[floating]:bg-background data-[floating]:absolute data-[floating]:rounded-md data-[floating]:border data-[floating]:p-1 data-[floating]:shadow-sm"
      >
        <ActionBarPrimitive.Copy asChild>
          <TooltipIconButton tooltip="Copy">
            <MessagePrimitive.If copied>
              <CheckIcon />
            </MessagePrimitive.If>
            <MessagePrimitive.If copied={false}>
              <CopyIcon />
            </MessagePrimitive.If>
          </TooltipIconButton>
        </ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Reload asChild>
          <TooltipIconButton tooltip="Refresh">
            <RefreshCwIcon />
          </TooltipIconButton>
        </ActionBarPrimitive.Reload>
        <TooltipIconButton 
          tooltip="Helpful" 
          onClick={() => openFeedbackDialog('positive')}
        >
          <ThumbsUpIcon />
        </TooltipIconButton>
        <TooltipIconButton 
          tooltip="Not Helpful" 
          onClick={() => openFeedbackDialog('negative')}
        >
          <ThumbsDownIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Root>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {feedbackType === 'positive' ? 'What was helpful?' : 'What could be improved?'}
            </DialogTitle>
            <DialogDescription>
              Please rate this response and provide any feedback.
            </DialogDescription>
          </DialogHeader>
          
          {/* Star Rating */}
          <div className="flex items-center justify-center space-x-1 py-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={cn(
                  "rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-primary",
                  star <= rating ? "text-yellow-400" : "text-gray-300"
                )}
                onClick={() => setRating(star)}
              >
                <StarIcon className="h-8 w-8" />
              </button>
            ))}
          </div>
          
          {/* Feedback Text Area */}
          <Textarea
            placeholder={feedbackType === 'positive' ? "What did you find helpful about this response?" : "How could this response be improved?"}
            value={feedbackText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedbackText(e.target.value)}
            className="min-h-[100px]"
          />
          
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              type="submit" 
              onClick={handleFeedbackSubmit}
              disabled={rating === 0}
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn("text-muted-foreground inline-flex items-center text-xs", className)}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

const CircleStopIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      width="16"
      height="16"
    >
      <rect width="10" height="10" x="3" y="3" rx="2" />
    </svg>
  );
};

/* -------------------------------------------------------------------------
   Custom Large Icon Button Component
-------------------------------------------------------------------------- */
const LargeIconButton: FC<{
  tooltip: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ tooltip, onClick, children }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className="size-14 p-0 text-muted-foreground hover:text-foreground [&_svg]:!size-10 [&_svg]:!w-7 [&_svg]:!h-7"
            onClick={onClick}
          >
            {children}
            <span className="sr-only">{tooltip}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};