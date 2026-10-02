using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KuryeSistemi.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCourierEarningAndPackageFee : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CourierEarning",
                table: "Orders",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0.00m);

            migrationBuilder.AddColumn<decimal>(
                name: "DefaultPackageFee",
                table: "Merchants",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 75.00m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CourierEarning",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DefaultPackageFee",
                table: "Merchants");
        }
    }
}
