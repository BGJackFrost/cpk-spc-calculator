import os
import re
import glob

# Pattern to fix: "const [result] = const db = await getDb(); if (!db) throw new TRPCError({ code: \"INTERNAL_SERVER_ERROR\", message: \"Database not available\" }); await db."
# Should become: "const db = await getDb(); if (!db) throw new TRPCError({ code: \"INTERNAL_SERVER_ERROR\", message: \"Database not available\" }); const [result] = await db."

pattern1 = r'const \[(\w+)\] = const db = await getDb\(\); if \(!db\) throw new TRPCError\(\{ code: "INTERNAL_SERVER_ERROR", message: "Database not available" \}\); await db\.'
replacement1 = r'const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" }); const [\1] = await db.'

# Pattern to fix: "await db." at start of function without db declaration
# We need to add db declaration before first await db. in each function

# Find all TypeScript files in server/routers
router_files = glob.glob('server/routers/*.ts')

for filepath in router_files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Fix pattern 1
    content = re.sub(pattern1, replacement1, content)
    
    # Fix pattern: "const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" }); await db."
    # Should become: "await db."
    content = re.sub(
        r'const db = await getDb\(\); if \(!db\) throw new TRPCError\(\{ code: "INTERNAL_SERVER_ERROR", message: "Database not available" \}\); await db\.',
        'await db.',
        content
    )
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed: {filepath}")

# Now fix specific issues in aiVisionDashboardRouter.ts
with open('server/routers/aiVisionDashboardRouter.ts', 'r') as f:
    content = f.read()

# Fix the getConfig function - add db declaration at start
content = content.replace(
    '''  getConfig: protectedProcedure
    .query(async ({ ctx }) => {
      const [config] = await db''',
    '''  getConfig: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [config] = await db'''
)

with open('server/routers/aiVisionDashboardRouter.ts', 'w') as f:
    f.write(content)

print("All fixes applied!")
