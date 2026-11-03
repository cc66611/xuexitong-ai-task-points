$ErrorActionPreference = 'Stop'
$appRoot = $PSScriptRoot
$outDir = Join-Path $appRoot 'src\local\connection-check'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$secretPath = Join-Path $appRoot 'src\local\bridge-token.txt'
$headers = @{ Authorization = ('Bearer ' + [IO.File]::ReadAllText($secretPath).Trim()) }
$health = Invoke-RestMethod -Uri 'http://127.0.0.1:18763/health' -Headers $headers -TimeoutSec 5
Write-Output ('Service: ' + $health.model + ' / ' + $health.reasoningEffort)
if ($health.busy) { throw 'The local service is busy. Try again after the current request finishes.' }

Add-Type -AssemblyName System.Drawing
$digits = '074628'
$bitmap = [Drawing.Bitmap]::new(560, 160)
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$font = [Drawing.Font]::new('Arial', 64, [Drawing.FontStyle]::Bold)
try {
    $graphics.Clear([Drawing.Color]::White)
    $graphics.DrawString($digits, $font, [Drawing.Brushes]::Black, 65, 24)
    $imagePath = Join-Path $outDir 'digits.png'
    $bitmap.Save($imagePath, [Drawing.Imaging.ImageFormat]::Png)
} finally {
    $font.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}
$imageUrl = 'data:image/png;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes($imagePath))
$payload = @{
    questions = @(
        @{ id = 'text-probe'; type = 'blank'; text = 'Compute 137 + 286. Return only the integer result in the single input field.'; options = @(); slots = 1 },
        @{ id = 'image-probe'; type = 'blank'; text = 'Read the six digits in the image. Keep any leading zero. Return the digits in the single input field.'; options = @(); slots = 1; requiresVision = $true }
    )
    images = @($imageUrl)
    imageManifest = @(@{ image = 1; questionIds = @('image-probe') })
}
Write-Output 'Testing one text question and one image question using the existing Codex login...'
$body = [Text.Encoding]::UTF8.GetBytes(($payload | ConvertTo-Json -Depth 12 -Compress))
$response = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:18763/solve' -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $body -TimeoutSec 190
$textAnswer = @($response.answers | Where-Object id -eq 'text-probe')[0]
$imageAnswer = @($response.answers | Where-Object id -eq 'image-probe')[0]
$report = [ordered]@{
    checkedAt = (Get-Date).ToString('o')
    model = $health.model
    reasoningEffort = $health.reasoningEffort
    textPassed = ($textAnswer.readable -and $textAnswer.texts[0].Trim() -eq '423')
    textActual = $textAnswer.texts[0]
    imagePassed = ($imageAnswer.readable -and $imageAnswer.texts[0].Trim() -eq $digits)
    imageActual = $imageAnswer.texts[0]
}
$report | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outDir 'result.json') -Encoding utf8
$report | ConvertTo-Json
if (-not ($report.textPassed -and $report.imagePassed)) { throw 'At least one live model probe did not pass.' }
