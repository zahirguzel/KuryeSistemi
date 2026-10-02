namespace KuryeSistemi.Application.Common.Models;

/// <summary>Sayfalanmış liste yanıtı. Sayfa boyutu ve numarası servis tarafında sınırlandırılır.</summary>
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int Size)
{
    public const int MaxPageSize = 200;

    public int TotalPages => Size <= 0 ? 0 : (int)Math.Ceiling(Total / (double)Size);

    /// <summary>İstemciden gelen sayfa parametrelerini güvenli aralığa çeker.</summary>
    public static (int Page, int Size) Normalize(int page, int size, int defaultSize = 50)
    {
        if (size <= 0) size = defaultSize;
        return (Math.Max(page, 1), Math.Min(size, MaxPageSize));
    }
}
