export interface paths {
    "/accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List accounts. Shares the generic list query surface with /account-groups. */
        get: operations["listAccounts"];
        put?: never;
        /** Open an account. */
        post: operations["openAccount"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/accounts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read one account. */
        get: operations["getAccount"];
        /** Update an account's name and/or metadata. */
        put: operations["updateAccount"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Change status, overdraftLimit, minimumBalance and permittedToGoNegative only. */
        patch: operations["setAccountControls"];
        trace?: never;
    };
    "/account-groups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List account groups. Shares the generic list query surface with /accounts. */
        get: operations["listAccountGroups"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/accounts/balances": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read the ledger's position by currency — one line per currency, never combined. */
        get: operations["getLedgerBalances"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/accounts/{id}/balance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read an account's balance. */
        get: operations["getAccountBalance"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/accounts/{id}/statement": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read an account's postings as a date-bounded, paged statement in stream order. */
        get: operations["getAccountStatement"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/postings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List postings across every account, within a required effective-date window of at most 90 days. */
        get: operations["listPostings"];
        put?: never;
        /** Record one credit or debit. Idempotency key is required in the header. */
        post: operations["recordPosting"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/postings/{id}/reverse": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reverse a posting. Requires a reason in the body and an idempotency key in the header. */
        post: operations["reversePosting"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/currencies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List the reference currency set. */
        get: operations["listCurrencies"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        LedgerBalanceLineDto: {
            currency: string;
            balance: string;
        };
        AccountBalanceDto: {
            currency: string;
            balance: string;
            availableBalance: string;
            heldAmount: string;
            floor: string;
        };
        PostingDto: {
            /** Format: uuid */
            id: string;
            postingNumber: string;
            /** Format: uuid */
            accountId: string;
            streamPosition: number;
            direction: string;
            amount: string;
            signedAmount: string;
            currency: string;
            status: string;
            category?: string;
            description?: string;
            /** Format: date */
            effectiveDate?: string;
        };
        PagedPostingResponse: {
            items: components["schemas"]["PostingDto"][];
            pageIndex: number;
            pageSize: number;
            pageCount: number;
            hasNextPage: boolean;
        };
        RecordPostingRequest: {
            /** Format: uuid */
            accountId: string;
            /** @enum {string} */
            direction: "Debit" | "Credit";
            amount: string;
            currency: string;
            category: string;
            description?: string;
            /** Format: date */
            effectiveDate?: string;
        };
        CurrencyDto: {
            code: string;
            decimalPlaces: number;
        };
        AccountDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            groupId: string;
            accountNumber: string;
            name: string;
            currency: string;
            /** @enum {string} */
            classification: "Asset" | "Liability" | "Equity" | "Income" | "Expense";
            /** @enum {string} */
            status: "Active" | "Frozen" | "Dormant" | "Closed";
            balance: string;
            availableBalance: string;
            heldAmount: string;
            overdraftLimit?: string;
            minimumBalance?: string;
            permittedToGoNegative: boolean;
            streamPosition: number;
            externalReference?: string;
            metadata?: {
                [key: string]: string;
            };
            /** Format: date-time */
            openedOn: string;
            /** Format: date-time */
            closedOn?: string;
        };
        PagedAccountResponse: {
            items: components["schemas"]["AccountDto"][];
            pageNumber: number;
            pageSize: number;
            pageCount: number;
            totalItemCount: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
        OpenAccountRequest: {
            /** Format: uuid */
            groupId: string;
            name: string;
            currency: string;
            /** @enum {string} */
            classification: "Asset" | "Liability" | "Equity" | "Income" | "Expense";
            permittedToGoNegative: boolean;
            overdraftLimit?: string;
            minimumBalance?: string;
            externalReference?: string;
            metadata?: {
                [key: string]: string;
            };
        };
        UpdateAccountRequest: {
            name?: string;
            metadata?: {
                [key: string]: string;
            };
        };
        PatchAccountRequest: {
            /** @enum {string} */
            status?: "Active" | "Frozen" | "Dormant" | "Closed";
            overdraftLimit?: string;
            minimumBalance?: string;
            permittedToGoNegative?: boolean;
        };
        AccountGroupDto: {
            /** Format: uuid */
            id: string;
            code: string;
            name: string;
            description?: string;
            /** @enum {string} */
            type: "Customer" | "Merchant" | "Internal" | "Suspense" | "Settlement";
            /** @enum {string} */
            status: "Active" | "Closed";
            ownerId: string;
            metadata?: {
                [key: string]: string;
            };
        };
        PagedAccountGroupResponse: {
            items: components["schemas"]["AccountGroupDto"][];
            pageNumber: number;
            pageSize: number;
            pageCount: number;
            totalItemCount: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
        ErrorItem: {
            message: string;
            code?: string;
            field?: string;
        };
        RefusalBody: {
            status: number;
            errors: components["schemas"]["ErrorItem"][];
            traceId: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    listAccounts: {
        parameters: {
            query?: {
                filter?: string[];
                search?: string;
                orderBy?: string;
                desc?: boolean;
                pageNumber?: number;
                pageSize?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedAccountResponse"];
                };
            };
            /** @description Refused */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RefusalBody"];
                };
            };
        };
    };
    openAccount: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OpenAccountRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountDto"];
                };
            };
            /** @description Refused */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RefusalBody"];
                };
            };
        };
    };
    getAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountDto"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    updateAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateAccountRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountDto"];
                };
            };
            /** @description Refused */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RefusalBody"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    setAccountControls: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PatchAccountRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountDto"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Refused */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RefusalBody"];
                };
            };
        };
    };
    listAccountGroups: {
        parameters: {
            query?: {
                filter?: string[];
                search?: string;
                orderBy?: string;
                desc?: boolean;
                pageNumber?: number;
                pageSize?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedAccountGroupResponse"];
                };
            };
            /** @description Refused */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RefusalBody"];
                };
            };
        };
    };
    getLedgerBalances: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LedgerBalanceLineDto"][];
                };
            };
        };
    };
    getAccountBalance: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountBalanceDto"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAccountStatement: {
        parameters: {
            query?: {
                from?: string;
                to?: string;
                pageIndex?: number;
                pageSize?: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedPostingResponse"];
                };
            };
        };
    };
    listPostings: {
        parameters: {
            query?: {
                from?: string;
                to?: string;
                accountId?: string;
                direction?: string;
                category?: string;
                status?: string;
                search?: string;
                orderBy?: string;
                desc?: boolean;
                pageNumber?: number;
                pageSize?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedPostingResponse"];
                };
            };
            /** @description Refused */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RefusalBody"];
                };
            };
        };
    };
    recordPosting: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RecordPostingRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PostingDto"];
                };
            };
            /** @description Idempotency key conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RefusalBody"];
                };
            };
            /** @description Refused */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RefusalBody"];
                };
            };
        };
    };
    reversePosting: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    reason: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PostingDto"];
                };
            };
            /** @description Refused */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RefusalBody"];
                };
            };
        };
    };
    listCurrencies: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CurrencyDto"][];
                };
            };
        };
    };
}
