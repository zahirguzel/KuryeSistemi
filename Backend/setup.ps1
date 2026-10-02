# =============================================================================
# Kurye & Filo Yönetim Sistemi - Onion Architecture Setup Script
# ASP.NET Core 8 | PostgreSQL | Entity Framework Core
# =============================================================================

$ErrorActionPreference = "Stop"
$SolutionName = "KuryeSistemi"

Write-Host ">>> Solution ve proje iskelet yapisi olusturuluyor..." -ForegroundColor Cyan

# --- Solution ---
dotnet new sln -n $SolutionName

# --- Class Library Projeleri ---
dotnet new classlib -n "$SolutionName.Domain"         -f net8.0 -o "src/$SolutionName.Domain"
dotnet new classlib -n "$SolutionName.Application"    -f net8.0 -o "src/$SolutionName.Application"
dotnet new classlib -n "$SolutionName.Infrastructure" -f net8.0 -o "src/$SolutionName.Infrastructure"

# --- Web API Projesi ---
dotnet new webapi   -n "$SolutionName.API"            -f net8.0 -o "src/$SolutionName.API" --use-controllers

# --- Solution'a Projeleri Ekle ---
dotnet sln add "src/$SolutionName.Domain/$SolutionName.Domain.csproj"
dotnet sln add "src/$SolutionName.Application/$SolutionName.Application.csproj"
dotnet sln add "src/$SolutionName.Infrastructure/$SolutionName.Infrastructure.csproj"
dotnet sln add "src/$SolutionName.API/$SolutionName.API.csproj"

Write-Host ">>> Proje referanslari ekleniyor..." -ForegroundColor Cyan

# Application -> Domain
dotnet add "src/$SolutionName.Application/$SolutionName.Application.csproj" `
    reference "src/$SolutionName.Domain/$SolutionName.Domain.csproj"

# Infrastructure -> Application (ve dolayliyla Domain)
dotnet add "src/$SolutionName.Infrastructure/$SolutionName.Infrastructure.csproj" `
    reference "src/$SolutionName.Application/$SolutionName.Application.csproj"

# API -> Infrastructure + Application
dotnet add "src/$SolutionName.API/$SolutionName.API.csproj" `
    reference "src/$SolutionName.Infrastructure/$SolutionName.Infrastructure.csproj"

dotnet add "src/$SolutionName.API/$SolutionName.API.csproj" `
    reference "src/$SolutionName.Application/$SolutionName.Application.csproj"

Write-Host ">>> NuGet paketleri yukleniyor..." -ForegroundColor Cyan

# Infrastructure: EF Core + PostgreSQL (Npgsql)
dotnet add "src/$SolutionName.Infrastructure/$SolutionName.Infrastructure.csproj" package Microsoft.EntityFrameworkCore --version 8.0.8
dotnet add "src/$SolutionName.Infrastructure/$SolutionName.Infrastructure.csproj" package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.0.8
dotnet add "src/$SolutionName.Infrastructure/$SolutionName.Infrastructure.csproj" package Microsoft.EntityFrameworkCore.Design --version 8.0.8

# API: Swagger + EF Tools
dotnet add "src/$SolutionName.API/$SolutionName.API.csproj" package Microsoft.EntityFrameworkCore.Design --version 8.0.8
dotnet add "src/$SolutionName.API/$SolutionName.API.csproj" package Swashbuckle.AspNetCore --version 6.6.2

# Varsayilan Class1.cs dosyalarini sil
Remove-Item -Path "src/$SolutionName.Domain/Class1.cs"         -ErrorAction SilentlyContinue
Remove-Item -Path "src/$SolutionName.Application/Class1.cs"    -ErrorAction SilentlyContinue
Remove-Item -Path "src/$SolutionName.Infrastructure/Class1.cs" -ErrorAction SilentlyContinue

Write-Host ">>> Klasor yapisi olusturuluyor..." -ForegroundColor Cyan

# Domain klasorleri
New-Item -ItemType Directory -Force -Path "src/$SolutionName.Domain/Common"
New-Item -ItemType Directory -Force -Path "src/$SolutionName.Domain/Entities"
New-Item -ItemType Directory -Force -Path "src/$SolutionName.Domain/Enums"

# Application klasorleri
New-Item -ItemType Directory -Force -Path "src/$SolutionName.Application/Interfaces/Repositories"

# Infrastructure klasorleri
New-Item -ItemType Directory -Force -Path "src/$SolutionName.Infrastructure/Persistence/Configurations"
New-Item -ItemType Directory -Force -Path "src/$SolutionName.Infrastructure/Persistence/Migrations"

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host " Onion Architecture basariyla olusturuldu!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Simdi asagidaki komutu calistirabilirsiniz:" -ForegroundColor Yellow
Write-Host "  cd src/$SolutionName.API && dotnet run" -ForegroundColor Yellow
