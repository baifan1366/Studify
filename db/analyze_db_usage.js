#!/usr/bin/env node
/**
 * 数据库使用情况分析脚本
 * 分析所有API文件中的数据库表使用频率
 */

const fs = require('fs');
const path = require('path');

// 从 database.sql 中提取所有表名
function extractTablesFromSchema(schemaFile) {
  const content = fs.readFileSync(schemaFile, 'utf-8');
  const pattern = /CREATE TABLE public\.(\w+)\s*\(/g;
  const tables = new Set();
  
  let match;
  while ((match = pattern.exec(content)) !== null) {
    tables.add(match[1]);
  }
  
  return Array.from(tables).sort();
}

// 分析API文件中的表使用情况
function analyzeApiUsage(apiDir, tables) {
  const tableUsage = {};
  const fieldUsage = {};
  
  tables.forEach(table => {
    tableUsage[table] = {
      count: 0,
      files: [],
      operations: { SELECT: 0, INSERT: 0, UPDATE: 0, DELETE: 0 }
    };
    fieldUsage[table] = {};
  });
  
  // 递归遍历目录
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          tables.forEach(table => {
            // 匹配 .from("table_name") 或 .from('table_name')
            const fromPattern = new RegExp(`\\.from\\(["\']${table}["\']`, 'g');
            const matches = content.match(fromPattern);
            
            if (matches) {
              const count = matches.length;
              tableUsage[table].count += count;
              
              const relPath = path.relative(apiDir, filePath);
              if (!tableUsage[table].files.includes(relPath)) {
                tableUsage[table].files.push(relPath);
              }
              
              // 分析操作类型
              const selectPattern = new RegExp(`\\.from\\(["\']${table}["\'][\\s\\S]*?\\.select\\(`, 'g');
              const insertPattern = new RegExp(`\\.from\\(["\']${table}["\'][\\s\\S]*?\\.insert\\(`, 'g');
              const updatePattern = new RegExp(`\\.from\\(["\']${table}["\'][\\s\\S]*?\\.update\\(`, 'g');
              const deletePattern = new RegExp(`\\.from\\(["\']${table}["\'][\\s\\S]*?\\.delete\\(`, 'g');
              
              tableUsage[table].operations.SELECT += (content.match(selectPattern) || []).length;
              tableUsage[table].operations.INSERT += (content.match(insertPattern) || []).length;
              tableUsage[table].operations.UPDATE += (content.match(updatePattern) || []).length;
              tableUsage[table].operations.DELETE += (content.match(deletePattern) || []).length;
              
              // 分析字段使用（.eq, .order）
              const eqPattern = new RegExp(`\\.from\\(["\']${table}["\'][\\s\\S]*?\\.eq\\(["\']([\\w_]+)["\']`, 'g');
              const orderPattern = new RegExp(`\\.from\\(["\']${table}["\'][\\s\\S]*?\\.order\\(["\']([\\w_]+)["\']`, 'g');
              
              let match;
              while ((match = eqPattern.exec(content)) !== null) {
                const field = match[1];
                fieldUsage[table][field] = (fieldUsage[table][field] || 0) + 1;
                fieldUsage[table][`${field} (WHERE)`] = (fieldUsage[table][`${field} (WHERE)`] || 0) + 1;
              }
              
              while ((match = orderPattern.exec(content)) !== null) {
                const field = match[1];
                fieldUsage[table][`${field} (ORDER)`] = (fieldUsage[table][`${field} (ORDER)`] || 0) + 1;
              }
            }
          });
        } catch (err) {
          console.error(`Error reading ${filePath}:`, err.message);
        }
      }
    });
  }
  
  walkDir(apiDir);
  
  return { tableUsage, fieldUsage };
}

function main() {
  const baseDir = __dirname;
  const schemaFile = path.join(baseDir, 'database.sql');
  const apiDir = path.join(path.dirname(baseDir), 'app', 'api');
  const outputFile = path.join(baseDir, 'database_usage_analysis.json');
  
  console.log('🔍 分析数据库使用情况...');
  console.log(`Schema文件: ${schemaFile}`);
  console.log(`API目录: ${apiDir}`);
  
  // 提取所有表
  console.log('\n📊 提取数据库表...');
  const tables = extractTablesFromSchema(schemaFile);
  console.log(`找到 ${tables.length} 个表`);
  
  // 分析使用情况
  console.log('\n🔎 分析API使用情况...');
  const { tableUsage, fieldUsage } = analyzeApiUsage(apiDir, tables);
  
  // 统计
  const usedTables = tables.filter(t => tableUsage[t].count > 0);
  const unusedTables = tables.filter(t => tableUsage[t].count === 0);
  
  console.log('\n✅ 分析完成！');
  console.log(`\n表使用统计：`);
  console.log(`  - 被使用的表: ${usedTables.length} / ${tables.length}`);
  console.log(`  - 未使用的表: ${unusedTables.length}`);
  
  // 保存结果
  const result = {
    total_tables: tables.length,
    used_tables: usedTables.length,
    unused_tables: unusedTables,
    table_usage: Object.fromEntries(
      Object.entries(tableUsage)
        .sort(([, a], [, b]) => b.count - a.count)
        .map(([table, data]) => [
          table,
          {
            count: data.count,
            files_count: data.files.length,
            files: data.files.slice(0, 10),
            operations: data.operations
          }
        ])
    ),
    field_usage: Object.fromEntries(
      Object.entries(fieldUsage)
        .filter(([, fields]) => Object.keys(fields).length > 0)
    )
  };
  
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\n💾 结果已保存到: ${outputFile}`);
  
  // 显示前20个最常用的表
  console.log('\n🔥 前20个最常用的表:');
  const sortedTables = Object.entries(tableUsage)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 20);
  
  sortedTables.forEach(([table, data], i) => {
    const ops = data.operations;
    const opsStr = `S:${ops.SELECT} I:${ops.INSERT} U:${ops.UPDATE} D:${ops.DELETE}`;
    console.log(`  ${(i + 1).toString().padStart(2)}. ${table.padEnd(40)} - ${data.count.toString().padStart(4)} 次 (${opsStr}) - ${data.files.length} 个文件`);
  });
  
  // 显示未使用的表
  if (unusedTables.length > 0) {
    console.log(`\n❌ 完全未使用的表 (${unusedTables.length} 个):`);
    unusedTables.sort().forEach(table => {
      console.log(`  - ${table}`);
    });
  }
}

main();
