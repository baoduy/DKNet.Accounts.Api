using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DKNet.Accounts.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddPostings : Migration
    {
        private static readonly string[] AccountIdEffectiveDateStreamPositionColumns =
            ["AccountId", "EffectiveDate", "StreamPosition"];

        private static readonly string[] AccountIdStreamPositionColumns = ["AccountId", "StreamPosition"];

        private static readonly string[] CallingSystemIdempotencyKeyColumns = ["CallingSystem", "IdempotencyKey"];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence(
                name: "Seq_PostingNumber",
                schema: "seq",
                maxValue: 9999999999L,
                cyclic: true);

            migrationBuilder.CreateTable(
                name: "Postings",
                schema: "pro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    PostingNumber = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    StreamPosition = table.Column<long>(type: "bigint", nullable: false),
                    Direction = table.Column<string>(type: "text", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    SignedValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    BalanceAfter = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    EffectiveDate = table.Column<DateOnly>(type: "date", nullable: false),
                    RecordedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ReversedByPostingId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReversesPostingId = table.Column<Guid>(type: "uuid", nullable: true),
                    TransactionGroupId = table.Column<Guid>(type: "uuid", nullable: true),
                    CounterpartyAccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    CounterpartyReference = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CallingSystem = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IdempotencyKey = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    IdempotencySignature = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    ExternalReference = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Metadata = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    CreatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedOn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    UpdatedOn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Postings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Postings_AccountId",
                schema: "pro",
                table: "Postings",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Postings_AccountId_EffectiveDate_StreamPosition",
                schema: "pro",
                table: "Postings",
                columns: AccountIdEffectiveDateStreamPositionColumns);

            migrationBuilder.CreateIndex(
                name: "IX_Postings_AccountId_StreamPosition",
                schema: "pro",
                table: "Postings",
                columns: AccountIdStreamPositionColumns,
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Postings_CallingSystem_IdempotencyKey",
                schema: "pro",
                table: "Postings",
                columns: CallingSystemIdempotencyKeyColumns,
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Postings_PostingNumber",
                schema: "pro",
                table: "Postings",
                column: "PostingNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Postings",
                schema: "pro");

            migrationBuilder.DropSequence(
                name: "Seq_PostingNumber",
                schema: "seq");
        }
    }
}
