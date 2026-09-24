using System.Globalization;
using DKNet.Accounts.Domains.Share;
using DKNet.Accounts.Infra.Features.Currencies;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DKNet.Accounts.Infra.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// DRK-1719: currency codes of up to 10 characters, every money column at <c>numeric(18,6)</c>, and the 23
    /// currencies of <see cref="SeededCurrencies.CurrencySetAndUsdt"/>. EF runs a migration inside one
    /// transaction, so it applies in full or not at all.
    /// </summary>
    public partial class CurrencySetAndUsdt : Migration
    {
        private static readonly string[] CurrencyColumns =
            ["Id", "Code", "Name", "DecimalPlaces", "IsActive", "CreatedBy", "CreatedOn"];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // numeric(18,6) keeps 12 whole digits where numeric(18,2) kept 16, so an amount above the new
            // ceiling would fail the column change with a bare overflow — refuse it first, by name, before
            // anything is altered, and let the transaction roll the whole upgrade back.
            var ceiling = PostingAmount.Ceiling.ToString(CultureInfo.InvariantCulture);
            migrationBuilder.Sql($$"""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM pro."Accounts"
                               WHERE abs("Balance") > {{ceiling}} OR abs("HeldAmount") > {{ceiling}}
                                  OR abs("OverdraftLimit") > {{ceiling}} OR abs("MinimumBalance") > {{ceiling}})
                       OR EXISTS (SELECT 1 FROM pro."Postings"
                               WHERE abs("Amount") > {{ceiling}} OR abs("SignedValue") > {{ceiling}}
                                  OR abs("BalanceAfter") > {{ceiling}})
                    THEN
                        RAISE EXCEPTION 'Upgrade stopped: a stored amount is above {{ceiling}}, the largest amount numeric(18,6) can hold. Nothing was changed.';
                    END IF;
                END $$;
                """);

            migrationBuilder.AlterColumn<decimal>(
                name: "SignedValue",
                schema: "pro",
                table: "Postings",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AlterColumn<string>(
                name: "Currency",
                schema: "pro",
                table: "Postings",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(3)",
                oldMaxLength: 3);

            migrationBuilder.AlterColumn<decimal>(
                name: "BalanceAfter",
                schema: "pro",
                table: "Postings",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AlterColumn<decimal>(
                name: "Amount",
                schema: "pro",
                table: "Postings",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                schema: "pro",
                table: "Currencies",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(3)",
                oldMaxLength: 3);

            migrationBuilder.AlterColumn<decimal>(
                name: "OverdraftLimit",
                schema: "pro",
                table: "Accounts",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "MinimumBalance",
                schema: "pro",
                table: "Accounts",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "HeldAmount",
                schema: "pro",
                table: "Accounts",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AlterColumn<string>(
                name: "CurrencyCode",
                schema: "pro",
                table: "Accounts",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(3)",
                oldMaxLength: 3);

            migrationBuilder.AlterColumn<decimal>(
                name: "Balance",
                schema: "pro",
                table: "Accounts",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            foreach (var currency in SeededCurrencies.CurrencySetAndUsdt)
            {
                migrationBuilder.InsertData(
                    schema: "pro", table: "Currencies", columns: CurrencyColumns,
                    values: [currency.Id, currency.Code, currency.Name, currency.DecimalPlaces, true,
                        SeededCurrencies.SeededBy, SeededCurrencies.SeededOn]);
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var currency in SeededCurrencies.CurrencySetAndUsdt)
            {
                migrationBuilder.DeleteData(schema: "pro", table: "Currencies", keyColumn: "Id", keyValue: currency.Id);
            }

            migrationBuilder.AlterColumn<decimal>(
                name: "SignedValue",
                schema: "pro",
                table: "Postings",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldPrecision: 18,
                oldScale: 6);

            migrationBuilder.AlterColumn<string>(
                name: "Currency",
                schema: "pro",
                table: "Postings",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(10)",
                oldMaxLength: 10);

            migrationBuilder.AlterColumn<decimal>(
                name: "BalanceAfter",
                schema: "pro",
                table: "Postings",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldPrecision: 18,
                oldScale: 6);

            migrationBuilder.AlterColumn<decimal>(
                name: "Amount",
                schema: "pro",
                table: "Postings",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldPrecision: 18,
                oldScale: 6);

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                schema: "pro",
                table: "Currencies",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(10)",
                oldMaxLength: 10);

            migrationBuilder.AlterColumn<decimal>(
                name: "OverdraftLimit",
                schema: "pro",
                table: "Accounts",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldPrecision: 18,
                oldScale: 6,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "MinimumBalance",
                schema: "pro",
                table: "Accounts",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldPrecision: 18,
                oldScale: 6,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "HeldAmount",
                schema: "pro",
                table: "Accounts",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldPrecision: 18,
                oldScale: 6);

            migrationBuilder.AlterColumn<string>(
                name: "CurrencyCode",
                schema: "pro",
                table: "Accounts",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(10)",
                oldMaxLength: 10);

            migrationBuilder.AlterColumn<decimal>(
                name: "Balance",
                schema: "pro",
                table: "Accounts",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldPrecision: 18,
                oldScale: 6);
        }
    }
}
