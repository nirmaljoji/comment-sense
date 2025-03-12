import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ScrollBar } from "@/components/ui/scroll-area";
import { ThreadPrimitive } from "@assistant-ui/react";
 
const MyThread: FC = () => {
  return (
    <ScrollAreaPrimitive.Root asChild>
      <ThreadPrimitive.Root className="...">
        <ScrollAreaPrimitive.Viewport className="thread-viewport" asChild>
          <ThreadPrimitive.Viewport className="...">
            ...
          </ThreadPrimitive.Viewport>
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
      </ThreadPrimitive.Root>
    </ScrollAreaPrimitive.Root>
  );
};
