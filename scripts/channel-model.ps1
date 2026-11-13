param([switch]$Prepare, [int]$Port = 8091)

$ErrorActionPreference = 'Stop'
$modelDir = Join-Path $PSScriptRoot '../runs/channel-model'
$version = 'b12360'
$archive = "llama-$version-bin-win-cpu-x64.zip"
$weights = 'Qwen3.5-4B-Q4_K_M.gguf'
$runtimeHash = 'eae1726047e0eaa707b1302929d196c999b96c2f243b21aea6e93bcebacc4e17'
$modelHash = '00fe7986ff5f6b463e62455821146049db6f9313603938a70800d1fb69ef11a4'
$revision = 'e87f176479d0855a907a41277aca2f8ee7a09523'

function Get-VerifiedAsset($Url, $Target, $Expected) {
    if ((Test-Path -LiteralPath $Target) -and (Get-FileHash -LiteralPath $Target).Hash -eq $Expected) { return }
    $partial = "$Target.part"
    curl.exe --fail --location --retry 2 --silent --show-error --output $partial $Url
    if ($LASTEXITCODE -ne 0) { throw "Error descargando $Url" }
    if ((Get-FileHash -LiteralPath $partial).Hash -ne $Expected) { throw "La huella SHA-256 no coincide para $Target" }
    Move-Item -LiteralPath $partial -Destination $Target -Force
}

$server = Join-Path $modelDir 'llama-server.exe'
$model = Join-Path $modelDir $weights
if ($Prepare) {
    New-Item -ItemType Directory -Force -Path $modelDir | Out-Null
    $zip = Join-Path $modelDir $archive
    Get-VerifiedAsset "https://github.com/ggml-org/llama.cpp/releases/download/$version/$archive" $zip $runtimeHash
    Expand-Archive -LiteralPath $zip -DestinationPath $modelDir -Force
    Get-VerifiedAsset "https://huggingface.co/unsloth/Qwen3.5-4B-GGUF/resolve/$revision/$weights" $model $modelHash
    return
}
if (!(Test-Path -LiteralPath $server) -or !(Test-Path -LiteralPath $model)) { throw 'Ejecuta primero scripts/channel-model.ps1 -Prepare.' }
if ($Port -lt 1 -or $Port -gt 65535) { throw 'Puerto fuera de rango.' }
$keyFile = Join-Path $modelDir 'api-key'
if (!(Test-Path -LiteralPath $keyFile)) {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    [IO.File]::WriteAllText($keyFile, [Convert]::ToBase64String($bytes))
}
& $server -m $model --host 127.0.0.1 --port $Port --alias qwen3.5-4b -c 4096 -np 1 --jinja --api-key-file $keyFile --reasoning off
exit $LASTEXITCODE
