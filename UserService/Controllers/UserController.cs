using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Neo4j.Driver;

namespace UserService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IDriver _driver;
        private readonly ILogger<UsersController> _logger;

        public UsersController(IDriver driver, ILogger<UsersController> logger)
        {
            _driver = driver;
            _logger = logger;
        }

        // UPDATED: GET /api/Users/{userId} - Return full user data
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetUser(int userId)
        {
            try
            {
                await using var session = _driver.AsyncSession();
                var result = await session.RunAsync(@"
                    MATCH (u:User {user_id: $userId})
                    RETURN u.user_id AS userId, u.username AS username, u.full_name AS name, u.location AS location, u.joined AS joined, u.bio AS bio",
                    new { userId });

                var records = await result.ToListAsync();
                if (records.Count == 0)
                    return NotFound();

                var record = records[0];
                var user = new
                {
                    Id = record["userId"].As<int>().ToString(),
                    Username = record["username"].As<string>(),
                    Email = record["location"].As<string>() + "@example.com",  // Placeholder; derive from location or add email property
                    Name = record["name"].As<string>(),
                    Bio = record["bio"]?.As<string>() ?? "",
                    Followers = 0,  // Placeholder; query incoming FOLLOWS later
                    Following = 0   // Placeholder; query outgoing FOLLOWS later
                };
                return Ok(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching user {userId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        // NEW: GET /api/Users - List all users
        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            try
            {
                await using var session = _driver.AsyncSession();
                var result = await session.RunAsync(@"
                    MATCH (u:User)
                    RETURN u.user_id AS userId, u.username AS username, u.full_name AS name, u.location AS location, u.joined AS joined, u.bio AS bio
                    ORDER BY u.user_id");

                var records = await result.ToListAsync();
                var users = records.Select(r => new
                {
                    Id = r["userId"].As<int>().ToString(),
                    Username = r["username"].As<string>(),
                    Email = r["location"].As<string>() + "@example.com",  // Placeholder
                    Name = r["name"].As<string>(),
                    Bio = r["bio"]?.As<string>() ?? "",
                    Followers = 0,
                    Following = 0
                }).ToList();

                return Ok(users);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching users");
                return StatusCode(500, "Internal server error");
            }
        }

        // NEW: POST /api/Users - Create user
        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
        {
            try
            {
                await using var session = _driver.AsyncSession();
                await using var tx = await session.BeginTransactionAsync();
                var result = await tx.RunAsync(@"
                    CREATE (u:User {user_id: $userId, username: $username, full_name: $name, location: $location, joined: datetime(), bio: $bio})
                    RETURN u.user_id AS userId, u.username AS username, u.full_name AS name, u.location AS location, u.joined AS joined, u.bio AS bio",
                    new { userId = dto.UserId, username = dto.Username, name = dto.Name, location = dto.Email?.Split('@')[0] ?? "Unknown", bio = dto.Bio ?? "" });

                var record = await result.SingleAsync();
                await tx.CommitAsync();

                var newUser = new
                {
                    Id = record["userId"].As<int>().ToString(),
                    Username = record["username"].As<string>(),
                    Email = record["location"].As<string>() + "@example.com",
                    Name = record["name"].As<string>(),
                    Bio = record["bio"]?.As<string>() ?? "",
                    Followers = 0,
                    Following = 0
                };
                return CreatedAtAction(nameof(GetUser), new { userId = newUser.Id }, newUser);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating user");
                return StatusCode(500, "Internal server error");
            }
        }

        // NEW: PUT /api/Users/{userId} - Update user
        [HttpPut("{userId}")]
        public async Task<IActionResult> UpdateUser(int userId, [FromBody] UpdateUserDto dto)
        {
            try
            {
                await using var session = _driver.AsyncSession();
                var result = await session.RunAsync(@"
                    MATCH (u:User {user_id: $userId})
                    SET u.username = $username, u.full_name = $name, u.bio = $bio
                    RETURN u.user_id AS userId, u.username AS username, u.full_name AS name, u.bio AS bio",
                    new { userId, username = dto.Username, name = dto.Name, bio = dto.Bio ?? "" });

                var records = await result.ToListAsync();
                if (records.Count == 0)
                    return NotFound();

                var record = records[0];
                var updatedUser = new
                {
                    Id = record["userId"].As<int>().ToString(),
                    Username = record["username"].As<string>(),
                    Email = "updated@example.com",  // Placeholder; update schema if needed
                    Name = record["name"].As<string>(),
                    Bio = record["bio"]?.As<string>() ?? "",
                    Followers = 0,
                    Following = 0
                };
                return Ok(updatedUser);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user {userId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }
    }

    // DTOs (add at end of file)
    public record CreateUserDto(int UserId, string Name, string Username, string? Email, string? Bio);
    public record UpdateUserDto(string Name, string Username, string? Bio);
}