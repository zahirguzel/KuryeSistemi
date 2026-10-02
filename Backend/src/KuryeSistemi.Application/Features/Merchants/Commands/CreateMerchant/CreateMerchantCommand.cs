using KuryeSistemi.Application.Features.Merchants.DTOs;
using MediatR;

namespace KuryeSistemi.Application.Features.Merchants.Commands.CreateMerchant;

/// <summary>
/// Yeni işletme oluşturma komutu.
/// IRequest&lt;MerchantDto&gt; → Handler'ın MerchantDto döneceğini belirtir.
/// </summary>
public sealed record CreateMerchantCommand(
    string Name,
    string Email,
    string Password,
    string PhoneNumber,
    string Address
) : IRequest<MerchantDto>;
