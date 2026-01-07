import React from 'react';
import { FloorPlanItem } from './FloorPlanDesigner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Group, Ungroup, Trash2, Edit2, Check, X } from 'lucide-react';

// Group interface
export interface FloorPlanGroup {
  id: string;
  name: string;
  itemIds: string[];
  color: string;
  locked: boolean;
  createdAt: number;
}

interface GroupManagerProps {
  groups: FloorPlanGroup[];
  items: FloorPlanItem[];
  selectedItemIds: string[];
  onCreateGroup: (name: string, itemIds: string[]) => void;
  onDeleteGroup: (groupId: string) => void;
  onUngroupItems: (groupId: string) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onToggleGroupLock: (groupId: string) => void;
  onSelectGroup: (groupId: string) => void;
}

export function GroupManager({
  groups,
  items,
  selectedItemIds,
  onCreateGroup,
  onDeleteGroup,
  onUngroupItems,
  onRenameGroup,
  onToggleGroupLock,
  onSelectGroup,
}: GroupManagerProps) {
  const [isCreating, setIsCreating] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState('');
  const [editingGroupId, setEditingGroupId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');

  const handleCreateGroup = () => {
    if (selectedItemIds.length < 2) return;
    const name = newGroupName.trim() || `Nhóm ${groups.length + 1}`;
    onCreateGroup(name, selectedItemIds);
    setNewGroupName('');
    setIsCreating(false);
  };

  const handleStartEdit = (group: FloorPlanGroup) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
  };

  const handleSaveEdit = () => {
    if (editingGroupId && editingName.trim()) {
      onRenameGroup(editingGroupId, editingName.trim());
    }
    setEditingGroupId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingGroupId(null);
    setEditingName('');
  };

  // Get group color based on items
  const getGroupColor = (group: FloorPlanGroup) => {
    return group.color || '#6b7280';
  };

  // Check if selected items are already in a group
  const selectedItemsGroup = groups.find((g) =>
    selectedItemIds.some((id) => g.itemIds.includes(id))
  );

  return (
    <div className="space-y-3">
      {/* Create Group Button */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={selectedItemIds.length < 1}
          onClick={() => {
            if (selectedItemIds.length >= 2) {
              setIsCreating(true);
            }
          }}
        >
          <Group className="w-4 h-4 mr-1" />
          Tạo nhóm ({selectedItemIds.length})
        </Button>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tạo nhóm mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên nhóm</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={`Nhóm ${groups.length + 1}`}
                autoFocus
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Đã chọn {selectedItemIds.length} đối tượng để nhóm
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreateGroup}>
                <Group className="w-4 h-4 mr-1" />
                Tạo nhóm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Groups List */}
      {groups.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">
            Danh sách nhóm ({groups.length})
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {groups.map((group) => {
              const isEditing = editingGroupId === group.id;
              const itemCount = group.itemIds.length;

              return (
                <div
                  key={group.id}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-accent transition-colors ${
                    selectedItemsGroup?.id === group.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => !isEditing && onSelectGroup(group.id)}
                >
                  {/* Color indicator */}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getGroupColor(group) }}
                  />

                  {/* Name */}
                  {isEditing ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-6 text-xs flex-1"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className="text-xs flex-1 truncate">{group.name}</span>
                  )}

                  {/* Item count */}
                  <Badge variant="secondary" className="text-[10px] h-4">
                    {itemCount}
                  </Badge>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit();
                          }}
                        >
                          <Check className="w-3 h-3 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEdit();
                          }}
                        >
                          <X className="w-3 h-3 text-red-500" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(group);
                          }}
                          title="Đổi tên"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUngroupItems(group.id);
                          }}
                          title="Tách nhóm"
                        >
                          <Ungroup className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteGroup(group.id);
                          }}
                          title="Xóa nhóm"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="text-[10px] text-muted-foreground pt-2 border-t space-y-1">
        <p>• Ctrl+Click để chọn nhiều đối tượng</p>
        <p>• Kéo chuột để chọn vùng</p>
        <p>• Click vào nhóm để chọn tất cả đối tượng trong nhóm</p>
      </div>
    </div>
  );
}

export default GroupManager;
