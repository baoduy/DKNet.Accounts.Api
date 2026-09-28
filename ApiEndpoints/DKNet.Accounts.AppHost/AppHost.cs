using Projects;

var builder = DistributedApplication.CreateBuilder(args);

var cache = builder.AddRedis("Redis");
var postgres = builder.AddPostgres("Postgres");
var rabbitMq = builder.AddRabbitMQ("RabbitMq");

var apDb = postgres
    .AddDatabase("AppDb");

builder.AddProject<DKNet_Accounts_Api>("Api")
    .WithReference(cache, "Redis")
    .WithReference(apDb, "AppDb")
    .WithReference(rabbitMq)
    .WithEnvironment("FeatureManagement__EnableServiceBus", "true")
    .WithEnvironment("MessageBus__Transport", "RabbitMq")
    .WaitFor(cache)
    .WaitFor(apDb)
    .WaitFor(rabbitMq);

await builder.Build().RunAsync();