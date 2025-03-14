import { FC } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Import icons
import { 
  FileUp, 
  Search, 
  Lightbulb, 
  Globe, 
  ChevronRight,
  MessageSquareText,
  LineChart,
  CheckCircle,
  Link
} from "lucide-react";

/**
 * LearnToUseDialog Component
 * 
 * This component displays a dialog with instructions on how to use the Comment Sense platform.
 * It provides an interactive guide to help professors understand how to analyze their course evaluations.
 */
const LearnToUseDialog: FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            How to Use Comment Sense
          </DialogTitle>
          <p className="text-center text-muted-foreground mt-2">
            Your AI-powered assistant for understanding and improving course evaluations
          </p>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full mt-4">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="upload">Upload & Analyze</TabsTrigger>
            <TabsTrigger value="interact">Ask Questions</TabsTrigger>
            <TabsTrigger value="improve">Improve Teaching</TabsTrigger>
          </TabsList>
          
          {/* All tab content has fixed height for consistency */}
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 min-h-[400px]">
            <div className="flex flex-col items-center text-center p-6 border rounded-lg bg-muted/30">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4"
              >
                <MessageSquareText size={36} className="text-primary" />
              </motion.div>
              <h3 className="text-xl font-semibold mb-2">Welcome to Comment Sense</h3>
              <p>
                Comment Sense helps professors understand student feedback through AI-powered analysis of course evaluations.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: <FileUp className="h-8 w-8 text-blue-500" />,
                  title: "Upload Evaluations",
                  description: "Import your course evaluation data for AI analysis"
                },
                {
                  icon: <Search className="h-8 w-8 text-indigo-500" />,
                  title: "Ask Questions",
                  description: "Explore feedback by asking specific questions"
                },
                {
                  icon: <Lightbulb className="h-8 w-8 text-amber-500" />,
                  title: "Get Improvement Tips",
                  description: "Receive actionable strategies based on feedback"
                }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className="flex flex-col items-center text-center p-4 border rounded-lg hover:shadow-md transition-all"
                >
                  <div className="mb-2">{item.icon}</div>
                  <h4 className="font-medium mb-1">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </TabsContent>
          
          {/* Upload & Analyze Tab - Updated as requested */}
          <TabsContent value="upload" className="space-y-6 min-h-[400px]">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-primary/10 p-3">
                <h3 className="font-medium flex items-center">
                  <FileUp className="mr-2 h-5 w-5" />
                  Uploading Course Evaluations
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Click the "Upload" button</p>
                    <p className="text-sm text-muted-foreground">
                      Located in the top navigation bar of the platform
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Select your evaluation files</p>
                    <p className="text-sm text-muted-foreground">
                      Supported formats include PDF, CSV, Excel, and plain text files
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Ask questions about your evaluations</p>
                    <p className="text-sm text-muted-foreground">
                      Use the chat interface to inquire about specific aspects of your course feedback
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">4</span>
                  </div>
                  <div>
                    <p className="font-medium">Add links to scrape teaching resources</p>
                    <p className="text-sm text-muted-foreground">
                      Paste URLs from teaching websites to gather additional context for your analysis
                    </p>
                    <div className="mt-2 flex items-center p-2 bg-blue-50 border border-blue-100 rounded-md">
                      <Link className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                      <p className="text-xs text-blue-700">
                        Simply paste a URL in the chat to trigger the web scraping feature
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </TabsContent>
          
          {/* Ask Questions Tab */}
          <TabsContent value="interact" className="space-y-6 min-h-[400px]">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-primary/10 p-3">
                <h3 className="font-medium flex items-center">
                  <Search className="mr-2 h-5 w-5" />
                  Asking Questions About Your Evaluations
                </h3>
              </div>
              <div className="p-4">
                <p className="mb-4">
                  After uploading, you can ask specific questions about your evaluations:
                </p>
                
                <div className="space-y-3 mb-4">
                  {[
                    {
                      question: "What are my strengths as an instructor?",
                      description: "Identifies positive patterns in student feedback"
                    },
                    {
                      question: "Where do students think I could improve?",
                      description: "Highlights constructive criticism and areas for growth"
                    },
                    {
                      question: "How does my course compare to department averages?",
                      description: "Provides comparative analysis (if department data is available)"
                    },
                    {
                      question: "What specific feedback exists about my assignments?",
                      description: "Focuses on student comments about coursework design"
                    }
                  ].map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.3, delay: i * 0.1 }}
                      className="p-3 border rounded-md bg-background hover:bg-muted/30 transition-colors"
                    >
                      <p className="font-medium text-primary">"{item.question}"</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </motion.div>
                  ))}
                </div>
                
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-3">
                    <Globe className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">Web Research:</span> You can also enter a URL to scrape additional context from teaching resource websites or academic papers.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Improve Teaching Tab - Teaching Excellence section removed */}
          <TabsContent value="improve" className="space-y-6 min-h-[400px]">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-primary/10 p-3">
                <h3 className="font-medium flex items-center">
                  <LineChart className="mr-2 h-5 w-5" />
                  Improving Based on Feedback
                </h3>
              </div>
              <div className="p-4">
                <p className="mb-4">
                  Comment Sense automatically identifies areas for improvement and provides actionable strategies:
                </p>
                
                <div className="space-y-4">
                  {[
                    {
                      area: "Course Clarity",
                      feedback: "Students find assignment instructions confusing",
                      tips: [
                        "Provide rubrics with clear criteria",
                        "Create example submissions for reference",
                        "Hold pre-assignment Q&A sessions"
                      ]
                    },
                    {
                      area: "Student Engagement",
                      feedback: "Lectures perceived as monotonous",
                      tips: [
                        "Incorporate interactive polling",
                        "Use case studies for discussion",
                        "Implement short group activities"
                      ]
                    }
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.2 }}
                      className="border rounded-lg overflow-hidden"
                    >
                      <div className="bg-blue-50 p-3 border-b">
                        <h4 className="font-medium text-blue-700">{item.area}</h4>
                        <p className="text-sm text-blue-600">Common feedback: {item.feedback}</p>
                      </div>
                      <div className="p-3 bg-white">
                        <p className="font-medium mb-2">Suggested improvements:</p>
                        <ul className="space-y-1">
                          {item.tips.map((tip, j) => (
                            <li key={j} className="flex items-start">
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between mt-4 pt-2 border-t">
          <DialogClose asChild>
            <Button variant="default">
              Got it
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LearnToUseDialog;