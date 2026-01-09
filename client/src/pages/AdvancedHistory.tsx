import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { History, Search, Filter, Download, ChevronLeft, ChevronRight, Eye, CheckCircle2, XCircle, AlertTriangle, X } from "lucide-react";

interface HistoryRecord {
  id: string;
  serialNumber: string;
  productionLine: string;
  workstation: string;
  machine: string;
  product: string;
  status: "pass" | "fail" | "warning";
  cpk: number;
  defectCount: number;
  cycleTime: number;
  timestamp: Date;
  operator: string;
}

const generateMockHistory = (count: number): HistoryRecord[] => {
  const lines = ["Line A", "Line B", "Line C", "Line D"];
  const workstations = ["WS-01", "WS-02", "WS-03", "WS-04", "WS-05"];
  const machines = ["AVI-01", "AVI-02", "AOI-01", "AOI-02", "CMM-01"];
  const products = ["PROD-001", "PROD-002", "PROD-003", "PROD-004"];
  const operators = ["Nguyen Van A", "Tran Thi B", "Le Van C", "Pham Thi D"];
  const statuses: ("pass" | "fail" | "warning")[] = ["pass", "pass", "pass", "fail", "warning"];
  return Array.from({ length: count }, (_, i) => ({
    id: `REC-${String(10000 - i).padStart(5, "0")}`,
    serialNumber: `SN${Date.now() - i * 1000}${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    productionLine: lines[Math.floor(Math.random() * lines.length)],
    workstation: workstations[Math.floor(Math.random() * workstations.length)],
    machine: machines[Math.floor(Math.random() * machines.length)],
    product: products[Math.floor(Math.random() * products.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    cpk: 0.8 + Math.random() * 1.2,
    defectCount: Math.floor(Math.random() * 5),
    cycleTime: 150 + Math.floor(Math.random() * 100),
    timestamp: new Date(Date.now() - i * 60000 * Math.random() * 60),
    operator: operators[Math.floor(Math.random() * operators.length)],
  }));
};

export default function AdvancedHistory() {
  const [searchSN, setSearchSN] = useState("");
  const [selectedLine, setSelectedLine] = useState("all");
  const [selectedWorkstation, setSelectedWorkstation] = useState("all");
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const pageSize = 20;
  const allRecords = useMemo(() => generateMockHistory(500), []);
  
  const filteredRecords = useMemo(() => {
    return allRecords.filter((record) => {
      if (searchSN && !record.serialNumber.toLowerCase().includes(searchSN.toLowerCase())) return false;
      if (selectedLine !== "all" && record.productionLine !== selectedLine) return false;
      if (selectedWorkstation !== "all" && record.workstation !== selectedWorkstation) return false;
      if (selectedMachine !== "all" && record.machine !== selectedMachine) return false;
      if (selectedStatus !== "all" && record.status !== selectedStatus) return false;
      return true;
    });
  }, [allRecords, searchSN, selectedLine, selectedWorkstation, selectedMachine, selectedStatus]);
  
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage]);
  
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  
  const clearFilters = () => {
    setSearchSN("");
    setSelectedLine("all");
    setSelectedWorkstation("all");
    setSelectedMachine("all");
    setSelectedStatus("all");
    setCurrentPage(1);
  };
  
  const exportToCSV = () => {
    const headers = ["ID", "Serial Number", "Production Line", "Workstation", "Machine", "Product", "Status", "CPK", "Defect Count", "Cycle Time", "Timestamp", "Operator"];
    const rows = filteredRecords.map((r) => [r.id, r.serialNumber, r.productionLine, r.workstation, r.machine, r.product, r.status, r.cpk.toFixed(2), r.defectCount, r.cycleTime, r.timestamp.toISOString(), r.operator]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `history_export_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    a.click();
  };
  
  const toggleSelectAll = () => {
    if (selectedRows.length === paginatedRecords.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedRecords.map((r) => r.id));
    }
  };
  
  const toggleSelectRow = (id: string) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };
  
  const stats = useMemo(() => ({
    total: filteredRecords.length,
    pass: filteredRecords.filter((r) => r.status === "pass").length,
    fail: filteredRecords.filter((r) => r.status === "fail").length,
    warning: filteredRecords.filter((r) => r.status === "warning").length,
  }), [filteredRecords]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <History className="h-8 w-8 text-primary" />
              Lich su Nang cao
            </h1>
            <p className="text-muted-foreground mt-1">Tra cuu lich su kiem tra voi bo loc day du</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={clearFilters}><X className="h-4 w-4 mr-2" />Xoa bo loc</Button>
            <Button onClick={exportToCSV}><Download className="h-4 w-4 mr-2" />Xuat CSV</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Tong ket qua</p><p className="text-2xl font-bold">{stats.total.toLocaleString()}</p></CardContent></Card>
          <Card className="border-green-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Dat</p><p className="text-2xl font-bold text-green-500">{stats.pass.toLocaleString()}</p></CardContent></Card>
          <Card className="border-red-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Khong dat</p><p className="text-2xl font-bold text-red-500">{stats.fail.toLocaleString()}</p></CardContent></Card>
          <Card className="border-yellow-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Canh bao</p><p className="text-2xl font-bold text-yellow-500">{stats.warning.toLocaleString()}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Bo loc</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Tim theo SN..." value={searchSN} onChange={(e) => setSearchSN(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Day chuyen</Label>
                <Select value={selectedLine} onValueChange={setSelectedLine}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tat ca</SelectItem>
                    <SelectItem value="Line A">Line A</SelectItem>
                    <SelectItem value="Line B">Line B</SelectItem>
                    <SelectItem value="Line C">Line C</SelectItem>
                    <SelectItem value="Line D">Line D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cong tram</Label>
                <Select value={selectedWorkstation} onValueChange={setSelectedWorkstation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tat ca</SelectItem>
                    <SelectItem value="WS-01">WS-01</SelectItem>
                    <SelectItem value="WS-02">WS-02</SelectItem>
                    <SelectItem value="WS-03">WS-03</SelectItem>
                    <SelectItem value="WS-04">WS-04</SelectItem>
                    <SelectItem value="WS-05">WS-05</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>May</Label>
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tat ca</SelectItem>
                    <SelectItem value="AVI-01">AVI-01</SelectItem>
                    <SelectItem value="AVI-02">AVI-02</SelectItem>
                    <SelectItem value="AOI-01">AOI-01</SelectItem>
                    <SelectItem value="AOI-02">AOI-02</SelectItem>
                    <SelectItem value="CMM-01">CMM-01</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trang thai</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tat ca</SelectItem>
                    <SelectItem value="pass">Dat</SelectItem>
                    <SelectItem value="fail">Khong dat</SelectItem>
                    <SelectItem value="warning">Canh bao</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ket qua ({filteredRecords.length.toLocaleString()} ban ghi)</CardTitle>
            <CardDescription>Trang {currentPage} / {totalPages}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"><Checkbox checked={selectedRows.length === paginatedRecords.length && paginatedRecords.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Day chuyen</TableHead>
                    <TableHead>Cong tram</TableHead>
                    <TableHead>May</TableHead>
                    <TableHead>San pham</TableHead>
                    <TableHead>Trang thai</TableHead>
                    <TableHead>CPK</TableHead>
                    <TableHead>Thoi gian</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell><Checkbox checked={selectedRows.includes(record.id)} onCheckedChange={() => toggleSelectRow(record.id)} /></TableCell>
                      <TableCell className="font-mono text-sm">{record.serialNumber}</TableCell>
                      <TableCell>{record.productionLine}</TableCell>
                      <TableCell>{record.workstation}</TableCell>
                      <TableCell>{record.machine}</TableCell>
                      <TableCell>{record.product}</TableCell>
                      <TableCell>
                        <Badge className={record.status === "pass" ? "bg-green-500" : record.status === "fail" ? "bg-red-500" : "bg-yellow-500"}>
                          {record.status === "pass" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : record.status === "fail" ? <XCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                          {record.status === "pass" ? "Dat" : record.status === "fail" ? "Loi" : "Canh bao"}
                        </Badge>
                      </TableCell>
                      <TableCell className={record.cpk < 1.0 ? "text-red-500 font-medium" : record.cpk < 1.33 ? "text-yellow-500 font-medium" : "text-green-500 font-medium"}>{record.cpk.toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(record.timestamp, "dd/MM/yyyy HH:mm", { locale: vi })}</TableCell>
                      <TableCell><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">{selectedRows.length > 0 && `Da chon ${selectedRows.length} ban ghi`}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
