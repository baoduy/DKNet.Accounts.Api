DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = 'migrate') THEN
        CREATE SCHEMA migrate;
    END IF;
END $EF$;
CREATE TABLE IF NOT EXISTS migrate."CoreDbContext" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK_CoreDbContext" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
        IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = 'acc') THEN
            CREATE SCHEMA acc;
        END IF;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
        IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = 'seq') THEN
            CREATE SCHEMA seq;
        END IF;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    CREATE SEQUENCE seq."Seq_AccountNumber" START WITH 1 INCREMENT BY 1 MAXVALUE 9999999999 CYCLE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    CREATE SEQUENCE seq."Seq_Membership" AS integer START WITH 1 INCREMENT BY 1 MAXVALUE 99999 CYCLE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    CREATE SEQUENCE seq."Seq_PostingNumber" START WITH 1 INCREMENT BY 1 MAXVALUE 9999999999 CYCLE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    CREATE TABLE acc."AccountGroups" (
        "Id" uuid NOT NULL,
        "Code" character varying(5) NOT NULL,
        "Name" character varying(200) NOT NULL,
        "Description" character varying(1000),
        "Type" text NOT NULL,
        "Status" text NOT NULL,
        "OwnerId" character varying(100) NOT NULL,
        "Metadata" character varying(4000),
        "CreatedBy" character varying(255) NOT NULL,
        "CreatedOn" timestamp with time zone NOT NULL,
        "UpdatedBy" character varying(255),
        "UpdatedOn" timestamp with time zone,
        CONSTRAINT "PK_AccountGroups" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    CREATE TABLE acc."Accounts" (
        "Id" uuid NOT NULL,
        "AccountNumber" character varying(32) NOT NULL,
        "GroupId" uuid NOT NULL,
        "Name" character varying(200) NOT NULL,
        "CurrencyCode" character varying(10) NOT NULL,
        "Classification" text NOT NULL,
        "Status" text NOT NULL,
        "Balance" numeric(18,6) NOT NULL,
        "HeldAmount" numeric(18,6) NOT NULL,
        "OverdraftLimit" numeric(18,6),
        "MinimumBalance" numeric(18,6),
        "PermittedToGoNegative" boolean NOT NULL,
        "StreamPosition" bigint NOT NULL,
        "LastPostedOn" timestamp with time zone,
        "ExternalReference" character varying(200),
        "Metadata" character varying(4000),
        "ClosedOn" timestamp with time zone,
        "CreatedBy" character varying(255) NOT NULL,
        "CreatedOn" timestamp with time zone NOT NULL,
        "UpdatedBy" character varying(255),
        "UpdatedOn" timestamp with time zone,
        CONSTRAINT "PK_Accounts" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    CREATE TABLE acc."Currencies" (
        "Id" uuid NOT NULL,
        "Code" character varying(10) NOT NULL,
        "Name" character varying(100) NOT NULL,
        "DecimalPlaces" integer NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedBy" character varying(255) NOT NULL,
        "CreatedOn" timestamp with time zone NOT NULL,
        "UpdatedBy" character varying(255),
        "UpdatedOn" timestamp with time zone,
        CONSTRAINT "PK_Currencies" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    CREATE TABLE acc."Postings" (
        "Id" uuid NOT NULL,
        "AccountId" uuid NOT NULL,
        "PostingNumber" character varying(32) NOT NULL,
        "StreamPosition" bigint NOT NULL,
        "Direction" text NOT NULL,
        "Amount" numeric(18,6) NOT NULL,
        "Currency" character varying(10) NOT NULL,
        "SignedValue" numeric(18,6) NOT NULL,
        "BalanceAfter" numeric(18,6) NOT NULL,
        "EffectiveDate" date NOT NULL,
        "RecordedAt" timestamp with time zone NOT NULL,
        "Category" text NOT NULL,
        "Status" text NOT NULL,
        "ReversedByPostingId" uuid,
        "ReversesPostingId" uuid,
        "TransactionGroupId" uuid,
        "CounterpartyAccountId" uuid,
        "CounterpartyReference" character varying(200),
        "CallingSystem" character varying(100) NOT NULL,
        "IdempotencyKey" character varying(255),
        "IdempotencySignature" character varying(64),
        "ExternalReference" character varying(200),
        "Description" character varying(500),
        "Metadata" character varying(4000),
        "CreatedBy" character varying(255) NOT NULL,
        "CreatedOn" timestamp with time zone NOT NULL,
        "UpdatedBy" character varying(255),
        "UpdatedOn" timestamp with time zone,
        CONSTRAINT "PK_Postings" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    CREATE UNIQUE INDEX "IX_AccountGroups_Code" ON acc."AccountGroups" ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    CREATE UNIQUE INDEX "IX_Accounts_AccountNumber" ON acc."Accounts" ("AccountNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    CREATE INDEX "IX_Accounts_GroupId" ON acc."Accounts" ("GroupId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    CREATE UNIQUE INDEX "IX_Currencies_Code" ON acc."Currencies" ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    CREATE INDEX "IX_Postings_AccountId" ON acc."Postings" ("AccountId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    CREATE INDEX "IX_Postings_AccountId_EffectiveDate_StreamPosition" ON acc."Postings" ("AccountId", "EffectiveDate", "StreamPosition");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    CREATE UNIQUE INDEX "IX_Postings_AccountId_StreamPosition" ON acc."Postings" ("AccountId", "StreamPosition");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    CREATE UNIQUE INDEX "IX_Postings_CallingSystem_IdempotencyKey" ON acc."Postings" ("CallingSystem", "IdempotencyKey");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    CREATE UNIQUE INDEX "IX_Postings_PostingNumber" ON acc."Postings" ("PostingNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM migrate."CoreDbContext" WHERE "MigrationId" = '20261002065036_Initial') THEN
    INSERT INTO migrate."CoreDbContext" ("MigrationId", "ProductVersion")
    VALUES ('20261002065036_Initial', '10.0.12');
    END IF;
END $EF$;
COMMIT;

