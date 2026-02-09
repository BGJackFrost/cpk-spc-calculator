import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Wifi, Users, Radio, Send, Trash2, RefreshCw, Activity, Clock, Hash, Layers } from "lucide-react";

export default function WebSocketDashboard() {
  const { toast } = useToast();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [eventLimit, setEventLimit] = useState(50);
  const [broadcastType, setBroadcastType] = useState("notification");
  const [broadcastData, setBroadcastData] = useState('{"message":"Hello from admin"}');
  const [broadcastTarget, setBroadcastTarget] = useState("global");
  const [broadcastRoom, setBroadcastRoom] = useState("");
  const [broadcastUserId, setBroadcastUserId] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const statsInput = useMemo(() => ({}), []);
  const { data: stats, refetch: refetchStats } = trpc.wsMonitor.stats.useQuery(statsInput, { refetchInterval: autoRefresh ? 3000 : false });
  const eventLogInput = useMemo(() => ({ limit: eventLimit }), [eventLimit]);
  const { data: eventLog, refetch: refetchEvents } = trpc.wsMonitor.eventLog.useQuery(eventLogInput, { refetchInterval: autoRefresh ? 5000 : false });
  const roomsInput = useMemo(() => ({}), []);
  const { data: rooms, refetch: refetchRooms } = trpc.wsMonitor.rooms.useQuery(roomsInput, { refetchInterval: autoRefresh ? 5000 : false });
  const clientsInput = useMemo(() => ({ room: selectedRoom ?? "" }), [selectedRoom]);
  const { data: roomClients } = trpc.wsMonitor.clientsInRoom.useQuery(clientsInput, { enabled: !!selectedRoom });

  const broadcastMut = trpc.wsMonitor.broadcast.useMutation({
    onSuccess: (d: any) => toast({ title: "Sent", description: `Broadcast to ${d.sent} clients` }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const clearLogMut = trpc.wsMonitor.clearEventLog.useMutation({
    onSuccess: () => { refetchEvents(); toast({ title: "Event log cleared" }); },
  });

  const handleBroadcast = () => {
    try {
      const data = JSON.parse(broadcastData);
      broadcastMut.mutate({
        type: broadcastType,
        data,
        room: broadcastTarget === "room" ? broadcastRoom : undefined,
        userId: broadcastTarget === "user" ? broadcastUserId : undefined,
      });
    } catch { toast({ title: "Invalid JSON", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wifi className="h-6 w-6 text-green-500" /> WebSocket Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time monitoring connections, rooms, events</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={autoRefresh ? "default" : "outline"} size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
            <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto" : "Manual"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { refetchStats(); refetchEvents(); refetchRooms(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" /> Clients</div>
          <p className="text-2xl font-bold mt-1">{stats?.connectedClients ?? 0}<span className="text-sm text-muted-foreground ml-1">/ {stats?.maxClients ?? 200}</span></p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Layers className="h-4 w-4" /> Rooms</div>
          <p className="text-2xl font-bold mt-1">{rooms ? Object.keys(rooms).length : 0}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Hash className="h-4 w-4" /> Events</div>
          <p className="text-2xl font-bold mt-1">{stats?.eventLogSize ?? 0}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" /> Uptime</div>
          <p className="text-2xl font-bold mt-1">{stats?.uptime ? `${Math.floor(stats.uptime / 3600)}h` : "N/A"}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="clients">
        <TabsList>
          <TabsTrigger value="clients"><Users className="h-4 w-4 mr-1" /> Clients</TabsTrigger>
          <TabsTrigger value="rooms"><Layers className="h-4 w-4 mr-1" /> Rooms</TabsTrigger>
          <TabsTrigger value="events"><Activity className="h-4 w-4 mr-1" /> Event Log</TabsTrigger>
          <TabsTrigger value="broadcast"><Send className="h-4 w-4 mr-1" /> Broadcast</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <Card>
            <CardHeader><CardTitle>Connected Clients ({stats?.connectedClients ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {stats?.clients?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left p-2">ID</th><th className="text-left p-2">User</th><th className="text-left p-2">Rooms</th><th className="text-left p-2">Subscriptions</th><th className="text-left p-2">Uptime</th><th className="text-left p-2">Status</th></tr></thead>
                    <tbody>
                      {stats.clients.map((c: any) => (
                        <tr key={c.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-mono text-xs">{c.id?.slice(0, 8)}...</td>
                          <td className="p-2">{c.userId ? <Badge variant="outline">{String(c.userId).slice(0, 12)}</Badge> : <span className="text-muted-foreground">Anonymous</span>}</td>
                          <td className="p-2">{c.rooms?.length ?? 0}</td>
                          <td className="p-2">{c.subscriptions?.length ?? 0}</td>
                          <td className="p-2">{c.connectedAt ? `${Math.floor((Date.now() - c.connectedAt) / 60000)}m` : "N/A"}</td>
                          <td className="p-2"><Badge variant="default" className="bg-green-500">Active</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-muted-foreground text-center py-8">No clients connected</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rooms">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Rooms ({rooms ? Object.keys(rooms).length : 0})</CardTitle></CardHeader>
              <CardContent>
                {rooms && Object.keys(rooms).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(rooms).map(([room, count]) => (
                      <div key={room} className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted/50 ${selectedRoom === room ? "bg-muted" : ""}`} onClick={() => setSelectedRoom(room)}>
                        <span className="font-mono text-sm">{room}</span>
                        <Badge variant="secondary">{count as number} clients</Badge>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground text-center py-8">No rooms</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Clients in {selectedRoom ?? "..."}</CardTitle></CardHeader>
              <CardContent>
                {selectedRoom && roomClients?.length ? (
                  <div className="space-y-2">
                    {roomClients.map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30">
                        <span className="font-mono text-xs">{c.id?.slice(0, 12)}...</span>
                        <span className="text-sm">{c.userId || "Anonymous"}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground text-center py-8">{selectedRoom ? "No clients" : "Select a room"}</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Event Log</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={String(eventLimit)} onValueChange={(v) => setEventLimit(Number(v))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => clearLogMut.mutate()}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {eventLog?.length ? (
                <div className="space-y-1 max-h-[500px] overflow-y-auto">
                  {eventLog.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 text-sm font-mono">
                      <span className="text-muted-foreground text-xs w-16 shrink-0">#{e.id}</span>
                      <Badge variant="outline" className="shrink-0">{e.type}</Badge>
                      <span className="text-muted-foreground text-xs shrink-0">{new Date(e.timestamp).toLocaleTimeString()}</span>
                      <span className="text-xs truncate">{JSON.stringify(e.data).slice(0, 80)}</span>
                      <Badge variant="secondary" className="shrink-0 ml-auto">{e.clientCount}c</Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-center py-8">No events yet</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast">
          <Card>
            <CardHeader><CardTitle>Broadcast Message</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Target</label>
                  <Select value={broadcastTarget} onValueChange={setBroadcastTarget}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global (all)</SelectItem>
                      <SelectItem value="room">Specific Room</SelectItem>
                      <SelectItem value="user">Specific User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {broadcastTarget === "room" && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Room Name</label>
                    <Input value={broadcastRoom} onChange={(e) => setBroadcastRoom(e.target.value)} placeholder="room-name" />
                  </div>
                )}
                {broadcastTarget === "user" && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">User ID</label>
                    <Input value={broadcastUserId} onChange={(e) => setBroadcastUserId(e.target.value)} placeholder="user-open-id" />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium mb-1 block">Event Type</label>
                  <Input value={broadcastType} onChange={(e) => setBroadcastType(e.target.value)} placeholder="notification" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Data (JSON)</label>
                <Textarea value={broadcastData} onChange={(e) => setBroadcastData(e.target.value)} rows={4} className="font-mono text-sm" />
              </div>
              <Button onClick={handleBroadcast} disabled={broadcastMut.isPending}>
                <Send className="h-4 w-4 mr-2" /> {broadcastMut.isPending ? "Sending..." : "Broadcast"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
