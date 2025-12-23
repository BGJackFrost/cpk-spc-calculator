import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSecurityEvents, useRealtimeData } from '@/hooks/useRealtimeData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Lock, 
  Key, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Users,
  Clock,
  Activity,
  FileWarning,
  ShieldCheck,
  ShieldAlert,
  Smartphone
} from 'lucide-react';

export default function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isScanning, setIsScanning] = useState(false);

  // Real-time security events subscription
  const { events: realtimeSecurityEvents, isConnected, error: sseError, clearEvents } = useSecurityEvents();
  
  // Real-time data for multiple security channels
  const { messages: securityMessages, lastMessage } = useRealtimeData({
    channels: ['security:events', 'security:audit', 'security:alerts'],
    onMessage: (event) => {
      console.log('[Security] Realtime event:', event.type, event.data);
    }
  });

  // Mock security data
  const securityScore = {
    overall: 85,
    grade: 'B',
    lastAudit: new Date().toISOString(),
    vulnerabilities: {
      critical: 0,
      high: 2,
      medium: 5,
      low: 8,
    },
  };

  const owaspCompliance = [
    { code: 'A01', name: 'Broken Access Control', status: 'compliant' },
    { code: 'A02', name: 'Cryptographic Failures', status: 'compliant' },
    { code: 'A03', name: 'Injection', status: 'compliant' },
    { code: 'A04', name: 'Insecure Design', status: 'partial' },
    { code: 'A05', name: 'Security Misconfiguration', status: 'compliant' },
    { code: 'A06', name: 'Vulnerable Components', status: 'partial' },
    { code: 'A07', name: 'Authentication Failures', status: 'compliant' },
    { code: 'A08', name: 'Software Integrity Failures', status: 'compliant' },
    { code: 'A09', name: 'Logging Failures', status: 'compliant' },
    { code: 'A10', name: 'SSRF', status: 'compliant' },
  ];

  const sessionStats = {
    activeSessions: 45,
    uniqueUsers: 32,
    avgSessionsPerUser: 1.4,
    recentLogins: 12,
    recentLogouts: 5,
  };

  const rateLimitStats = {
    totalRequests: 15420,
    blockedRequests: 23,
    blockRate: 0.15,
    topBlocked: [
      { ip: '192.168.1.xxx', requests: 8, blocked: 5 },
      { ip: '10.0.0.xxx', requests: 12, blocked: 3 },
    ],
  };

  const handleRunAudit = async () => {
    setIsScanning(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsScanning(false);
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-500';
      case 'B': return 'text-blue-500';
      case 'C': return 'text-yellow-500';
      case 'D': return 'text-orange-500';
      case 'F': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'non_compliant':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Security Dashboard</h1>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">
                Security audit, OWASP compliance, and access control monitoring
              </p>
              {/* Realtime Connection Indicator */}
              <div className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs text-muted-foreground">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              {realtimeSecurityEvents.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {realtimeSecurityEvents.length} new events
                </Badge>
              )}
            </div>
          </div>
          <Button onClick={handleRunAudit} disabled={isScanning}>
            {isScanning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Run Security Audit
              </>
            )}
          </Button>
        </div>

        {/* Security Score */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Score</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{securityScore.overall}</span>
                <span className={`text-2xl font-bold ${getGradeColor(securityScore.grade)}`}>
                  {securityScore.grade}
                </span>
              </div>
              <Progress value={securityScore.overall} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vulnerabilities</CardTitle>
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {securityScore.vulnerabilities.critical > 0 && (
                  <Badge variant="destructive">{securityScore.vulnerabilities.critical} Critical</Badge>
                )}
                {securityScore.vulnerabilities.high > 0 && (
                  <Badge className="bg-orange-500">{securityScore.vulnerabilities.high} High</Badge>
                )}
                <Badge className="bg-yellow-500">{securityScore.vulnerabilities.medium} Medium</Badge>
                <Badge variant="secondary">{securityScore.vulnerabilities.low} Low</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessionStats.activeSessions}</div>
              <p className="text-xs text-muted-foreground">
                {sessionStats.uniqueUsers} unique users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rate Limit Blocks</CardTitle>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rateLimitStats.blockedRequests}</div>
              <p className="text-xs text-muted-foreground">
                {rateLimitStats.blockRate}% block rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="owasp">OWASP Compliance</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="ratelimit">Rate Limiting</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Security Checks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Checks
                  </CardTitle>
                  <CardDescription>Latest security audit results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: 'JWT Configuration', passed: true },
                      { name: 'HTTPS Enforcement', passed: true },
                      { name: 'Input Validation', passed: true },
                      { name: 'SQL Injection Prevention', passed: true },
                      { name: 'XSS Prevention', passed: true },
                      { name: 'Security Headers', passed: false },
                      { name: 'Session Management', passed: true },
                    ].map((check) => (
                      <div key={check.name} className="flex items-center justify-between">
                        <span>{check.name}</span>
                        {check.passed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileWarning className="h-5 w-5" />
                    Recommendations
                  </CardTitle>
                  <CardDescription>Actions to improve security</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="font-medium text-yellow-600">Add Security Headers</div>
                      <div className="text-sm text-muted-foreground">
                        Configure X-Frame-Options, CSP, and HSTS headers
                      </div>
                    </div>
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="font-medium text-blue-600">Update Dependencies</div>
                      <div className="text-sm text-muted-foreground">
                        2 packages have known vulnerabilities
                      </div>
                    </div>
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="font-medium text-green-600">Enable 2FA</div>
                      <div className="text-sm text-muted-foreground">
                        Consider enabling two-factor authentication
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="owasp" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>OWASP Top 10 Compliance</CardTitle>
                <CardDescription>
                  Compliance status with OWASP Top 10 2021 security risks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {owaspCompliance.map((item) => (
                    <div
                      key={item.code}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{item.code}: {item.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getComplianceIcon(item.status)}
                        <Badge
                          variant={
                            item.status === 'compliant'
                              ? 'default'
                              : item.status === 'partial'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {item.status === 'compliant'
                            ? 'Compliant'
                            : item.status === 'partial'
                            ? 'Partial'
                            : 'Non-Compliant'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Session Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{sessionStats.activeSessions}</div>
                      <div className="text-xs text-muted-foreground">Active Sessions</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{sessionStats.uniqueUsers}</div>
                      <div className="text-xs text-muted-foreground">Unique Users</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{sessionStats.recentLogins}</div>
                      <div className="text-xs text-muted-foreground">Recent Logins</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{sessionStats.recentLogouts}</div>
                      <div className="text-xs text-muted-foreground">Recent Logouts</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Device Management
                  </CardTitle>
                  <CardDescription>Active devices per user</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        <span>Desktop Chrome</span>
                      </div>
                      <Badge>Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        <span>Mobile Safari</span>
                      </div>
                      <Badge variant="secondary">Idle</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ratelimit" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Rate Limit Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{rateLimitStats.totalRequests.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Total Requests</div>
                    </div>
                    <div className="text-center p-3 bg-red-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-red-500">{rateLimitStats.blockedRequests}</div>
                      <div className="text-xs text-muted-foreground">Blocked</div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Block Rate</span>
                      <span>{rateLimitStats.blockRate}%</span>
                    </div>
                    <Progress value={rateLimitStats.blockRate * 10} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Top Blocked IPs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rateLimitStats.topBlocked.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-mono text-sm">{item.ip}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.requests} requests
                          </div>
                        </div>
                        <Badge variant="destructive">{item.blocked} blocked</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
