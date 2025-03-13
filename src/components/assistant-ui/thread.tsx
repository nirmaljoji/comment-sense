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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

/* -------------------------------------------------------------------------
   useAutoScroll hook – continuously drives the scroll position using
   requestAnimationFrame and a small “bottom offset” so that the currently
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
   Composer Component – unchanged except for the onSend prop
-------------------------------------------------------------------------- */
const Composer: FC<{ onSend?: () => void }> = ({ onSend }) => {
  return (
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
  );
};

/* -------------------------------------------------------------------------
   Other Components (preserved implementations)
-------------------------------------------------------------------------- */
const ThreadWelcome: FC = () => {
  return (
    <ThreadPrimitive.Empty>
      <div className="flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col">
        <div className="flex w-full flex-grow flex-col items-center justify-center">
          <p className="mt-4 font-medium">How can I help you today?</p>
        </div>
        <ThreadWelcomeSuggestions />
      </div>
    </ThreadPrimitive.Empty>
  );
};

const ThreadWelcomeSuggestions: FC = () => {
  return (
    <div className="mt-3 flex w-full items-stretch justify-center gap-4">
      <ThreadPrimitive.Suggestion
        className="hover:bg-muted/80 flex max-w-sm grow basis-0 flex-col items-center justify-center rounded-lg border p-3 transition-colors ease-in"
        prompt="What is the weather in Tokyo?"
        method="replace"
        autoSend
      >
        <span className="line-clamp-2 text-ellipsis text-sm font-semibold">
          What is the weather in Tokyo?
        </span>
      </ThreadPrimitive.Suggestion>
      <ThreadPrimitive.Suggestion
        className="hover:bg-muted/80 flex max-w-sm grow basis-0 flex-col items-center justify-center rounded-lg border p-3 transition-colors ease-in"
        prompt="What is assistant-ui?"
        method="replace"
        autoSend
      >
        <span className="line-clamp-2 text-ellipsis text-sm font-semibold">
          What is assistant-ui?
        </span>
      </ThreadPrimitive.Suggestion>
    </div>
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
  return (
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
    </ActionBarPrimitive.Root>
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