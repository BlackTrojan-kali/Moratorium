$ErrorActionPreference = 'Stop'

$email = Read-Host 'Administrator email'
$displayName = Read-Host 'Administrator display name'
$password = Read-Host 'Password (12-128 characters)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)

try {
    $payload = @{
        email = $email
        displayName = $displayName
        password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } | ConvertTo-Json -Compress

    $payload | docker compose exec -T backend node src/bootstrap-admin.mjs
    if ($LASTEXITCODE -ne 0) {
        throw 'Administrator creation failed.'
    }
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $password.Dispose()
    $payload = $null
}

