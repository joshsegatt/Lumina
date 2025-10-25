# Script para limpar todos os caches e garantir build atualizado
# Execute: .\scripts\clean-and-build.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🧹 Limpando caches e preparando build..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Metro cache
Write-Host "📦 Limpando Metro cache..." -ForegroundColor Yellow
if (Test-Path ".\.metro") {
    Remove-Item -Recurse -Force ".\.metro"
    Write-Host "   ✓ Metro cache deletado" -ForegroundColor Green
} else {
    Write-Host "   - Metro cache não encontrado" -ForegroundColor Gray
}

# 2. React Native cache
Write-Host "`n📦 Limpando React Native cache..." -ForegroundColor Yellow
if (Test-Path "$env:TEMP\react-*") {
    Remove-Item -Recurse -Force "$env:TEMP\react-*"
    Write-Host "   ✓ React Native cache deletado" -ForegroundColor Green
} else {
    Write-Host "   - React Native cache não encontrado" -ForegroundColor Gray
}

# 3. Watchman (se instalado)
Write-Host "`n📦 Limpando Watchman..." -ForegroundColor Yellow
try {
    watchman watch-del-all 2>$null
    Write-Host "   ✓ Watchman cache deletado" -ForegroundColor Green
} catch {
    Write-Host "   - Watchman não instalado" -ForegroundColor Gray
}

# 4. Node modules cache
Write-Host "`n📦 Limpando node_modules cache..." -ForegroundColor Yellow
if (Test-Path ".\node_modules\.cache") {
    Remove-Item -Recurse -Force ".\node_modules\.cache"
    Write-Host "   ✓ node_modules cache deletado" -ForegroundColor Green
} else {
    Write-Host "   - node_modules cache não encontrado" -ForegroundColor Gray
}

# 5. Android build
Write-Host "`n🤖 Limpando Android build..." -ForegroundColor Yellow
Set-Location android
if (Test-Path ".\build") {
    Remove-Item -Recurse -Force ".\build"
    Write-Host "   ✓ Android build deletado" -ForegroundColor Green
}
if (Test-Path ".\app\build") {
    Remove-Item -Recurse -Force ".\app\build"
    Write-Host "   ✓ Android app build deletado" -ForegroundColor Green
}
Write-Host "   Executando gradlew clean..." -ForegroundColor Cyan
.\gradlew clean --quiet
Write-Host "   ✓ Gradle clean completo" -ForegroundColor Green
Set-Location ..

# 6. Build novo APK
Write-Host "`n🔨 Compilando novo APK..." -ForegroundColor Yellow
Set-Location android
.\gradlew assembleDebug --no-daemon
$exitCode = $LASTEXITCODE
Set-Location ..

if ($exitCode -eq 0) {
    Write-Host "`n✅ Build completo!" -ForegroundColor Green
    Write-Host "`nAPK localizado em:" -ForegroundColor Cyan
    Write-Host "  android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor White
    
    Write-Host "`nPróximos passos:" -ForegroundColor Yellow
    Write-Host "  1. Conecte dispositivo Android (USB Debug habilitado)" -ForegroundColor White
    Write-Host "  2. Execute: adb install -r android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor White
    Write-Host "  3. Execute: adb logcat | Select-String 'FLOW|EngineInit|PathValidator|llama'" -ForegroundColor White
} else {
    Write-Host "`n❌ Build falhou! Verifique os erros acima." -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
