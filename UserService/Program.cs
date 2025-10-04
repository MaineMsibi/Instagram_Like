using Microsoft.OpenApi.Models;  // For OpenApiInfo
using Neo4j.Driver;              // For GraphDatabase and IDriver

var builder = WebApplication.CreateBuilder(args);

// Add Swagger services
builder.Services.AddEndpointsApiExplorer();  // Generates OpenAPI metadata
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "UserService API", Version = "v1" });
});

// Add Neo4j driver as singleton
var neo4jConfig = builder.Configuration.GetSection("Neo4j");
var uri = neo4jConfig["Uri"];
var username = neo4jConfig["Username"];
var password = neo4jConfig["Password"];

var driver = GraphDatabase.Driver(uri, AuthTokens.Basic(username, password));
builder.Services.AddSingleton<IDriver>(driver);

// Add services for controllers
builder.Services.AddControllers();

var app = builder.Build();

// Swagger in development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/swagger/v1/swagger.json", "UserService API v1"));
}

// Enable routing (good practice for controllers)
app.UseRouting();

// Map controllers
app.MapControllers();

app.Run();