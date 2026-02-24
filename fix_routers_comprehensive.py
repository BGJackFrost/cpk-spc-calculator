import os
import re
import glob

def fix_router_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Fix pattern: "const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" }); const [result] = await db."
    # This is correct but on one line - let's make it cleaner
    content = re.sub(
        r'const db = await getDb\(\); if \(!db\) throw new TRPCError\(\{ code: "INTERNAL_SERVER_ERROR", message: "Database not available" \}\); const \[(\w+)\] = await db\.',
        r'const db = await getDb();\n      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });\n      const [\1] = await db.',
        content
    )
    
    # Fix pattern: "const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" }); await db."
    content = re.sub(
        r'const db = await getDb\(\); if \(!db\) throw new TRPCError\(\{ code: "INTERNAL_SERVER_ERROR", message: "Database not available" \}\); await db\.',
        r'const db = await getDb();\n      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });\n      await db.',
        content
    )
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

# Fix all router files
router_files = glob.glob('server/routers/*.ts')
for filepath in router_files:
    if fix_router_file(filepath):
        print(f"Fixed: {filepath}")

# Also fix main routers.ts
if fix_router_file('server/routers.ts'):
    print("Fixed: server/routers.ts")

print("Done!")
