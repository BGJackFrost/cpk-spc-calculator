/**
 * AutoNtfSuggestions - Component hiển thị đề xuất NTF tự động từ AI
 * Với bộ lọc thời gian, production line và SSE notifications
 */
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Brain, CheckCircle2, XCircle, AlertTriangle, Sparkles, Clock, TrendingDown, Bell, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { WidgetFilterBar, type WidgetFilters } from './WidgetFilterBar';

interface AutoNtfSuggestionsProps {
  productionLineId?: number;
  compact?: boolean;
  showControls?: boolean;
}

export function AutoNtfSuggestions({ 
  productionLineId: initialLineId, 
  compact = false,
  showControls = true 
}: AutoNtfSuggestionsProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filters, setFilters] = useState<WidgetFilters>({
    periodDays: 30,
    productionLineId: initialLineId,
  });
  const [newPatternCount, setNewPatternCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);

  const utils = trpc.useUtils();

  const { data: pendingSuggestions, isLoading: loadingPending } = trpc.autoNtf.getPendingSuggestions.useQuery({
    productionLineId: filters.productionLineId,
    limit: 20,
  });

  const { data: statistics } = trpc.autoNtf.getStatistics.useQuery({
    days: filters.periodDays,
    productionLineId: filters.productionLineId,
  });

  // SSE listener for realtime NTF pattern notifications
  useEffect(() => {
    const eventSource = new EventSource('/api/sse');

    const handleNtfPattern = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ntf_pattern_detected' || data.type === 'ntf_suggestion_new') {
          setNewPatternCount(prev => prev + 1);
          setHasNewNotification(true);
          
          // Show toast notification
          toast.info(
            data.type === 'ntf_pattern_detected' 
              ? `Phát hiện NTF pattern mới: ${data.data.patternType}` 
              : `Đề xuất NTF mới: ${data.data.defectCount} lỗi`,
            {
              action: {
                label: 'Xem',
                onClick: () => {
                  utils.autoNtf.getPendingSuggestions.invalidate();
                  setHasNewNotification(false);
                },
              },
            }
          );
          
          // Auto-refresh suggestions
          utils.autoNtf.getPendingSuggestions.invalidate();
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    eventSource.addEventListener('message', handleNtfPattern);
    eventSource.addEventListener('ntf_pattern_detected', handleNtfPattern);
    eventSource.addEventListener('ntf_suggestion_new', handleNtfPattern);

    return () => {
      eventSource.close();
    };
  }, [utils]);

  const analyzeMutation = trpc.autoNtf.analyzePatterns.useMutation({
    onSuccess: (data) => {
      toast.success(`Phân tích hoàn tất: ${data.suggestions?.length || 0} đề xuất NTF`);
      utils.autoNtf.getPendingSuggestions.invalidate();
      setNewPatternCount(0);
    },
    onError: () => {
      toast.error('Lỗi khi phân tích pattern');
    },
  });

  const aiAnalysisMutation = trpc.autoNtf.getAiAnalysis.useMutation({
    onSuccess: (data) => {
      if (data?.analysis) {
        toast.success(`AI phân tích: ${data.analysis.confidence}% tin cậy`);
      }
    },
    onError: () => {
      toast.error('Lỗi khi phân tích AI');
    },
  });

  const confirmMutation = trpc.autoNtf.confirmNtf.useMutation({
    onSuccess: () => {
      toast.success('Đã xác nhận NTF thành công');
      setIsDialogOpen(false);
      setSelectedSuggestion(null);
      setNotes('');
      utils.autoNtf.getPendingSuggestions.invalidate();
      utils.autoNtf.getStatistics.invalidate();
    },
    onError: () => {
      toast.error('Lỗi khi xác nhận NTF');
    },
  });

  const handleConfirm = (isNtf: boolean) => {
    if (!selectedSuggestion) return;
    confirmMutation.mutate({
      defectIds: selectedSuggestion.defectIds,
      isNtf,
      notes,
      rootCause: selectedSuggestion.suggestedPattern,
    });
  };

  const handleAnalyze = () => {
    analyzeMutation.mutate({
      productionLineId: filters.productionLineId,
      days: filters.periodDays,
      minOccurrences: 3,
    });
  };

  const handleAiAnalysis = (suggestion: any) => {
    aiAnalysisMutation.mutate({
      defectIds: suggestion.defectIds,
      includeHistory: true,
    });
  };

  const handleClearNotification = () => {
    setNewPatternCount(0);
    setHasNewNotification(false);
    utils.autoNtf.getPendingSuggestions.invalidate();
  };

  if (loadingPending) {
    return (
      <Card className={compact ? 'h-full' : ''}>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const suggestions = pendingSuggestions || [];

  return (
    <Card className={compact ? 'h-full' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Auto-NTF Detection
              {hasNewNotification && (
                <Badge variant="destructive" className="animate-pulse">
                  {newPatternCount} mới
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              AI tự động đề xuất NTF dựa trên pattern lịch sử
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasNewNotification && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearNotification}
                className="relative"
              >
                <BellRing className="h-4 w-4 text-orange-500 animate-bounce" />
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Phân tích
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter Bar */}
        {showControls && (
          <div className="mb-4">
            <WidgetFilterBar
              filters={filters}
              onFiltersChange={setFilters}
              showProductionLine={true}
              showExport={false}
              compact={compact}
            />
          </div>
        )}

        {statistics && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{statistics.totalDefects}</div>
              <div className="text-xs text-muted-foreground">Tổng lỗi</div>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">{statistics.ntfCount}</div>
              <div className="text-xs text-muted-foreground">NTF</div>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{statistics.ntfRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Tỷ lệ NTF</div>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{statistics.pendingCount}</div>
              <div className="text-xs text-muted-foreground">Chờ xác nhận</div>
            </div>
          </div>
        )}

        {aiAnalysisMutation.data?.analysis && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Kết quả phân tích AI</span>
              <Badge variant={aiAnalysisMutation.data.analysis.isNtfCandidate ? 'default' : 'destructive'}>
                {aiAnalysisMutation.data.analysis.isNtfCandidate ? 'Có thể là NTF' : 'Lỗi thực'}
              </Badge>
            </div>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Độ tin cậy:</span> {aiAnalysisMutation.data.analysis.confidence}%</p>
              <p><span className="text-muted-foreground">Loại pattern:</span> {aiAnalysisMutation.data.analysis.patternType}</p>
              <p><span className="text-muted-foreground">Lý do:</span> {aiAnalysisMutation.data.analysis.reasoning}</p>
            </div>
          </div>
        )}

        {suggestions.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Đề xuất NTF chờ xác nhận ({suggestions.length})
            </h4>
            {suggestions.map((suggestion, index) => (
              <div key={index} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">Loại lỗi: {suggestion.defectType}</span>
                    <Badge variant="outline">{suggestion.count} lần</Badge>
                  </div>
                  <Badge variant={suggestion.confidence >= 70 ? 'default' : 'secondary'}>
                    {suggestion.confidence}% tin cậy
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  Pattern: {suggestion.suggestedPattern}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleAiAnalysis(suggestion)}
                    disabled={aiAnalysisMutation.isPending}
                  >
                    {aiAnalysisMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1" />
                    )}
                    AI Phân tích
                  </Button>
                  <Dialog open={isDialogOpen && selectedSuggestion === suggestion} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (open) setSelectedSuggestion(suggestion);
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="default">Xác nhận</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Xác nhận NTF</DialogTitle>
                        <DialogDescription>
                          Xác nhận {suggestion.count} lỗi loại "{suggestion.defectType}" là NTF hay lỗi thực?
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm"><span className="font-medium">Pattern:</span> {suggestion.suggestedPattern}</p>
                          <p className="text-sm"><span className="font-medium">Số lượng:</span> {suggestion.count} lỗi</p>
                          <p className="text-sm"><span className="font-medium">Độ tin cậy:</span> {suggestion.confidence}%</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Ghi chú (tùy chọn)</label>
                          <Textarea 
                            placeholder="Nhập ghi chú về quyết định..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <DialogFooter className="gap-2">
                        <Button 
                          variant="destructive" 
                          onClick={() => handleConfirm(false)}
                          disabled={confirmMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Lỗi thực (NG)
                        </Button>
                        <Button 
                          variant="default" 
                          onClick={() => handleConfirm(true)}
                          disabled={confirmMutation.isPending}
                        >
                          {confirmMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                          )}
                          Xác nhận NTF
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mb-2 text-green-500" />
            <p>Không có đề xuất NTF nào đang chờ xác nhận</p>
            <p className="text-sm">Nhấn "Phân tích" để quét pattern mới</p>
          </div>
        )}

        {statistics?.byPatternType && statistics.byPatternType.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              NTF theo loại pattern
            </h4>
            <div className="flex flex-wrap gap-2">
              {statistics.byPatternType.map((p, i) => (
                <Badge key={i} variant="outline">
                  {p.pattern}: {p.count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AutoNtfSuggestions;
