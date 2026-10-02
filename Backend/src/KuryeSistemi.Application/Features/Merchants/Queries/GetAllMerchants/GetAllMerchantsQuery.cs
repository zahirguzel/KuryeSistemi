using KuryeSistemi.Application.Features.Merchants.DTOs;
using MediatR;

namespace KuryeSistemi.Application.Features.Merchants.Queries.GetAllMerchants;

/// <summary>
/// Tüm aktif işletmeleri getiren sorgu.
/// Parametre almaz; IRequest&lt;List&lt;MerchantDto&gt;&gt; ile liste döner.
/// </summary>
public sealed record GetAllMerchantsQuery : IRequest<List<MerchantDto>>;
