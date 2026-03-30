Write-Host ""
Write-Host "  Atlas - Setup"
Write-Host "  -------------"
Write-Host ""

# Check prerequisites
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-Host "Error: docker is required but not found." -ForegroundColor Red
    exit 1
}

# Check Docker daemon
try {
    docker info | Out-Null 2>&1
} catch {
    Write-Host "Error: Docker daemon is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Generate .env if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "  [1/3] Generating secrets..."
    Copy-Item ".env.example" ".env"

    function New-Secret {
        $bytes = New-Object byte[] 32
        [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
        return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
    }

    $jwt = New-Secret
    $refresh = New-Secret
    $encryption = New-Secret

    (Get-Content ".env") `
        -replace "^JWT_SECRET=CHANGE_ME$", "JWT_SECRET=$jwt" `
        -replace "^JWT_REFRESH_SECRET=CHANGE_ME$", "JWT_REFRESH_SECRET=$refresh" `
        -replace "^TOKEN_ENCRYPTION_KEY=CHANGE_ME$", "TOKEN_ENCRYPTION_KEY=$encryption" |
        Set-Content ".env"

    Write-Host "         Done. Secrets written to .env"
} else {
    Write-Host "  [1/3] Using existing .env file"
}

# Start services
Write-Host "  [2/3] Starting containers (this may take a few minutes on first run)..."
docker compose -f docker-compose.production.yml up -d --build

# Wait for health
Write-Host "  [3/3] Waiting for Atlas to be ready..."
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {}
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host ""

if ($ready) {
    Write-Host "  Atlas is running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Open http://localhost:3001 to get started."
    Write-Host "  You'll create your admin account on first visit."
    Write-Host ""
    Write-Host "  Useful commands:"
    Write-Host "    View logs:     docker compose -f docker-compose.production.yml logs -f atlas"
    Write-Host "    Stop:          docker compose -f docker-compose.production.yml down"
    Write-Host "    Restart:       docker compose -f docker-compose.production.yml restart atlas"
    Write-Host ""
} else {
    Write-Host "  Atlas didn't respond in time." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Check the logs:"
    Write-Host "    docker compose -f docker-compose.production.yml logs atlas"
    Write-Host ""
    exit 1
}
