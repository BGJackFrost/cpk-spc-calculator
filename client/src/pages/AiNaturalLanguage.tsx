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
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "text" | "chart" | "table" | "recommendation";
  data?: any;
  feedback?: "positive" | "negative";
}

// Sample suggested questions
const suggestedQuestions = {
  vi: [
    "CPK hiện tại của sản phẩm ABC là bao nhiêu?",
    "Phân tích xu hướng CPK trong 7 ngày qua",
    "Tại sao CPK giảm ở trạm XYZ?",
    "Đưa ra khuyến nghị cải tiến cho dây chuyền 1",
    "So sánh hiệu suất giữa ca A và ca B",
    "Dự báo CPK cho tuần tới",
    "Liệt kê các vi phạm Western Electric Rules hôm nay",
    "Máy nào có tỷ lệ lỗi cao nhất?",
  ],
  en: [
    "What is the current CPK for product ABC?",
    "Analyze CPK trend over the past 7 days",
    "Why is CPK declining at station XYZ?",
    "Give improvement recommendations for line 1",
    "Compare performance between shift A and B",
    "Forecast CPK for next week",
    "List Western Electric Rules violations today",
    "Which machine has the highest defect rate?",
  ],
};

// Mock AI responses
function generateMockResponse(question: string, isVi: boolean): { content: string; type: Message["type"]; data?: any } {
  const lowerQ = question.toLowerCase();
  
  if (lowerQ.includes("cpk") && (lowerQ.includes("hiện tại") || lowerQ.includes("current"))) {
    return {
      content: isVi 
        ? `**CPK hiện tại của sản phẩm:**

| Sản phẩm | Trạm | CPK | Trạng thái |
|----------|------|-----|------------|
| ABC-001 | Trạm 1 | 1.45 | ✅ Tốt |
| ABC-002 | Trạm 2 | 1.28 | ⚠️ Cần cải thiện |
| ABC-003 | Trạm 3 | 1.52 | ✅ Xuất sắc |

**Tóm tắt:** CPK trung bình là 1.42, đạt mục tiêu >1.33.`
        : `**Current CPK for products:**

| Product | Station | CPK | Status |
|---------|---------|-----|--------|
| ABC-001 | Station 1 | 1.45 | ✅ Good |
| ABC-002 | Station 2 | 1.28 | ⚠️ Needs improvement |
| ABC-003 | Station 3 | 1.52 | ✅ Excellent |

**Summary:** Average CPK is 1.42, meeting target >1.33.`,
      type: "table",
    };
  }
  
  if (lowerQ.includes("xu hướng") || lowerQ.includes("trend")) {
    return {
      content: isVi
        ? `**Phân tích xu hướng CPK (7 ngày qua):**

📈 **Xu hướng tổng thể:** Tăng nhẹ (+2.3%)

**Chi tiết theo ngày:**
- Thứ 2: 1.38 → Thứ 3: 1.40 (+1.4%)
- Thứ 3: 1.40 → Thứ 4: 1.42 (+0.5%)
- Thứ 4: 1.42 → Thứ 5: 1.39 (-2.1%)
- Thứ 5: 1.39 → Thứ 6: 1.43 (+2.9%)
- Thứ 6: 1.43 → Thứ 7: 1.45 (+1.4%)
- Thứ 7: 1.45 → CN: 1.41 (-2.8%)

**Nhận xét:** CPK có xu hướng tăng nhẹ với biến động trong tuần. Cần theo dõi thêm để xác nhận xu hướng.`
        : `**CPK Trend Analysis (Past 7 days):**

📈 **Overall Trend:** Slight increase (+2.3%)

**Daily Details:**
- Mon: 1.38 → Tue: 1.40 (+1.4%)
- Tue: 1.40 → Wed: 1.42 (+0.5%)
- Wed: 1.42 → Thu: 1.39 (-2.1%)
- Thu: 1.39 → Fri: 1.43 (+2.9%)
- Fri: 1.43 → Sat: 1.45 (+1.4%)
- Sat: 1.45 → Sun: 1.41 (-2.8%)

**Observation:** CPK shows slight upward trend with weekly fluctuations. Continue monitoring to confirm trend.`,
      type: "chart",
    };
  }
  
  if (lowerQ.includes("tại sao") || lowerQ.includes("why") || lowerQ.includes("giảm") || lowerQ.includes("decline")) {
    return {
      content: isVi
        ? `**Phân tích nguyên nhân CPK giảm:**

🔍 **Nguyên nhân chính được xác định:**

1. **Dao cắt mòn (85% xác suất)**
   - Dao đã vượt 120% tuổi thọ khuyến nghị
   - Khuyến nghị: Thay dao ngay lập tức

2. **Biến động nhiệt độ (72% xác suất)**
   - Nhiệt độ dao động ±5°C trong ca
   - Khuyến nghị: Kiểm tra hệ thống HVAC

3. **Chênh lệch kỹ năng vận hành (65% xác suất)**
   - CPK ca C thấp hơn 20% so với ca A
   - Khuyến nghị: Đào tạo bổ sung cho ca C

⚡ **Hành động ưu tiên:** Thay dao cắt và kiểm tra HVAC trong 24h tới.`
        : `**Root Cause Analysis for CPK Decline:**

🔍 **Primary causes identified:**

1. **Tool Wear (85% probability)**
   - Tool exceeded 120% of recommended life
   - Recommendation: Replace tool immediately

2. **Temperature Fluctuation (72% probability)**
   - Temperature varying ±5°C during shift
   - Recommendation: Check HVAC system

3. **Operator Skill Gap (65% probability)**
   - Shift C CPK 20% lower than Shift A
   - Recommendation: Additional training for Shift C

⚡ **Priority Action:** Replace cutting tool and check HVAC within 24 hours.`,
      type: "recommendation",
    };
  }
  
  if (lowerQ.includes("khuyến nghị") || lowerQ.includes("recommendation") || lowerQ.includes("cải tiến") || lowerQ.includes("improve")) {
    return {
      content: isVi
        ? `**Khuyến nghị cải tiến theo 5M1E:**

🔧 **Machine (Máy):**
- Thay dao cắt theo lịch PM
- Calibrate spindle hàng tháng

👷 **Man (Người):**
- Đào tạo SPC cho ca C
- Thiết lập buddy system

📦 **Material (Vật liệu):**
- Tăng tần suất incoming inspection
- Liên hệ nhà cung cấp về spec

📋 **Method (Phương pháp):**
- Chuẩn hóa quy trình setup
- Tạo checklist cho từng công đoạn

📏 **Measurement (Đo lường):**
- Thực hiện Gauge R&R study
- Calibrate thiết bị đo

🌡️ **Environment (Môi trường):**
- Kiểm tra HVAC
- Lắp thêm cảm biến nhiệt độ

**Ưu tiên cao nhất:** Thay dao cắt và đào tạo ca C`
        : `**Improvement Recommendations by 5M1E:**

🔧 **Machine:**
- Replace cutting tools per PM schedule
- Monthly spindle calibration

👷 **Man:**
- SPC training for Shift C
- Establish buddy system

📦 **Material:**
- Increase incoming inspection frequency
- Contact supplier about specs

📋 **Method:**
- Standardize setup procedures
- Create checklists for each step

📏 **Measurement:**
- Conduct Gauge R&R study
- Calibrate measuring equipment

🌡️ **Environment:**
- Check HVAC system
- Install additional temperature sensors

**Highest Priority:** Replace cutting tools and train Shift C`,
      type: "recommendation",
    };
  }
  
  // Default response
  return {
    content: isVi
      ? `Tôi đã nhận được câu hỏi của bạn: "${question}"

Dựa trên dữ liệu SPC/CPK hiện có, tôi có thể giúp bạn:
- Phân tích CPK và xu hướng
- Xác định nguyên nhân gốc rễ
- Đưa ra khuyến nghị cải tiến
- Dự báo và cảnh báo sớm

Bạn có thể hỏi cụ thể hơn về sản phẩm, trạm đo, hoặc khoảng thời gian cần phân tích.`
      : `I received your question: "${question}"

Based on available SPC/CPK data, I can help you with:
- CPK analysis and trends
- Root cause identification
- Improvement recommendations
- Forecasting and early warnings

You can ask more specifically about products, stations, or time periods to analyze.`,
    type: "text",
  };
}

export default function AiNaturalLanguage() {
  const { language } = useLanguage();
  const isVi = language === "vi";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message
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

    // Simulate AI response delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const response = generateMockResponse(messageText, isVi);
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: response.content,
      timestamp: new Date(),
      type: response.type,
      data: response.data,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
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
                ? "Hỏi đáp về SPC/CPK bằng ngôn ngữ tự nhiên"
                : "Ask questions about SPC/CPK in natural language"}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
                    <p className="text-muted-foreground max-w-md">
                      {isVi
                        ? "Tôi có thể giúp bạn phân tích dữ liệu SPC/CPK, tìm nguyên nhân gốc rễ, và đưa ra khuyến nghị cải tiến."
                        : "I can help you analyze SPC/CPK data, find root causes, and provide improvement recommendations."}
                    </p>
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
                          </div>
                          <div className="whitespace-pre-wrap text-sm">
                            {msg.content}
                          </div>
                          {msg.role === "assistant" && (
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
                              {isVi ? "Đang phân tích..." : "Analyzing..."}
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
                  {(isVi ? suggestedQuestions.vi : suggestedQuestions.en).map((q, idx) => (
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
