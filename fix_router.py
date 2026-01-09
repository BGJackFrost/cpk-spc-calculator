import re

with open('server/routers/scheduledReportRouter.ts', 'r') as f:
    content = f.read()

# Fix the file - replace all problematic patterns
# Pattern 1: const db = await getDb(); if (!db) ... await db.XXX
content = re.sub(
    r'const db = await getDb\(\); if \(!db\) throw new TRPCError\(\{ code: "INTERNAL_SERVER_ERROR", message: "Database not available" \}\); await db\.',
    'await db.',
    content
)

# Pattern 2: Add db declaration at the start of functions that use db without declaring it
# This is more complex, we'll handle it manually by adding proper declarations

# First, let's ensure all functions have proper db declarations
# Find all places where 'await db.' is used without prior 'const db = await getDb()'

# For now, let's just fix the obvious issues
# Replace duplicate declarations in delete function
content = content.replace(
    '''    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(scheduledReports)
        .where(eq(scheduledReports.id, input.id));''',
    '''    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [existing] = await db
        .select()
        .from(scheduledReports)
        .where(eq(scheduledReports.id, input.id));'''
)

# Fix the list function
content = content.replace(
    '''    .query(async ({ ctx, input }) => {
      const conditions = [eq(scheduledReports.userId, ctx.user.id)];
      if (!input?.includeInactive) {
        conditions.push(eq(scheduledReports.isActive, 1));
      }
      
      const reports = await db''',
    '''    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const conditions = [eq(scheduledReports.userId, ctx.user.id)];
      if (!input?.includeInactive) {
        conditions.push(eq(scheduledReports.isActive, 1));
      }
      
      const reports = await db'''
)

# Fix listAll function
content = content.replace(
    '''      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Chỉ admin mới có quyền xem tất cả báo cáo' });
      }
      
      const reports = await db''',
    '''      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Chỉ admin mới có quyền xem tất cả báo cáo' });
      }
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const reports = await db'''
)

# Fix getById function
content = content.replace(
    '''  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [report] = await db''',
    '''  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [report] = await db'''
)

# Fix update function - check ownership
content = content.replace(
    '''      const { id, ...updateData } = input;
      
      // Check ownership
      const [existing] = await db''',
    '''      const { id, ...updateData } = input;
      
      // Check ownership
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [existing] = await db'''
)

# Fix getLogs function
content = content.replace(
    '''  getLogs: protectedProcedure
    .input(z.object({
      reportId: z.number(),
      limit: z.number().min(1).max(100).optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      // Check ownership
      const [report] = await db''',
    '''  getLogs: protectedProcedure
    .input(z.object({
      reportId: z.number(),
      limit: z.number().min(1).max(100).optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      // Check ownership
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [report] = await db'''
)

# Fix sendNow function
content = content.replace(
    '''  sendNow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [report] = await db''',
    '''  sendNow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [report] = await db'''
)

with open('server/routers/scheduledReportRouter.ts', 'w') as f:
    f.write(content)

print("Fixed!")
