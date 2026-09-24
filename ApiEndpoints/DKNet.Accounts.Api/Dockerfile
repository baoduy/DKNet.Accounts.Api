# Local builds only: docker-compose.yml builds the API from this file when API_IMAGE is blank.
# The published ghcr image is produced by the .NET SDK container publish in
# .github/workflows/docker-publish.yml (container properties live in the csproj), not by this file.
# Build context is the repository root — restore needs Directory.Packages.props and global.json.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /repo
COPY Directory.Packages.props global.json ./
COPY ApiEndpoints/DKNet.Accounts.Api/DKNet.Accounts.Api.csproj ApiEndpoints/DKNet.Accounts.Api/
COPY ApiEndpoints/DKNet.Accounts.AppServices/DKNet.Accounts.AppServices.csproj ApiEndpoints/DKNet.Accounts.AppServices/
COPY ApiEndpoints/DKNet.Accounts.Domains/DKNet.Accounts.Domains.csproj ApiEndpoints/DKNet.Accounts.Domains/
COPY ApiEndpoints/DKNet.Accounts.Infra/DKNet.Accounts.Infra.csproj ApiEndpoints/DKNet.Accounts.Infra/
COPY ApiEndpoints/DKNet.Accounts.Share/DKNet.Accounts.Share.csproj ApiEndpoints/DKNet.Accounts.Share/
RUN dotnet restore ApiEndpoints/DKNet.Accounts.Api/DKNet.Accounts.Api.csproj
COPY ApiEndpoints/DKNet.Accounts.Api ApiEndpoints/DKNet.Accounts.Api
COPY ApiEndpoints/DKNet.Accounts.AppServices ApiEndpoints/DKNet.Accounts.AppServices
COPY ApiEndpoints/DKNet.Accounts.Domains ApiEndpoints/DKNet.Accounts.Domains
COPY ApiEndpoints/DKNet.Accounts.Infra ApiEndpoints/DKNet.Accounts.Infra
COPY ApiEndpoints/DKNet.Accounts.Share ApiEndpoints/DKNet.Accounts.Share
RUN dotnet publish ApiEndpoints/DKNet.Accounts.Api/DKNet.Accounts.Api.csproj \
    --configuration Release --no-restore --output /app

# Same base and user as the csproj's ContainerBaseImage / ContainerUser, so a local build
# behaves like the published image. wget (compose healthcheck) ships with alpine.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
WORKDIR /app
COPY --from=build /app ./
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "DKNet.Accounts.Api.dll"]
