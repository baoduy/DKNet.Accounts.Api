# Deploying DKNet.Accounts.Api

The repository publishes API and console images; the Helm chart describes how to run both on Kubernetes.

## 📦 What ships

`.github/workflows/docker-publish.yml` runs on a push to `main` or manual dispatch. It derives `NEXT_VERSION` from Git tags and publishes `ghcr.io/baoduy/dknet.accounts-api:<version>` and `ghcr.io/baoduy/dknet.accounts-console:<version>`, each also tagged `latest`. The same workflow packs `DKNet.Accounts.Client` for GitHub Packages and creates a GitHub Release tagged `v<version>`; the release step may fail without failing the workflow.

`helm/dknet-accounts/Chart.yaml` names chart `dknet-accounts`, version `0.1.0`, with 2 `drunk-app` dependencies. No workflow in this repository packages or deploys the chart. Record the deployed commit, image version tags, and chart version together: the chart version does not change when the image workflow publishes a new tag.

## 🔄 Release path

![A pull request to dev runs build and test checks; a manual promotion to main triggers versioned API and console image publication, then an operator supplies chart values and upgrades the cluster manually.](diagrams/release-path.svg)

| Stage | Trigger | What it does | Gate |
|---|---|---|---|
| Build & Test | Pull request to `dev`, push to `dev`, or manual dispatch | Restores, builds, and tests .NET; checks the console and chart | Workflow job results |
| Promote to `main` | Human action outside these workflows | Brings the chosen commit onto `main` | Repository review process; no promotion job is defined |
| Publish Docker Image | Push to `main` or manual dispatch | Calculates a version; publishes API and console images, client package, and release | Workflow job results |
| Configure chart | Operator action | Supplies real chart values, secrets, and matching image tags | Operator review |
| Deploy | Operator action | Installs or upgrades the chart | Kubernetes rollout and probes |

The workflows name `dev` and `main` branches, not deployment environments. The chart describes a Kubernetes installation, but the repository does not show which cluster or namespace runs it.

## 🧱 Runtime shape

The umbrella chart enables 1 API Deployment and 1 console Deployment through the aliased `drunk-app` dependency. Each has a ClusterIP Service. API container port is 8080; console container port is 3000. Both request 100m CPU and 128Mi memory, limit 500m CPU and 256Mi memory, use a read-only root filesystem, and mount writable temporary storage. Their service accounts carry an Azure workload identity annotation.

The API HTTPRoute is disabled by default; the console HTTPRoute is enabled and refers to an existing Gateway. Both liveness and readiness probes call `/healthz`. The API's `HealthzConfig` checks `CoreDbContext` connectivity and a basic `HealthCheckHandler`; it returns only a status body to anonymous callers. The console's `/healthz` is a liveness route and does not prove API or database reachability. A passing console probe alone is therefore insufficient for rollout verification.

The chart creates no PostgreSQL, Redis, message broker, Gateway, Entra registration, or Key Vault. Supply these before installation. Its `AppDb` secret and defaults describe PostgreSQL only. SQL Server is supported by the API and local AppHost, but this chart contains no SQL Server path.

## ⚙️ Configuration and secrets

`helm/dknet-accounts/values.yaml` maps nonsecret values through `configMap` and secret names through Azure Key Vault CSI `secretProvider` into environment variables. The operator supplies tenant, vault, identity, Gateway, hostnames, image tags, and the named secrets. The API secret set includes `ConnectionStrings__AppDb`, Redis and Azure Bus connection strings, and bearer issuer metadata. The console has its own Entra, Redis, session, and token-key secrets.

The chart's `drunk-app` dependency currently emits `userAssignedIdentityID` but not the `clientID` parameter needed by the Azure Key Vault CSI workload identity path. The operator must patch both generated SecretProviderClasses after each install or upgrade as documented in the comments in `values.yaml`, or use a corrected dependency. Verify the patch before expecting pods to read secrets.

See the [configuration reference](configuration-reference.md) for each key's effect. Replace chart placeholders with deployment-specific values; the repository does not provide live secret values.

## 🗃️ Database changes

With the chart's `FeatureManagement__RunDbMigrationWhenAppStart=true`, the API calls `DbMigration.RunMigrationAsync` during startup. `InfraMigration.MigrateDb` applies the selected EF Core migrations and seeds reference data. The selected database's outbox also creates tables at startup. The API pod therefore needs a usable database connection and table-creation rights before it can become ready. The chart sets 1 API replica while startup migration is enabled.

The repository includes separate PostgreSQL and SQL Server migration assemblies. This chart configures PostgreSQL. The repo does not prove whether a previous deployed application version can run against a newly migrated schema; test rollback compatibility before a migration-bearing rollout.

## 🚀 Deploy

The repository has no automatic deploy workflow. An operator must choose a commit already published by `docker-publish.yml`, obtain its version tag, fill in `helm/dknet-accounts/values.yaml` placeholders and Key Vault secrets, and select a Kubernetes namespace and existing Gateway. Build the chart dependencies from `helm/dknet-accounts`, then install or upgrade the chart with the matching `api.global.tag` and `console.global.tag` values. An upgrade restarts the workloads when their pod templates change; the API may apply migrations on startup. The chart does not create or migrate PostgreSQL itself.

After the Helm operation, patch the 2 SecretProviderClasses' `clientID` fields as the chart comments specify, and verify that the secret mounts and rollout are healthy. The patch is a manual step after each upgrade. No command in this guide has been run against a cluster by this documentation change.

## ✅ Verify

Check both workload rollouts and probe results in the chosen namespace. `GET /healthz` on the API should return HTTP 200 with `{"status":"Healthy"}` when its database check passes. The console's `GET /healthz` should return a healthy response for its own process. With a valid token carrying `accounts.read`, `GET /v1/currencies` should return HTTP 200 with a paged currency list, as shown in [Currencies](features/currencies.md).

Inspect pod logs for migration completion and failed outbox sends. The repository does not define a post-deploy observation window or alert thresholds.

## ↩️ Roll back

Choose the previously published API and console image tags and apply them with the chart's upgrade procedure. Restore the `clientID` patches if the upgrade recreates the SecretProviderClasses. The previous image must be checked for compatibility with any schema migration already applied.

Rolling back images does **not** undo database migrations, newly written accounts or postings, or events already sent to a broker. The repository has no automated down-migration or data rollback workflow.

## 🧯 When a deploy fails

| What you see | Likely cause | What to do |
|---|---|---|
| API probe fails or returns `Unhealthy` | `CoreDbContext` cannot reach or use `AppDb`, or startup migration failed | Check the connection secret, database availability, and API logs; verify migration rights |
| Pod cannot mount Key Vault secrets | SecretProviderClass lacks `clientID`, identity federation, or required secret access | Apply the documented `clientID` patch and check the vault identity and secret names |
| Console is healthy but API calls fail | Console liveness does not check the API; API or bearer setup may be unavailable | Check API `/healthz`, API logs, and token validation settings |
| Events stop arriving while writes succeed | Broker connection is missing or down; events may wait in the outbox when enabled | Check broker connection and outbox logs; consumers should deduplicate by message ID |
| Chart cannot resolve dependencies | `drunk-app` OCI dependency was not built or is unavailable | Check `Chart.yaml` and the chart dependency build result |

## ❓ Open questions

| Question | Why it matters | Checked | Who can answer |
|---|---|---|---|
| Which cluster, namespace, and release name receive this chart? | Operators need a concrete target. | Workflows and chart contain no deploy target. | Service operator |
| Who owns deployment approval and support? | Rollback needs an escalation path. | No owner or support route is defined in this repo. | Service owner |
| What backup, recovery time, data-loss, and service objectives apply? | Migration and rollback decisions depend on them. | Chart and workflows contain no target or backup procedure. | Service owner |
| What observation window and alerts determine rollout success? | Probe success alone does not cover event delivery. | No post-deploy runbook or alert policy is present. | Service operator |
