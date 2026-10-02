namespace KuryeSistemi.Application.Common.Constants;

public static class AppRoles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string Admin = "Admin";
    public const string CourierFirm = "CourierFirm";
    public const string FirmAdmin = "FirmAdmin";
    public const string Merchant = "Merchant";
    public const string Courier = "Courier";

    public const string CompanyUser = "CompanyUser";
    public const string CompanyUserManager = "CompanyUser_Manager";
    public const string CompanyUserOperator = "CompanyUser_Operator";
    public const string CompanyUserAccountant = "CompanyUser_Accountant";
    public const string CompanyUserSupport = "CompanyUser_Support";

    /// <summary>Firma ve sistem yöneticisi rolleri (virgülle ayrılmış)</summary>
    public const string AllFirmAndAdminRoles = "SuperAdmin,Admin,CourierFirm,FirmAdmin,CompanyUser,CompanyUser_Manager,CompanyUser_Operator,CompanyUser_Accountant,CompanyUser_Support";

    /// <summary>İşletme ve tüm firma/admin rolleri (virgülle ayrılmış)</summary>
    public const string MerchantAndFirmRoles = "Merchant,SuperAdmin,Admin,CourierFirm,FirmAdmin,CompanyUser,CompanyUser_Manager,CompanyUser_Operator,CompanyUser_Accountant,CompanyUser_Support";
}

public static class AppClaims
{
    public const string MerchantId = "MerchantId";
    public const string CourierId = "CourierId";
    public const string CompanyUserId = "companyUserId";
    public const string CourierCompanyId = "courierCompanyId";
    public const string AdminUserId = "adminUserId";
}
