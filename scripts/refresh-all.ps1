# 完整刷新脚本：重置所有数据并重新部署
# PowerShell版本

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "完整刷新：重置所有数据并重新部署" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 设置初始订单ID（可以从环境变量读取，默认10000）
$initialOrderId = if ($env:INITIAL_ORDER_ID) { $env:INITIAL_ORDER_ID } else { "10000" }

Write-Host "初始订单ID: $initialOrderId" -ForegroundColor Yellow
Write-Host ""

# 设置环境变量
$env:INITIAL_ORDER_ID = $initialOrderId

try {
    # 运行Node.js脚本
    node scripts/refresh-all.js
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "✗ 刷新失败，请检查错误信息" -ForegroundColor Red
        Read-Host "按Enter键退出"
        exit $LASTEXITCODE
    }
    
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "刷新完成！" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "✗ 执行过程中发生错误: $_" -ForegroundColor Red
    Read-Host "按Enter键退出"
    exit 1
}

Read-Host "按Enter键退出"

