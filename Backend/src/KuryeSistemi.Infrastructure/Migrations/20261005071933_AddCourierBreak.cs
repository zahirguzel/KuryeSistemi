using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KuryeSistemi.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCourierBreak : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsOnBreak",
                table: "Couriers",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsOnBreak",
                table: "Couriers");
        }
    }
}
