using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DKNet.Accounts.Infra.MsSql.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "acc");

            migrationBuilder.EnsureSchema(
                name: "seq");

            migrationBuilder.CreateSequence(
                name: "Seq_AccountNumber",
                schema: "seq",
                maxValue: 9999999999L,
                cyclic: true);

            migrationBuilder.CreateSequence<int>(
                name: "Seq_Membership",
                schema: "seq",
                maxValue: 99999L,
                cyclic: true);

            migrationBuilder.CreateSequence(
                name: "Seq_PostingNumber",
                schema: "seq",
                maxValue: 9999999999L,
                cyclic: true);

            migrationBuilder.CreateTable(
                name: "AccountGroups",
                schema: "acc",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OwnerId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Metadata = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CreatedOn = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedBy = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    UpdatedOn = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Accounts",
                schema: "acc",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AccountNumber = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    GroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CurrencyCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Classification = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Balance = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: false),
                    HeldAmount = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: false),
                    OverdraftLimit = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: true),
                    MinimumBalance = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: true),
                    PermittedToGoNegative = table.Column<bool>(type: "bit", nullable: false),
                    StreamPosition = table.Column<long>(type: "bigint", nullable: false),
                    LastPostedOn = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ExternalReference = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Metadata = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    ClosedOn = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CreatedOn = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedBy = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    UpdatedOn = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Accounts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Currencies",
                schema: "acc",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DecimalPlaces = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CreatedOn = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedBy = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    UpdatedOn = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Currencies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Postings",
                schema: "acc",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PostingNumber = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    StreamPosition = table.Column<long>(type: "bigint", nullable: false),
                    Direction = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    SignedValue = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: false),
                    BalanceAfter = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: false),
                    EffectiveDate = table.Column<DateOnly>(type: "date", nullable: false),
                    RecordedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReversedByPostingId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReversesPostingId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TransactionGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CounterpartyAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CounterpartyReference = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CallingSystem = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IdempotencyKey = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IdempotencySignature = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    ExternalReference = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Metadata = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CreatedOn = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedBy = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    UpdatedOn = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Postings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AccountGroups_Code",
                schema: "acc",
                table: "AccountGroups",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_AccountNumber",
                schema: "acc",
                table: "Accounts",
                column: "AccountNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_GroupId",
                schema: "acc",
                table: "Accounts",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Currencies_Code",
                schema: "acc",
                table: "Currencies",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Postings_AccountId",
                schema: "acc",
                table: "Postings",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Postings_AccountId_EffectiveDate_StreamPosition",
                schema: "acc",
                table: "Postings",
                columns: new[] { "AccountId", "EffectiveDate", "StreamPosition" });

            migrationBuilder.CreateIndex(
                name: "IX_Postings_AccountId_StreamPosition",
                schema: "acc",
                table: "Postings",
                columns: new[] { "AccountId", "StreamPosition" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Postings_CallingSystem_IdempotencyKey",
                schema: "acc",
                table: "Postings",
                columns: new[] { "CallingSystem", "IdempotencyKey" },
                unique: true,
                filter: "[IdempotencyKey] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Postings_PostingNumber",
                schema: "acc",
                table: "Postings",
                column: "PostingNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccountGroups",
                schema: "acc");

            migrationBuilder.DropTable(
                name: "Accounts",
                schema: "acc");

            migrationBuilder.DropTable(
                name: "Currencies",
                schema: "acc");

            migrationBuilder.DropTable(
                name: "Postings",
                schema: "acc");

            migrationBuilder.DropSequence(
                name: "Seq_AccountNumber",
                schema: "seq");

            migrationBuilder.DropSequence(
                name: "Seq_Membership",
                schema: "seq");

            migrationBuilder.DropSequence(
                name: "Seq_PostingNumber",
                schema: "seq");
        }
    }
}
