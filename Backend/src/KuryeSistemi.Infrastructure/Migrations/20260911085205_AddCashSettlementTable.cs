using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KuryeSistemi.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCashSettlementTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CashSettlements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MerchantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CourierId = table.Column<Guid>(type: "uuid", nullable: false),
                    SettledAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CashCollectedTotal = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CourierEarningsTotal = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    DeliveredPackageCount = table.Column<int>(type: "integer", nullable: false),
                    SettledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CashSettlements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CashSettlements_Couriers_CourierId",
                        column: x => x.CourierId,
                        principalTable: "Couriers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CashSettlements_Merchants_MerchantId",
                        column: x => x.MerchantId,
                        principalTable: "Merchants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CashSettlements_CourierId",
                table: "CashSettlements",
                column: "CourierId");

            migrationBuilder.CreateIndex(
                name: "IX_CashSettlements_MerchantId_SettledAt",
                table: "CashSettlements",
                columns: new[] { "MerchantId", "SettledAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CashSettlements");
        }
    }
}
