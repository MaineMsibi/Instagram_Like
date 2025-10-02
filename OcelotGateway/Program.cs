using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add Ocelot configuration
builder.Configuration
    .SetBasePath(builder.Environment.ContentRootPath)
    .AddOcelot();

// Add Ocelot services
builder.Services.AddOcelot(builder.Configuration);

// Add logging for development
if (builder.Environment.IsDevelopment())
{
    builder.Logging.AddConsole();
}

var app = builder.Build();

// Use Ocelot middleware
await app.UseOcelot();

await app.RunAsync();