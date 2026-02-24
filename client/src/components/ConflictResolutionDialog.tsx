/**
 * ConflictResolutionDialog - Dialog for resolving data conflicts between local and server
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  Cloud,
  HardDrive,
  GitMerge,
  ArrowRight,
  Clock,
  Check,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Types
export interface ConflictData {
  id: string;
  entity: string;
  field: string;
  localValue: any;
  serverValue: any;
  localTimestamp: number;
  serverTimestamp: number;
}

export interface ConflictItem {
  id: string;
  entity: string;
  entityId: string;
  entityName: string;
  conflicts: ConflictData[];
  localTimestamp: number;
  serverTimestamp: number;
}

export type ResolutionStrategy = 'keep_local' | 'keep_server' | 'merge';

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ConflictItem[];
  onResolve: (resolutions: Map<string, ResolutionStrategy>) => void;
  onCancel: () => void;
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  conflicts,
  onResolve,
  onCancel
}: ConflictResolutionDialogProps) {
  const [resolutions, setResolutions] = useState<Map<string, ResolutionStrategy>>(new Map());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [globalStrategy, setGlobalStrategy] = useState<ResolutionStrategy | null>(null);

  // Toggle item expansion
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Set resolution for single item
  const setResolution = (id: string, strategy: ResolutionStrategy) => {
    const newResolutions = new Map(resolutions);
    newResolutions.set(id, strategy);
    setResolutions(newResolutions);
  };

  // Apply global strategy to all
  const applyGlobalStrategy = (strategy: ResolutionStrategy) => {
    setGlobalStrategy(strategy);
    const newResolutions = new Map<string, ResolutionStrategy>();
    conflicts.forEach(conflict => {
      newResolutions.set(conflict.id, strategy);
    });
    setResolutions(newResolutions);
  };

  // Check if all conflicts are resolved
  const allResolved = conflicts.every(c => resolutions.has(c.id));

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format value for display
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  // Handle resolve
  const handleResolve = () => {
    if (allResolved) {
      onResolve(resolutions);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Xung đột dữ liệu
          </DialogTitle>
          <DialogDescription>
            Phát hiện {conflicts.length} xung đột giữa dữ liệu local và server. 
            Vui lòng chọn cách giải quyết cho từng mục.
          </DialogDescription>
        </DialogHeader>

        {/* Global Strategy */}
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-3">Áp dụng cho tất cả:</p>
          <div className="flex gap-2">
            <Button
              variant={globalStrategy === 'keep_local' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyGlobalStrategy('keep_local')}
            >
              <HardDrive className="mr-1 h-3 w-3" />
              Giữ Local
            </Button>
            <Button
              variant={globalStrategy === 'keep_server' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyGlobalStrategy('keep_server')}
            >
              <Cloud className="mr-1 h-3 w-3" />
              Giữ Server
            </Button>
            <Button
              variant={globalStrategy === 'merge' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyGlobalStrategy('merge')}
            >
              <GitMerge className="mr-1 h-3 w-3" />
              Merge
            </Button>
          </div>
        </div>

        {/* Conflict List */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {conflicts.map((conflict) => {
              const isExpanded = expandedItems.has(conflict.id);
              const resolution = resolutions.get(conflict.id);

              return (
                <div
                  key={conflict.id}
                  className={`border rounded-lg overflow-hidden ${
                    resolution ? 'border-green-500/50' : 'border-orange-500/50'
                  }`}
                >
                  {/* Header */}
                  <div
                    className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer"
                    onClick={() => toggleExpand(conflict.id)}
                  >
                    <div className="flex items-center gap-3">
                      {resolution ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                      <div>
                        <p className="font-medium">{conflict.entityName}</p>
                        <p className="text-xs text-muted-foreground">
                          {conflict.entity} • {conflict.conflicts.length} field(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {resolution && (
                        <Badge variant="outline" className="text-xs">
                          {resolution === 'keep_local' ? 'Local' : 
                           resolution === 'keep_server' ? 'Server' : 'Merge'}
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-3 space-y-3">
                      {/* Timestamps */}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          <span>Local: {formatTime(conflict.localTimestamp)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Cloud className="h-3 w-3" />
                          <span>Server: {formatTime(conflict.serverTimestamp)}</span>
                        </div>
                      </div>

                      {/* Field Conflicts */}
                      <div className="space-y-2">
                        {conflict.conflicts.map((fieldConflict) => (
                          <div
                            key={fieldConflict.id}
                            className="p-2 bg-muted/30 rounded text-sm"
                          >
                            <p className="font-medium text-xs mb-1">{fieldConflict.field}</p>
                            <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                              <div className="p-2 bg-blue-500/10 rounded text-xs">
                                <p className="text-[10px] text-muted-foreground mb-1">Local</p>
                                <code className="break-all">{formatValue(fieldConflict.localValue)}</code>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              <div className="p-2 bg-green-500/10 rounded text-xs">
                                <p className="text-[10px] text-muted-foreground mb-1">Server</p>
                                <code className="break-all">{formatValue(fieldConflict.serverValue)}</code>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Separator />

                      {/* Resolution Options */}
                      <RadioGroup
                        value={resolution}
                        onValueChange={(value) => setResolution(conflict.id, value as ResolutionStrategy)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="keep_local" id={`${conflict.id}-local`} />
                          <Label htmlFor={`${conflict.id}-local`} className="flex items-center gap-1 text-sm cursor-pointer">
                            <HardDrive className="h-3 w-3" />
                            Giữ Local
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="keep_server" id={`${conflict.id}-server`} />
                          <Label htmlFor={`${conflict.id}-server`} className="flex items-center gap-1 text-sm cursor-pointer">
                            <Cloud className="h-3 w-3" />
                            Giữ Server
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="merge" id={`${conflict.id}-merge`} />
                          <Label htmlFor={`${conflict.id}-merge`} className="flex items-center gap-1 text-sm cursor-pointer">
                            <GitMerge className="h-3 w-3" />
                            Merge (Server + Local changes)
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Summary */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Đã giải quyết: {resolutions.size}/{conflicts.length}
          </span>
          {!allResolved && (
            <span className="text-orange-500">
              Vui lòng giải quyết tất cả xung đột trước khi tiếp tục
            </span>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Hủy
          </Button>
          <Button onClick={handleResolve} disabled={!allResolved}>
            <Check className="mr-2 h-4 w-4" />
            Áp dụng ({resolutions.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConflictResolutionDialog;
