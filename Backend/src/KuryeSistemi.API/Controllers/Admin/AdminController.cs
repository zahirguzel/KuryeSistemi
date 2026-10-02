using KuryeSistemi.Application.DTOs.Company;
using KuryeSistemi.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KuryeSistemi.API.Controllers.Admin;

/// <summary>
/// Süper Admin işlemleri. Yalnızca SuperAdmin rolüne sahip JWT ile erişilebilir.
/// Kurye firması oluşturma, kontör yükleme ve admin hesabı yönetimini içerir.
/// İş mantığı ICompanyAdminService / ICreditService'tedir; controller yalnızca HTTP eşlemesi yapar.
/// </summary>
[Authorize(Roles = "SuperAdmin")]
public class AdminController : BaseController
{
    private readonly ICompanyAdminService _adminService;
    private readonly ICreditService _creditService;

    public AdminController(ICompanyAdminService adminService, ICreditService creditService)
    {
        _adminService = adminService;
        _creditService = creditService;
    }

    private string Actor => GetAdminUserId()?.ToString() ?? "system";

    // ── Kurye Firmaları ──────────────────────────────────────────────────────

    /// <summary>Tüm kurye firmalarını listeler.</summary>
    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanies(CancellationToken ct)
        => CreateActionResult(await _adminService.GetCompaniesAsync(ct));

    /// <summary>Tek bir kurye firması detayı.</summary>
    [HttpGet("companies/{id:guid}")]
    public async Task<IActionResult> GetCompany(Guid id, CancellationToken ct)
        => CreateActionResult(await _adminService.GetCompanyAsync(id, ct));

    /// <summary>Yeni kurye firması oluşturur.</summary>
    [HttpPost("companies")]
    public async Task<IActionResult> CreateCompany([FromBody] CreateCompanyRequest req, CancellationToken ct)
        => CreateActionResult(await _adminService.CreateCompanyAsync(req, Actor, ct));

    /// <summary>Firma bilgilerini günceller.</summary>
    [HttpPut("companies/{id:guid}")]
    public async Task<IActionResult> UpdateCompany(Guid id, [FromBody] UpdateCompanyRequest req, CancellationToken ct)
        => CreateActionResult(await _adminService.UpdateCompanyAsync(id, req, Actor, ct));

    /// <summary>Firmanın aktif/pasif durumunu değiştirir.</summary>
    [HttpPatch("companies/{id:guid}/toggle-active")]
    public async Task<IActionResult> ToggleActive(Guid id, CancellationToken ct)
        => CreateActionResult(await _adminService.ToggleCompanyActiveAsync(id, Actor, ct));

    // ── Kontör Yönetimi ──────────────────────────────────────────────────────

    /// <summary>Firmaya kontör yükler.</summary>
    [HttpPost("companies/{id:guid}/credit/topup")]
    public async Task<IActionResult> TopUpCredit(Guid id, [FromBody] CreditTopUpRequest req, CancellationToken ct)
        => CreateActionResult(await _creditService.TopUpAsync(id, req.Amount, req.ReferenceNumber, req.Notes, Actor, ct));

    /// <summary>Manuel kontör düzeltmesi (pozitif veya negatif; bakiye negatife düşemez).</summary>
    [HttpPost("companies/{id:guid}/credit/adjust")]
    public async Task<IActionResult> AdjustCredit(Guid id, [FromBody] CreditAdjustRequest req, CancellationToken ct)
        => CreateActionResult(await _creditService.AdjustAsync(id, req.Amount, req.Reason, Actor, ct));

    /// <summary>Firma kontör geçmişi (sayfalı; sayfa boyutu en fazla 200).</summary>
    [HttpGet("companies/{id:guid}/credit/history")]
    public async Task<IActionResult> GetCreditHistory(
        Guid id, [FromQuery] int page = 1, [FromQuery] int size = 50, CancellationToken ct = default)
        => CreateActionResult(await _creditService.GetHistoryAsync(id, page, size, ct));

    // ── Admin Hesapları ──────────────────────────────────────────────────────

    /// <summary>Tüm admin kullanıcılarını listeler.</summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetAdmins(CancellationToken ct)
        => CreateActionResult(await _adminService.GetAdminsAsync(ct));

    /// <summary>Yeni Süper Admin hesabı oluşturur.</summary>
    [HttpPost("users")]
    public async Task<IActionResult> CreateAdmin([FromBody] CreateAdminRequest req, CancellationToken ct)
        => CreateActionResult(await _adminService.CreateAdminAsync(req, Actor, ct));
}
