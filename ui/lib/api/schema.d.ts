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
    "/accounts/status-counts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Count accounts per status — every status, a status nothing holds with 0. Only the created-on window narrows it. */
        get: operations["getAccountStatusCounts"];
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
    "/postings/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read one posting. */
        get: operations["getPosting"];
        put?: never;
        post?: never;
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
        /** Register a currency. */
        post: operations["registerCurrency"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/currencies/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read one currency. */
        get: operations["getCurrency"];
        /** Correct a currency's name. */
        put: operations["updateCurrency"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/currencies/{id}/activate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reactivate a currency. */
        post: operations["activateCurrency"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/currencies/{id}/deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Deactivate a currency, so it is no longer offered for new accounts. */
        post: operations["deactivateCurrency"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/account-groups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List account groups, narrowed, sorted and paged. */
        get: operations["listAccountGroups"];
        put?: never;
        /** Create a group. */
        post: operations["createAccountGroup"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/account-groups/status-counts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Count groups per status — every status, a status nothing holds with 0. Only the created-on window narrows it. */
        get: operations["getAccountGroupStatusCounts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/account-groups/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read one group. */
        get: operations["getAccountGroup"];
        /** Change a group's name, description or metadata. */
        put: operations["updateAccountGroup"];
        post?: never;
        /** Delete a group that holds no account. */
        delete: operations["deleteAccountGroup"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/account-groups/{id}/close": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Close a group. */
        post: operations["closeAccountGroup"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/account-groups/{id}/activate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reopen a closed group. */
        post: operations["activateAccountGroup"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/account-groups/{id}/balances": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read a group's balances, one line per currency. */
        get: operations["getAccountGroupBalances"];
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
            available: string;
            held: string;
        };
        StatusCount: {
            type: string;
            status: string;
            count: number;
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
            /** Format: uuid */
            reversesPostingId?: string;
            /** Format: uuid */
            reversedByPostingId?: string;
        };
        PagedPostingResponse: {
            items: components["schemas"]["PostingDto"][];
            pageNumber: number;
            pageSize: number;
            pageCount: number;
            totalItemCount: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
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
            /** Format: uuid */
            id: string;
            code: string;
            name: string;
            decimalPlaces: number;
            isActive: boolean;
        };
        CreateCurrencyRequest: {
            code: string;
            name: string;
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
        UpdateCurrencyRequest: {
            name: string;
        };
        /** @enum {string} */
        AccountGroupType: "Customer" | "Merchant" | "Internal" | "Suspense" | "Settlement";
        /** @enum {string} */
        AccountGroupStatus: "Active" | "Closed";
        AccountGroupDto: {
            /** Format: uuid */
            id: string;
            code: string;
            name: string;
            description?: string;
            type: components["schemas"]["AccountGroupType"];
            status: components["schemas"]["AccountGroupStatus"];
            ownerId: string;
            metadata?: {
                [key: string]: string;
            };
        };
        CreateAccountGroupRequest: {
            code: string;
            name: string;
            description?: string;
            type: components["schemas"]["AccountGroupType"];
            ownerId: string;
            metadata?: {
                [key: string]: string;
            };
        };
        UpdateAccountGroupRequest: {
            name?: string;
            description?: string;
            metadata?: {
                [key: string]: string;
            };
        };
        AccountGroupBalanceLineDto: {
            currency: string;
            balance: string;
            available: string;
            held: string;
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
    getAccountStatusCounts: {
        parameters: {
            query?: {
                from?: string;
                to?: string;
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
                    "application/json": components["schemas"]["StatusCount"][];
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
    getPosting: {
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
                    "application/json": components["schemas"]["PostingDto"];
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
    registerCurrency: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCurrencyRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CurrencyDto"];
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
    getCurrency: {
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
                    "application/json": components["schemas"]["CurrencyDto"];
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
    updateCurrency: {
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
                "application/json": components["schemas"]["UpdateCurrencyRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CurrencyDto"];
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
    activateCurrency: {
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
                    "application/json": components["schemas"]["CurrencyDto"];
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
    deactivateCurrency: {
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
                    "application/json": components["schemas"]["CurrencyDto"];
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
                fromDate?: string;
                toDate?: string;
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
    createAccountGroup: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateAccountGroupRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountGroupDto"];
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
    getAccountGroupStatusCounts: {
        parameters: {
            query?: {
                from?: string;
                to?: string;
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
                    "application/json": components["schemas"]["StatusCount"][];
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
    getAccountGroup: {
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
                    "application/json": components["schemas"]["AccountGroupDto"];
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
    updateAccountGroup: {
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
                "application/json": components["schemas"]["UpdateAccountGroupRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountGroupDto"];
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
    deleteAccountGroup: {
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
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
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
    closeAccountGroup: {
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
                    "application/json": components["schemas"]["AccountGroupDto"];
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
    activateAccountGroup: {
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
                    "application/json": components["schemas"]["AccountGroupDto"];
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
    getAccountGroupBalances: {
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
                    "application/json": components["schemas"]["AccountGroupBalanceLineDto"][];
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
}
