using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KuryeSistemi.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCourierCutFeeToMerchant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CourierCutFee",
                table: "Merchants",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 40.00m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CourierCutFee",
                table: "Merchants");

            migrationBuilder.DropColumn(
                name: "CurrentLatitude",
                table: "Couriers");

            migrationBuilder.DropColumn(
                name: "CurrentLongitude",
                table: "Couriers");

            migrationBuilder.DropColumn(
                name: "IsOnline",
                table: "Couriers");

            migrationBuilder.DropColumn(
                name: "LastLocationUpdate",
                table: "Couriers");
        }
    }
}
