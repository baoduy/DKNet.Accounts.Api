using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DKNet.Accounts.Infra.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAccountGroupNesting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AccountGroups_ParentId",
                schema: "pro",
                table: "AccountGroups");

            migrationBuilder.DropColumn(
                name: "ParentId",
                schema: "pro",
                table: "AccountGroups");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ParentId",
                schema: "pro",
                table: "AccountGroups",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AccountGroups_ParentId",
                schema: "pro",
                table: "AccountGroups",
                column: "ParentId");
        }
    }
}
