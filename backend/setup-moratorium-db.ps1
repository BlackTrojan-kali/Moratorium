$ErrorActionPreference = 'Stop'
$backendDirectory = $PSScriptRoot
$psqlPath = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
$envPath = Join-Path $backendDirectory '.env'
if (Test-Path -LiteralPath $envPath) { throw 'backend/.env already exists. Review the existing configuration before running setup.' }

$adminPassword = Read-Host 'PostgreSQL postgres administrator password' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPassword)
$previousPassword = $env:PGPASSWORD
$previousTimeout = $env:PGCONNECT_TIMEOUT
$previousSslMode = $env:PGSSLMODE
try {
    $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $env:PGCONNECT_TIMEOUT = '5'
    $env:PGSSLMODE = 'disable'
    $connectionArgs = @('-X', '-w', '-h', 'localhost', '-p', '5432', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1')
    $existing = & $psqlPath @connectionArgs -t -A -c "SELECT 'database' FROM pg_database WHERE datname = 'moratorium' UNION ALL SELECT 'role' FROM pg_roles WHERE rolname = 'moratorium';"
    if ($LASTEXITCODE -ne 0) { throw 'Administrator login failed; no database changes were made.' }
    if ($existing) { throw 'A moratorium database or role already exists. Stop and inspect it rather than overwriting it.' }

    $passwordBytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($passwordBytes) } finally { $rng.Dispose() }
    $applicationPassword = [BitConverter]::ToString($passwordBytes).Replace('-', '').ToLowerInvariant()
    # Persist the generated credential before provisioning so it survives a partial failure.
    $configuration = @(
        'HOST=127.0.0.1'
        'PORT=3000'
        "DATABASE_URL=postgresql://moratorium:${applicationPassword}@localhost:5432/moratorium?sslmode=disable"
        'CORS_ORIGIN=http://localhost:5173'
    )
    $configuration | Set-Content -LiteralPath $envPath -Encoding UTF8
    # SQL goes through standard input so the password is not a command-line argument.
    "CREATE ROLE moratorium LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '$applicationPassword';" | & $psqlPath @connectionArgs
    if ($LASTEXITCODE -ne 0) { throw 'Role creation failed. Configuration was retained for recovery.' }
    'CREATE DATABASE moratorium OWNER moratorium;' | & $psqlPath @connectionArgs
    if ($LASTEXITCODE -ne 0) { throw 'Database creation failed. Role and configuration were retained for recovery.' }
    $env:PGPASSWORD = $applicationPassword
    & $psqlPath -X -w -h localhost -p 5432 -U moratorium -d moratorium -v ON_ERROR_STOP=1 -c 'SELECT current_database(), current_user;'
    if ($LASTEXITCODE -ne 0) { throw 'Application login verification failed.' }
    Push-Location -LiteralPath $backendDirectory
    try {
        & npm.cmd run migrate
        if ($LASTEXITCODE -ne 0) { throw 'Migration failed. Database and configuration were retained for investigation.' }
    } finally { Pop-Location }
    Write-Host 'Moratorium database and schema created. Connection saved in backend/.env.'
} finally {
    $env:PGPASSWORD = $previousPassword
    $env:PGCONNECT_TIMEOUT = $previousTimeout
    $env:PGSSLMODE = $previousSslMode
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    $adminPassword.Dispose()
}
