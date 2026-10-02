using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KuryeSistemi.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCreditLedgerAndPasswordChangedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordChangedAt",
                table: "Merchants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordChangedAt",
                table: "Couriers",
                type: "timestamp with time zone",
                nullable: true);

            // xmin PostgreSQL sistem kolonudur; yalnızca model snapshot'ında concurrency token olarak izlenir.

            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordChangedAt",
                table: "CompanyUsers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordChangedAt",
                table: "AdminUsers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "UX_CreditTransactions_Order_Delivery",
                table: "CreditTransactions",
                columns: new[] { "OrderId", "Type" },
                unique: true,
                filter: "\"OrderId\" IS NOT NULL AND \"Type\" = 2");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "UX_CreditTransactions_Order_Delivery",
                table: "CreditTransactions");

            migrationBuilder.DropColumn(
                name: "PasswordChangedAt",
                table: "Merchants");

            migrationBuilder.DropColumn(
                name: "PasswordChangedAt",
                table: "Couriers");

            migrationBuilder.DropColumn(
                name: "PasswordChangedAt",
                table: "CompanyUsers");

            migrationBuilder.DropColumn(
                name: "PasswordChangedAt",
                table: "AdminUsers");
        }
    }
}
