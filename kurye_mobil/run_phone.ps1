# Gerçek telefonda (aynı Wi-Fi) uygulamayı çalıştırır.
# Bilgisayarın o anki yerel IP adresini bulup API adresi olarak verir; ağ değişince elle düzenleme gerekmez.
#
# Kullanım:  .\run_phone.ps1            (varsayılan port 5000)
#            .\run_phone.ps1 -Port 5000 -Device <cihaz-id>

param(
    [int]$Port = 5000,
    [string]$Device = ""
)

# Varsayılan ağ geçidi olan (internete çıkan) arayüzün IPv4 adresi
$route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
    Sort-Object RouteMetric | Select-Object -First 1
$ip = $null
if ($route) {
    $ip = (Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
}

if (-not $ip) {
    Write-Host "Yerel IP adresi bulunamadı. Wi-Fi'ye bağlı olduğundan emin ol." -ForegroundColor Red
    exit 1
}

$url = "http://${ip}:$Port"
Write-Host "Bilgisayar IP : $ip"
Write-Host "API adresi    : $url"
Write-Host "Kontrol       : telefonun tarayıcısında $url/swagger açılmalı" -ForegroundColor Yellow
Write-Host ""

$args = @("run", "--dart-define=API_BASE_URL=$url")
if ($Device) { $args += @("-d", $Device) }
flutter @args
