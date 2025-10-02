var builder = WebApplication.CreateBuilder(args);

// Add services for controllers
builder.Services.AddControllers();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // Optional: Add OpenAPI/Swagger if you want API documentation
    // builder.Services.AddEndpointsApiExplorer();
    // builder.Services.AddSwaggerGen();
    // app.MapSwagger();
}

// Map controllers
app.MapControllers();

app.Run();