using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

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

app.UseCors();

// Use Ocelot middleware
await app.UseOcelot();

await app.RunAsync();