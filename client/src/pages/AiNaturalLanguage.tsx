import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { LazyStreamdown as Streamdown } from "@/components/LazyStreamdown";
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  History,
  Trash2,
  Copy,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Target,
  Lightbulb,
  FileText,
  Settings,
  Mic,
  MicOff,
  RefreshCw,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "text" | "chart" | "table" | "recommendation";
  data?: Record<string, unknown>;
  feedback?: "positive" | "negative";
  confidence?: number;
  suggestions?: string[];
}

interface ChatContext {
  productCode?: string;
  stationName?: string;
  dateRange?: { from?: Date; to?: Date };
  lastQuery?: string;
}

export default function AiNaturalLanguage() {
  const { language } = useLanguage();
  const isVi = language === "vi";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [context, setContext] = useState<ChatContext>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // tRPC mutations
  const naturalLanguageQuery = trpc.ai.naturalLanguageQuery.useMutation();
  const { data: suggestedQuestionsData, refetch: refetchSuggestions } = trpc.ai.getSuggestedQuestions.useQuery();

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message with real LLM
  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
      type: "text",
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.slice(-6).map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: msg.timestamp,
      }));

      // Call real LLM API
      const result = await naturalLanguageQuery.mutateAsync({
        query: messageText,
        context: {
          productCode: context.productCode,
          stationName: context.stationName,
          dateRange: context.dateRange,
          lastQuery: context.lastQuery,
        },
        conversationHistory,
      });

      // Determine message type based on content
      let messageType: Message["type"] = "text";
      if (result.charts && result.charts.length > 0) {
        messageType = "chart";
      } else if (result.answer.includes("|") && result.answer.includes("---")) {
        messageType = "table";
      } else if (result.answer.includes("Khuyến nghị") || result.answer.includes("Recommendation")) {
        messageType = "recommendation";
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.answer,
        timestamp: new Date(),
        type: messageType,
        data: result.data,
        confidence: result.confidence,
        suggestions: result.suggestions,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update context
      setContext(prev => ({
        ...prev,
        lastQuery: messageText,
      }));

    } catch (error) {
      console.error("LLM error:", error);
      
      // Fallback response
      const errorMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: isVi 
          ? "Xin lỗi, tôi gặp lỗi khi xử lý câu hỏi. Vui lòng thử lại sau."
          : "Sorry, I encountered an error processing your question. Please try again later.",
        timestamp: new Date(),
        type: "text",
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error(isVi ? "Lỗi kết nối AI" : "AI connection error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle feedback
  const handleFeedback = (messageId: string, feedback: "positive" | "negative") => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, feedback } : msg
      )
    );
    toast.success(isVi ? "Cảm ơn phản hồi của bạn!" : "Thank you for your feedback!");
  };

  // Copy message
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success(isVi ? "Đã sao chép!" : "Copied!");
  };

  // Clear chat
  const clearChat = () => {
    setMessages([]);
    setContext({});
    toast.success(isVi ? "Đã xóa lịch sử chat" : "Chat history cleared");
  };

  // Toggle voice input (mock)
  const toggleVoice = () => {
    setIsListening(!isListening);
    if (!isListening) {
      toast.info(isVi ? "Đang lắng nghe..." : "Listening...");
      // Mock voice recognition
      setTimeout(() => {
        setIsListening(false);
        setInput(isVi ? "CPK hiện tại là bao nhiêu?" : "What is the current CPK?");
      }, 2000);
    }
  };

  // Get suggested questions from API or fallback
  const suggestedQuestions = suggestedQuestionsData?.questions || (isVi ? [
    "CPK hiện tại của tất cả sản phẩm là bao nhiêu?",
    "Phân tích xu hướng CPK trong 7 ngày qua",
    "Tại sao CPK giảm ở trạm XYZ?",
    "Đưa ra khuyến nghị cải tiến cho dây chuyền 1",
    "So sánh hiệu suất giữa ca A và ca B",
    "Dự báo CPK cho tuần tới",
    "Liệt kê các vi phạm Western Electric Rules hôm nay",
    "Máy nào có tỷ lệ lỗi cao nhất?",
  ] : [
    "What is the current CPK for all products?",
    "Analyze CPK trend over the past 7 days",
    "Why is CPK declining at station XYZ?",
    "Give improvement recommendations for line 1",
    "Compare performance between shift A and B",
    "Forecast CPK for next week",
    "List Western Electric Rules violations today",
    "Which machine has the highest defect rate?",
  ]);

  return (
    <DashboardLayout>
      <div className="p-6 h-[calc(100vh-80px)] flex flex-col">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-violet-500" />
              {isVi ? "Giao diện Ngôn ngữ Tự nhiên" : "Natural Language Interface"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isVi
                ? "Hỏi đáp về SPC/CPK bằng ngôn ngữ tự nhiên với AI thực"
                : "Ask questions about SPC/CPK in natural language with real AI"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchSuggestions()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {isVi ? "Làm mới" : "Refresh"}
            </Button>
            <Button variant="outline" size="sm" onClick={clearChat}>
              <Trash2 className="h-4 w-4 mr-2" />
              {isVi ? "Xóa chat" : "Clear"}
            </Button>
            <Button variant="outline" size="sm">
              <History className="h-4 w-4 mr-2" />
              {isVi ? "Lịch sử" : "History"}
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
          {/* Chat Area */}
          <Card className="lg:col-span-3 flex flex-col">
            <CardContent className="flex-1 flex flex-col p-4 min-h-0">
              {/* Messages */}
              <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <Bot className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      {isVi ? "Xin chào! Tôi là AI Assistant" : "Hello! I'm your AI Assistant"}
                    </h3>
                    <p className="text-muted-foreground max-w-md mb-4">
                      {isVi
                        ? "Tôi được hỗ trợ bởi LLM thực và có thể giúp bạn phân tích dữ liệu SPC/CPK, tìm nguyên nhân gốc rễ, và đưa ra khuyến nghị cải tiến."
                        : "I'm powered by real LLM and can help you analyze SPC/CPK data, find root causes, and provide improvement recommendations."}
                    </p>
                    <Badge variant="secondary" className="mb-4">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {isVi ? "Powered by LLM" : "Powered by LLM"}
                    </Badge>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                              : "bg-muted rounded-2xl rounded-tl-sm"
                          } p-4`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {msg.role === "assistant" ? (
                              <Bot className="h-4 w-4" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                            <span className="text-xs opacity-70">
                              {msg.timestamp.toLocaleTimeString()}
                            </span>
                            {msg.type && msg.type !== "text" && (
                              <Badge variant="secondary" className="text-xs">
                                {msg.type === "chart" && <BarChart3 className="h-3 w-3 mr-1" />}
                                {msg.type === "table" && <FileText className="h-3 w-3 mr-1" />}
                                {msg.type === "recommendation" && <Lightbulb className="h-3 w-3 mr-1" />}
                                {msg.type}
                              </Badge>
                            )}
                            {msg.confidence && (
                              <Badge variant="outline" className="text-xs">
                                {Math.round(msg.confidence * 100)}% confidence
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                            {msg.role === "assistant" ? (
                              <Streamdown>{msg.content}</Streamdown>
                            ) : (
                              <span className="whitespace-pre-wrap">{msg.content}</span>
                            )}
                          </div>
                          {msg.role === "assistant" && (
                            <>
                              {/* Suggestions */}
                              {msg.suggestions && msg.suggestions.length > 0 && (
                                <div className="mt-3 pt-2 border-t border-border/50">
                                  <p className="text-xs text-muted-foreground mb-2">
                                    {isVi ? "Câu hỏi tiếp theo:" : "Follow-up questions:"}
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {msg.suggestions.map((s, idx) => (
                                      <Button
                                        key={idx}
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto py-1 px-2 text-xs"
                                        onClick={() => sendMessage(s)}
                                      >
                                        {s}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() => copyMessage(msg.content)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-7 px-2 ${msg.feedback === "positive" ? "text-green-500" : ""}`}
                                  onClick={() => handleFeedback(msg.id, "positive")}
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-7 px-2 ${msg.feedback === "negative" ? "text-red-500" : ""}`}
                                  onClick={() => handleFeedback(msg.id, "negative")}
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl rounded-tl-sm p-4">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">
                              {isVi ? "AI đang phân tích..." : "AI is analyzing..."}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input Area */}
              <div className="pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    variant={isListening ? "destructive" : "outline"}
                    size="icon"
                    onClick={toggleVoice}
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={isVi ? "Nhập câu hỏi về SPC/CPK..." : "Ask about SPC/CPK..."}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={isLoading}
                  />
                  <Button onClick={() => sendMessage()} disabled={isLoading || !input.trim()}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Suggested Questions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  {isVi ? "Câu hỏi gợi ý" : "Suggested Questions"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {suggestedQuestions.slice(0, 8).map((q, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2 px-3"
                      onClick={() => sendMessage(q)}
                    >
                      <span className="text-xs line-clamp-2">{q}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {isVi ? "Thao tác nhanh" : "Quick Actions"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex-col"
                    onClick={() => sendMessage(isVi ? "Tổng quan CPK hôm nay" : "Today's CPK overview")}
                  >
                    <BarChart3 className="h-4 w-4 mb-1" />
                    <span className="text-xs">{isVi ? "Tổng quan" : "Overview"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex-col"
                    onClick={() => sendMessage(isVi ? "Cảnh báo hiện tại" : "Current alerts")}
                  >
                    <AlertTriangle className="h-4 w-4 mb-1" />
                    <span className="text-xs">{isVi ? "Cảnh báo" : "Alerts"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex-col"
                    onClick={() => sendMessage(isVi ? "Xu hướng 7 ngày" : "7-day trend")}
                  >
                    <TrendingUp className="h-4 w-4 mb-1" />
                    <span className="text-xs">{isVi ? "Xu hướng" : "Trends"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex-col"
                    onClick={() => sendMessage(isVi ? "Khuyến nghị cải tiến" : "Recommendations")}
                  >
                    <Lightbulb className="h-4 w-4 mb-1" />
                    <span className="text-xs">{isVi ? "Khuyến nghị" : "Tips"}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Capabilities */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {isVi ? "Khả năng AI" : "AI Capabilities"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <BarChart3 className="h-3 w-3" />
                    {isVi ? "Phân tích CPK/SPC" : "CPK/SPC Analysis"}
                  </li>
                  <li className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" />
                    {isVi ? "Dự báo xu hướng" : "Trend Forecasting"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Target className="h-3 w-3" />
                    {isVi ? "Phân tích nguyên nhân" : "Root Cause Analysis"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Lightbulb className="h-3 w-3" />
                    {isVi ? "Khuyến nghị 5M1E" : "5M1E Recommendations"}
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3" />
                    {isVi ? "Cảnh báo sớm" : "Early Warnings"}
                  </li>
                </ul>
                <Separator className="my-3" />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-yellow-500" />
                  {isVi ? "Powered by LLM thực" : "Powered by real LLM"}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
