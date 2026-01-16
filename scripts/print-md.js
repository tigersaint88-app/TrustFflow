/**
 * Markdown 文件打印工具
 * 将 Markdown 文件转换为 HTML 并打开，方便打印
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 简单的 Markdown 到 HTML 转换器
function markdownToHTML(markdown) {
    let html = markdown;
    
    // 标题转换
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    
    // 粗体
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 斜体
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 代码块
    html = html.replace(/```[\s\S]*?```/g, (match) => {
        const code = match.replace(/```/g, '').trim();
        return `<pre><code>${code}</code></pre>`;
    });
    
    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');
    
    // 列表
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
    
    // 段落（空行分隔）
    html = html.split('\n\n').map(para => {
        if (!para.trim() || para.startsWith('<')) return para;
        return `<p>${para}</p>`;
    }).join('\n');
    
    return html;
}

function printMarkdown(filePath) {
    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
        console.error(`文件不存在: ${fullPath}`);
        process.exit(1);
    }
    
    const markdown = fs.readFileSync(fullPath, 'utf8');
    const html = markdownToHTML(markdown);
    
    // 创建完整的 HTML 文档
    const htmlDoc = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${path.basename(filePath)}</title>
    <style>
        @media print {
            @page {
                margin: 2cm;
            }
            body {
                font-size: 10pt;
            }
            h1 {
                font-size: 18pt;
            }
            h2 {
                font-size: 16pt;
            }
            h3 {
                font-size: 14pt;
            }
            h4 {
                font-size: 12pt;
            }
            h5 {
                font-size: 11pt;
            }
            h6 {
                font-size: 10pt;
            }
            pre {
                page-break-inside: avoid;
                font-size: 9pt;
            }
            code {
                font-size: 9pt;
            }
            h1, h2, h3 {
                page-break-after: avoid;
            }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.5;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
            font-size: 11pt;
        }
        h1 {
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            font-size: 24pt;
        }
        h2 {
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
            margin-top: 30px;
            font-size: 20pt;
        }
        h3 {
            margin-top: 25px;
            font-size: 16pt;
        }
        h4 {
            font-size: 14pt;
        }
        h5 {
            font-size: 12pt;
        }
        h6 {
            font-size: 11pt;
        }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
        }
        pre {
            background: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            border-left: 4px solid #007acc;
            font-size: 0.9em;
        }
        pre code {
            background: none;
            padding: 0;
        }
        ul, ol {
            padding-left: 30px;
        }
        li {
            margin: 5px 0;
        }
        a {
            color: #007acc;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        blockquote {
            border-left: 4px solid #ccc;
            margin: 0;
            padding-left: 20px;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
    </style>
</head>
<body>
${html}
</body>
</html>`;
    
    // 保存临时 HTML 文件
    const tempHtmlPath = path.join(__dirname, '../temp-print.html');
    fs.writeFileSync(tempHtmlPath, htmlDoc, 'utf8');
    
    console.log('='.repeat(60));
    console.log('Markdown 文件已转换为 HTML');
    console.log('='.repeat(60));
    console.log(`\n文件: ${fullPath}`);
    console.log(`HTML: ${tempHtmlPath}`);
    console.log('\n正在打开浏览器...');
    
    // 根据操作系统打开浏览器
    const platform = process.platform;
    let command;
    
    if (platform === 'win32') {
        command = `start "" "${tempHtmlPath}"`;
    } else if (platform === 'darwin') {
        command = `open "${tempHtmlPath}"`;
    } else {
        command = `xdg-open "${tempHtmlPath}"`;
    }
    
    exec(command, (error) => {
        if (error) {
            console.error('无法自动打开浏览器，请手动打开:', tempHtmlPath);
        } else {
            console.log('\n✅ 已在浏览器中打开');
            console.log('💡 提示: 按 Ctrl+P (Windows) 或 Cmd+P (Mac) 打印');
            console.log('\n临时文件将在打印后保留，可手动删除:', tempHtmlPath);
        }
    });
}

// 命令行参数
const filePath = process.argv[2];

if (!filePath) {
    console.log('用法: node scripts/print-md.js <markdown文件路径>');
    console.log('\n示例:');
    console.log('  node scripts/print-md.js docs/SYSTEM_ARCHITECTURE.md');
    console.log('  node scripts/print-md.js README.md');
    process.exit(1);
}

printMarkdown(filePath);

