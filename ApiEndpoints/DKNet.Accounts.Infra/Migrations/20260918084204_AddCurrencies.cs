using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DKNet.Accounts.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddCurrencies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Currencies",
                schema: "pro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DecimalPlaces = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedOn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    UpdatedOn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Currencies", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Currencies_Code",
                schema: "pro",
                table: "Currencies",
                column: "Code",
                unique: true);

            // Fixed, deterministic seed rows (R5: SGD, USD and JPY at minimum). InsertData bypasses the
            // entity constructor entirely, which is the only way to give these rows stable ids — Currency's
            // base AggregateRoot ctor hard-codes Guid.NewGuid() with no public Id setter, so seeding through
            // DataSeedingConfiguration<T> would re-insert (and trip the unique index) on every startup.
            // CreatedOn is a fixed UTC literal, not DateTimeOffset.UtcNow, so the migration stays deterministic.
            // Three single-row calls (not one multi-row call) — sidesteps CA1814 without suppressing it.
            var seededOn = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
            var columns = new[] { "Id", "Code", "Name", "DecimalPlaces", "IsActive", "CreatedBy", "CreatedOn" };

            migrationBuilder.InsertData(
                schema: "pro", table: "Currencies", columns: columns,
                values: new object[] { new Guid("c0de0001-0000-4000-8000-000000000702"), "SGD", "Singapore Dollar", 2, true, "system", seededOn });
            migrationBuilder.InsertData(
                schema: "pro", table: "Currencies", columns: columns,
                values: new object[] { new Guid("c0de0001-0000-4000-8000-000000000840"), "USD", "US Dollar", 2, true, "system", seededOn });
            migrationBuilder.InsertData(
                schema: "pro", table: "Currencies", columns: columns,
                values: new object[] { new Guid("c0de0001-0000-4000-8000-000000000392"), "JPY", "Japanese Yen", 0, true, "system", seededOn });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                schema: "pro",
                table: "Currencies",
                keyColumn: "Id",
                keyValues:
                [
                    new Guid("c0de0001-0000-4000-8000-000000000702"),
                    new Guid("c0de0001-0000-4000-8000-000000000840"),
                    new Guid("c0de0001-0000-4000-8000-000000000392")
                ]);

            migrationBuilder.DropTable(
                name: "Currencies",
                schema: "pro");
        }
    }
}
