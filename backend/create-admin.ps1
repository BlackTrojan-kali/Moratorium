$ErrorActionPreference = 'Stop'
$email = Read-Host 'Administrator email'
$displayName = Read-Host 'Administrator display name'
$password = Read-Host 'Password (12-128 characters)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
try {
  $payload = @{ email=$email; displayName=$displayName; password=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) } | ConvertTo-Json -Compress
  Push-Location -LiteralPath $PSScriptRoot
  try { $payload | node --env-file=.env src/bootstrap-admin.mjs; if ($LASTEXITCODE -ne 0) { throw 'Administrator creation failed.' } }
  finally { Pop-Location }
} finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer); $password.Dispose(); $payload = $null }
