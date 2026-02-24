import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  Plus,
  Edit,
  Trash2,
  FolderTree,
  Cpu,
  Heart,
  Wrench,
  Calendar,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Settings,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';

// ============ Device Groups Tab ============
function DeviceGroupsTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', location: '', color: '#3b82f6' });
  
  const { data: groups, refetch } = trpc.iotDeviceManagement.getGroups.useQuery();
  const createMutation = trpc.iotDeviceManagement.createGroup.useMutation({
    onSuccess: () => {
      toast.success('Group created successfully');
      setIsCreateOpen(false);
      setNewGroup({ name: '', description: '', location: '', color: '#3b82f6' });
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const deleteMutation = trpc.iotDeviceManagement.deleteGroup.useMutation({
    onSuccess: () => {
      toast.success('Group deleted');
      refetch();
    },
  });
  
  const handleCreate = () => {
    if (!newGroup.name) {
      toast.error('Group name is required');
      return;
    }
    createMutation.mutate(newGroup);
  };
  
  const renderGroup = (group: any, level: number = 0) => (
    <TableRow key={group.id}>
      <TableCell>
        <div className="flex items-center gap-2" style={{ marginLeft: level * 20 }}>
          <div className="w-3 h-3 rounded" style={{ backgroundColor: group.color }} />
          {group.name}
        </div>
      </TableCell>
      <TableCell>{group.description || '-'}</TableCell>
      <TableCell>{group.location || '-'}</TableCell>
      <TableCell>
        <Badge variant={group.isActive ? 'default' : 'secondary'}>
          {group.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => deleteMutation.mutate({ id: group.id })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Device Groups</h3>
          <p className="text-sm text-muted-foreground">Organize devices into logical groups</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Device Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input 
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="Group name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="Group description"
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input 
                  value={newGroup.location}
                  onChange={(e) => setNewGroup({ ...newGroup, location: e.target.value })}
                  placeholder="Physical location"
                />
              </div>
              <div>
                <Label>Color</Label>
                <Input 
                  type="color"
                  value={newGroup.color}
                  onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No groups created yet
                </TableCell>
              </TableRow>
            ) : (
              groups?.map((group) => renderGroup(group))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ============ Device Templates Tab ============
function DeviceTemplatesTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    deviceType: 'sensor',
    protocol: 'mqtt',
    manufacturer: '',
    model: '',
  });
  
  const { data: templates, refetch } = trpc.iotDeviceManagement.getTemplates.useQuery();
  const createMutation = trpc.iotDeviceManagement.createTemplate.useMutation({
    onSuccess: () => {
      toast.success('Template created successfully');
      setIsCreateOpen(false);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const handleCreate = () => {
    if (!newTemplate.name) {
      toast.error('Template name is required');
      return;
    }
    createMutation.mutate(newTemplate);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Device Templates</h3>
          <p className="text-sm text-muted-foreground">Pre-configured device settings</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Device Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input 
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="Template name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Template description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Device Type</Label>
                  <Select 
                    value={newTemplate.deviceType}
                    onValueChange={(v) => setNewTemplate({ ...newTemplate, deviceType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plc">PLC</SelectItem>
                      <SelectItem value="sensor">Sensor</SelectItem>
                      <SelectItem value="gateway">Gateway</SelectItem>
                      <SelectItem value="hmi">HMI</SelectItem>
                      <SelectItem value="scada">SCADA</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Protocol</Label>
                  <Select 
                    value={newTemplate.protocol}
                    onValueChange={(v) => setNewTemplate({ ...newTemplate, protocol: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mqtt">MQTT</SelectItem>
                      <SelectItem value="opc_ua">OPC-UA</SelectItem>
                      <SelectItem value="modbus_tcp">Modbus TCP</SelectItem>
                      <SelectItem value="modbus_rtu">Modbus RTU</SelectItem>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="tcp">TCP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Manufacturer</Label>
                  <Input 
                    value={newTemplate.manufacturer}
                    onChange={(e) => setNewTemplate({ ...newTemplate, manufacturer: e.target.value })}
                    placeholder="Manufacturer"
                  />
                </div>
                <div>
                  <Label>Model</Label>
                  <Input 
                    value={newTemplate.model}
                    onChange={(e) => setNewTemplate({ ...newTemplate, model: e.target.value })}
                    placeholder="Model"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates?.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-8 text-muted-foreground">
              No templates created yet
            </CardContent>
          </Card>
        ) : (
          templates?.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <Badge>{template.deviceType}</Badge>
                </div>
                <CardDescription>{template.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Protocol:</span>
                    <span>{template.protocol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Manufacturer:</span>
                    <span>{template.manufacturer || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model:</span>
                    <span>{template.model || '-'}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ============ Maintenance Tab ============
function MaintenanceTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    deviceId: 0,
    title: '',
    description: '',
    maintenanceType: 'preventive' as const,
    priority: 'medium' as const,
    scheduledDate: new Date().toISOString().split('T')[0],
  });
  
  const { data: schedules, refetch } = trpc.iotDeviceManagement.getMaintenanceSchedules.useQuery();
  const createMutation = trpc.iotDeviceManagement.createMaintenanceSchedule.useMutation({
    onSuccess: () => {
      toast.success('Maintenance scheduled');
      setIsCreateOpen(false);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const completeMutation = trpc.iotDeviceManagement.completeMaintenanceSchedule.useMutation({
    onSuccess: () => {
      toast.success('Maintenance completed');
      refetch();
    },
  });
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'overdue': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Maintenance Schedules</h3>
          <p className="text-sm text-muted-foreground">Plan and track device maintenance</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Maintenance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Maintenance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Device ID</Label>
                <Input 
                  type="number"
                  value={newSchedule.deviceId}
                  onChange={(e) => setNewSchedule({ ...newSchedule, deviceId: parseInt(e.target.value) })}
                  placeholder="Device ID"
                />
              </div>
              <div>
                <Label>Title</Label>
                <Input 
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                  placeholder="Maintenance title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={newSchedule.description}
                  onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                  placeholder="Description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select 
                    value={newSchedule.maintenanceType}
                    onValueChange={(v: any) => setNewSchedule({ ...newSchedule, maintenanceType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventive">Preventive</SelectItem>
                      <SelectItem value="corrective">Corrective</SelectItem>
                      <SelectItem value="predictive">Predictive</SelectItem>
                      <SelectItem value="calibration">Calibration</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select 
                    value={newSchedule.priority}
                    onValueChange={(v: any) => setNewSchedule({ ...newSchedule, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Scheduled Date</Label>
                <Input 
                  type="date"
                  value={newSchedule.scheduledDate}
                  onChange={(e) => setNewSchedule({ ...newSchedule, scheduledDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createMutation.mutate({
                  ...newSchedule,
                  scheduledDate: new Date(newSchedule.scheduledDate).toISOString(),
                })} 
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Scheduling...' : 'Schedule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No maintenance scheduled
                </TableCell>
              </TableRow>
            ) : (
              schedules?.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">{schedule.title}</TableCell>
                  <TableCell>Device #{schedule.deviceId}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{schedule.maintenanceType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityColor(schedule.priority) as any}>
                      {schedule.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(schedule.scheduledDate).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(schedule.status)}`} />
                      {schedule.status}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {schedule.status === 'scheduled' && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => completeMutation.mutate({ id: schedule.id })}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ============ Main Page ============
export default function IoTDeviceManagement() {
  const { data: stats, refetch } = trpc.iotDeviceManagement.getManagementStats.useQuery();
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">IoT Device Management</h1>
            <p className="text-muted-foreground">
              Manage device groups, templates, health, and maintenance
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.totalGroups || 0}</div>
                  <div className="text-xs text-muted-foreground">Device Groups</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.totalTemplates || 0}</div>
                  <div className="text-xs text-muted-foreground">Templates</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.avgHealthScore || 100}%</div>
                  <div className="text-xs text-muted-foreground">Avg Health</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.pendingMaintenance || 0}</div>
                  <div className="text-xs text-muted-foreground">Pending Maint.</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="groups" className="space-y-4">
          <TabsList>
            <TabsTrigger value="groups">
              <FolderTree className="h-4 w-4 mr-2" />
              Device Groups
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Cpu className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="maintenance">
              <Wrench className="h-4 w-4 mr-2" />
              Maintenance
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="groups">
            <DeviceGroupsTab />
          </TabsContent>
          
          <TabsContent value="templates">
            <DeviceTemplatesTab />
          </TabsContent>
          
          <TabsContent value="maintenance">
            <MaintenanceTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
