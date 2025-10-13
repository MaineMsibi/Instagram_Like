using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Neo4j.Driver;
using Serilog;
using System.Text;
using System.Text.Json;
using UserService.Controllers;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .WriteTo.File("logs/userservice-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Load JWT Settings from appsettings.json FIRST
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"];
var issuer = jwtSettings["Issuer"];
var audience = jwtSettings["Audience"];
var expirationMinutes = int.Parse(jwtSettings["ExpirationMinutes"] ?? "60");

// Log for debugging
Console.WriteLine($"[DEBUG] SecretKey: {(string.IsNullOrEmpty(secretKey) ? "NOT FOUND" : "OK")}");
Console.WriteLine($"[DEBUG] Issuer: {issuer}");
Console.WriteLine($"[DEBUG] Audience: {audience}");

// Ensure we have a secret key
if (string.IsNullOrEmpty(secretKey))
{
    secretKey = "your-secret-key-at-least-32-characters-long-for-HS256";
    Log.Warning("JWT SecretKey not found in appsettings.json, using default");
}

var key = Encoding.ASCII.GetBytes(secretKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = issuer,
        ValidateAudience = true,
        ValidAudience = audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

// CORS - Updated to include Ocelot gateway and localhost
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",      // Frontend 
                "http://localhost:5174",      // Frontend alternative
                "http://localhost:5272",      // Ocelot Gateway
                "http://localhost:5001"       // UserService (for Swagger testing)
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Swagger with JWT support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "UserService API", Version = "v1" });
    
    // Add JWT to Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer"
    });
    
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] { }
        }
    });
});

// Health Checks
builder.Services.AddHealthChecks();

// Neo4j Driver
var neo4jConfig = builder.Configuration.GetSection("Neo4j");
var uri = neo4jConfig["Uri"] ?? "bolt://localhost:7687";
var username = neo4jConfig["Username"] ?? "neo4j";
var password = neo4jConfig["Password"] ?? "password";

var driver = GraphDatabase.Driver(uri, AuthTokens.Basic(username, password));
builder.Services.AddSingleton<IDriver>(driver);

// Controllers
builder.Services.AddControllers();

// IMPORTANT: Register JwtSettings as a singleton so it can be injected into controllers
builder.Services.AddSingleton(new JwtSettings
{
    SecretKey = secretKey,
    Issuer = issuer,
    Audience = audience,
    ExpirationMinutes = expirationMinutes
});

var app = builder.Build();

// Middleware
if (app.Environment.IsDevelopment() || app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/swagger/v1/swagger.json", "UserService API v1"));
}


app.UseSerilogRequestLogging();
app.UseCors();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

// Health Check Endpoints
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/detailed", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var response = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description
            })
        };
        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
});

app.MapControllers();

app.Run();