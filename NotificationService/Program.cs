using Microsoft.EntityFrameworkCore;
using NotificationService.Data;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .WriteTo.File("logs/notificationservice-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Add DbContext
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<NotificationDbContext>(options =>
    options.UseSqlite(connectionString));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Optional: Add health checks (install Microsoft.Extensions.Diagnostics.HealthChecks if needed)
builder.Services.AddHealthChecks();

var app = builder.Build();

// Apply migrations and create database
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<NotificationDbContext>();
    try
    {
        dbContext.Database.Migrate();
        Log.Information("Database migrations applied successfully");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Failed to apply database migrations");
        throw;  // Re-throw to fail startup if critical
    }
}

// Swagger always enabled (dev or prod)
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "NotificationService API V1");
});

// Middleware pipeline
app.UseSerilogRequestLogging();
app.UseCors();
app.UseRouting();

app.MapControllers();

// Simple health endpoint (returns "OK" for probes)
app.MapGet("/health", () => "OK").WithName("HealthCheck");

app.Run();