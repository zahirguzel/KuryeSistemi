using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KuryeSistemi.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAlgorithmSettingsToMerchant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CrossRestaurantDistanceMeters",
                table: "Merchants",
                type: "integer",
                nullable: false,
                defaultValue: 200);

            migrationBuilder.AddColumn<int>(
                name: "HexagonSizeMeters",
                table: "Merchants",
                type: "integer",
                nullable: false,
                defaultValue: 1120);

            migrationBuilder.AddColumn<int>(
                name: "MaxCourierDistanceKm",
                table: "Merchants",
                type: "integer",
                nullable: false,
                defaultValue: 6);

            migrationBuilder.AddColumn<int>(
                name: "MaxOrdersPerTour",
                table: "Merchants",
                type: "integer",
                nullable: false,
                defaultValue: 2);

            migrationBuilder.AddColumn<int>(
                name: "OrderBatchingTimeMinutes",
                table: "Merchants",
                type: "integer",
                nullable: false,
                defaultValue: 15);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CrossRestaurantDistanceMeters",
                table: "Merchants");

            migrationBuilder.DropColumn(
                name: "HexagonSizeMeters",
                table: "Merchants");

            migrationBuilder.DropColumn(
                name: "MaxCourierDistanceKm",
                table: "Merchants");

            migrationBuilder.DropColumn(
                name: "MaxOrdersPerTour",
                table: "Merchants");

            migrationBuilder.DropColumn(
                name: "OrderBatchingTimeMinutes",
                table: "Merchants");
        }
    }
}
