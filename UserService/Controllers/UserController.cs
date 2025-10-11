using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Neo4j.Driver;
using System.Text.Json;  // For logging DTO if needed

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

        // UPDATED: GET /api/Users/{userId} - Now includes password
[HttpGet("{userId}")]
public async Task<IActionResult> GetUser(int userId)
{
    try
    {
        await using var session = _driver.AsyncSession();
        var result = await session.RunAsync(@"
            MATCH (u:User {user_id: $userId})
            OPTIONAL MATCH (u)-[:FOLLOWS]->(following:User)
            WITH u, count(following) AS followingCount
            OPTIONAL MATCH (f:User)-[:FOLLOWS]->(u)
            WITH u, followingCount, count(f) AS followersCount
            RETURN u.user_id AS userId, 
                   u.username AS username, 
                   u.full_name AS name, 
                   u.email AS email,
                   u.password AS password,
                   u.joined AS joined, 
                   u.bio AS bio,
                   followingCount,
                   followersCount",
            new { userId });

        var records = await result.ToListAsync();
        if (records.Count == 0)
            return NotFound();

        var record = records[0];
        var user = new
        {
            Id = record["userId"].As<int>(),
            Username = record["username"].As<string>(),
            Email = record["email"]?.As<string>() ?? "",
            Name = record["name"]?.As<string>() ?? "",
            Password = record["password"]?.As<string>() ?? "",
            Bio = record["bio"]?.As<string>() ?? "",
            Followers = record["followersCount"].As<int>(),
            Following = record["followingCount"].As<int>()
        };
        return Ok(user);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error fetching user {userId}", userId);
        return StatusCode(500, "Internal server error");
    }
}

        // UPDATED: GET /api/Users - Now includes password
[HttpGet]
public async Task<IActionResult> GetUsers()
{
    try
    {
        await using var session = _driver.AsyncSession();
        var result = await session.RunAsync(@"
            MATCH (u:User)
            OPTIONAL MATCH (u)-[:FOLLOWS]->(following:User)
            WITH u, count(following) AS followingCount
            OPTIONAL MATCH (f:User)-[:FOLLOWS]->(u)
            WITH u, followingCount, count(f) AS followersCount
            RETURN u.user_id AS userId, 
                   u.username AS username, 
                   u.full_name AS name, 
                   u.email AS email,
                   u.password AS password,
                   u.joined AS joined, 
                   u.bio AS bio,
                   followingCount,
                   followersCount
            ORDER BY u.user_id");

        var records = await result.ToListAsync();
        var users = records.Select(r => new
        {
            Id = r["userId"].As<int>(),
            Username = r["username"].As<string>(),
            Email = r["email"]?.As<string>() ?? "",
            Name = r["name"]?.As<string>() ?? "",
            Password = r["password"]?.As<string>() ?? "",
            Bio = r["bio"]?.As<string>() ?? "",
            Followers = r["followersCount"].As<int>(),
            Following = r["followingCount"].As<int>()
        }).ToList();

        return Ok(users);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error fetching users");
        return StatusCode(500, "Internal server error");
    }
}


        // UPDATED: POST /api/Users - Now includes password
[HttpPost]
public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
{
    try
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(dto.Username))
            return BadRequest("Username is required");
        if (string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest("Email is required");
        if (string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest("Password is required");

        await using var session = _driver.AsyncSession();

        // Step 1: Get the next available ID
        var maxIdResult = await session.RunAsync(@"
            MATCH (u:User)
            RETURN MAX(u.user_id) AS maxId");

        var maxIdRecord = await maxIdResult.SingleAsync();
        var maxId = maxIdRecord["maxId"].As<int?>();
        var nextId = (maxId ?? 0) + 1;

        // Step 2: Create the user with the next ID
        var result = await session.RunAsync(@"
            CREATE (newUser:User {
                user_id: $userId, 
                username: $username, 
                full_name: $name, 
                email: $email,
                password: $password,
                joined: datetime(), 
                bio: $bio
            })
            RETURN newUser.user_id AS userId, 
                   newUser.username AS username, 
                   newUser.full_name AS name, 
                   newUser.email AS email,
                   newUser.password AS password,
                   newUser.joined AS joined, 
                   newUser.bio AS bio",
            new
            {
                userId = nextId,
                username = dto.Username,
                name = dto.Name ?? dto.Username,
                email = dto.Email,
                password = dto.Password,
                bio = dto.Bio ?? ""
            });

        var record = await result.SingleAsync();

        var newUser = new
        {
            Id = record["userId"].As<int>(),
            Username = record["username"].As<string>(),
            Email = record["email"].As<string>(),
            Name = record["name"].As<string>(),
            Password = record["password"].As<string>(),
            Bio = record["bio"]?.As<string>() ?? "",
            Followers = 0,
            Following = 0
        };

        return CreatedAtAction(nameof(GetUser), new { userId = newUser.Id }, newUser);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error creating user");
        return StatusCode(500, $"Internal server error: {ex.Message}");
    }
}

        // FIXED: PUT /api/Users/{userId} - Added validation, second WITH for counts, null-safe returns
        [HttpPut("{userId}")]
        public async Task<IActionResult> UpdateUser(int userId, [FromBody] UpdateUserDto dto)
        {
            try
            {
                // FIXED: Add validation (like CreateUser) to catch bad payloads early
                if (string.IsNullOrWhiteSpace(dto.Username))
                    return BadRequest("Username is required");
                if (string.IsNullOrWhiteSpace(dto.Email ?? ""))
                    return BadRequest("Email is required");

                // Optional: Log incoming DTO for debugging (remove later)
                _logger.LogInformation("Update payload: {Payload}", JsonSerializer.Serialize(dto));

                await using var session = _driver.AsyncSession();
                var result = await session.RunAsync(@"
                    MATCH (u:User {user_id: $userId})
                    SET u.username = $username, 
                        u.full_name = $name, 
                        u.email = $email,
                        u.bio = $bio
                    WITH u  // FIXED: Required WITH after SET before MATCH
                    OPTIONAL MATCH (u)-[:FOLLOWS]->(following:User)
                    WITH u, count(following) AS followingCount
                    OPTIONAL MATCH (f:User)-[:FOLLOWS]->(u)
                    WITH u, followingCount, count(f) AS followersCount  // FIXED: Re-aggregate per user
                    RETURN u.user_id AS userId, 
                        u.username AS username, 
                        u.full_name AS name, 
                        u.email AS email,
                        u.bio AS bio,
                        followingCount,
                        followersCount",
                    new { userId, username = dto.Username, name = dto.Name ?? dto.Username, email = dto.Email ?? "", bio = dto.Bio ?? "" });

                var records = await result.ToListAsync();
                if (records.Count == 0)
                    return NotFound($"User with ID {userId} not found");

                var record = records[0];
                var updatedUser = new
                {
                    Id = record["userId"].As<int>(),
                    Username = record["username"].As<string>(),
                    Email = record["email"]?.As<string>() ?? "",
                    Name = record["name"]?.As<string>() ?? "",
                    Bio = record["bio"]?.As<string>() ?? "",
                    Followers = record["followersCount"].As<int>(),
                    Following = record["followingCount"].As<int>()
                };
                return Ok(updatedUser);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user {userId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }
        // NEW: POST /api/Users/{userId}/follow/{targetUserId} - Follow a user
        [HttpPost("{userId}/follow/{targetUserId}")]
        public async Task<IActionResult> FollowUser(int userId, int targetUserId)
        {
            try
            {
                // Prevent user from following themselves
                if (userId == targetUserId)
                    return BadRequest("You cannot follow yourself");

                await using var session = _driver.AsyncSession();

                // Check if both users exist and create follow relationship
                var result = await session.RunAsync(@"
                    MATCH (u:User {user_id: $userId}), (t:User {user_id: $targetUserId})
                    MERGE (u)-[:FOLLOWS]->(t)
                    RETURN u.user_id AS userId",
                    new { userId, targetUserId });

                var records = await result.ToListAsync();
                if (records.Count == 0)
                    return NotFound("One or both users not found");

                return Ok(new { message = "Followed successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error following user {targetUserId} by user {userId}", targetUserId, userId);
                return StatusCode(500, "Internal server error");
            }
        }

        // NEW: POST /api/Users/{userId}/unfollow/{targetUserId} - Unfollow a user
        [HttpPost("{userId}/unfollow/{targetUserId}")]
        public async Task<IActionResult> UnfollowUser(int userId, int targetUserId)
        {
            try
            {
                // Prevent user from unfollowing themselves
                if (userId == targetUserId)
                    return BadRequest("You cannot unfollow yourself");

                await using var session = _driver.AsyncSession();

                // Delete the follow relationship if it exists
                var result = await session.RunAsync(@"
                    MATCH (u:User {user_id: $userId})-[rel:FOLLOWS]->(t:User {user_id: $targetUserId})
                    DELETE rel
                    RETURN COUNT(rel) AS deletedCount",
                    new { userId, targetUserId });

                var record = await result.SingleAsync();
                var deletedCount = record["deletedCount"].As<int>();

                if (deletedCount == 0)
                    return BadRequest("Follow relationship not found");

                return Ok(new { message = "Unfollowed successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unfollowing user {targetUserId} by user {userId}", targetUserId, userId);
                return StatusCode(500, "Internal server error");
            }
        }

        // NEW: GET /api/Users/{userId}/followers - List followers
        [HttpGet("{userId}/followers")]
        public async Task<IActionResult> GetFollowers(int userId)
        {
            try
            {
                await using var session = _driver.AsyncSession();
                var result = await session.RunAsync(@"
                    MATCH (f:User)-[:FOLLOWS]->(u:User {user_id: $userId})
                    RETURN f.user_id AS userId, 
                        f.username AS username, 
                        f.full_name AS name, 
                        f.email AS email,
                        f.bio AS bio
                    ORDER BY f.username",
                    new { userId });

                var records = await result.ToListAsync();
                var followers = records.Select(r => new
                {
                    Id = r["userId"].As<int>(),
                    Username = r["username"].As<string>(),
                    Name = r["name"]?.As<string>() ?? "",
                    Email = r["email"]?.As<string>() ?? "",
                    Bio = r["bio"]?.As<string>() ?? ""
                }).ToList();

                return Ok(followers);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching followers for user {userId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        // NEW: GET /api/Users/{userId}/following - List following
        [HttpGet("{userId}/following")]
        public async Task<IActionResult> GetFollowing(int userId)
        {
            try
            {
                await using var session = _driver.AsyncSession();
                var result = await session.RunAsync(@"
                    MATCH (u:User {user_id: $userId})-[:FOLLOWS]->(f:User)
                    RETURN f.user_id AS userId, 
                        f.username AS username, 
                        f.full_name AS name, 
                        f.email AS email,
                        f.bio AS bio
                    ORDER BY f.username",
                    new { userId });

                var records = await result.ToListAsync();
                var following = records.Select(r => new
                {
                    Id = r["userId"].As<int>(),
                    Username = r["username"].As<string>(),
                    Name = r["name"]?.As<string>() ?? "",
                    Email = r["email"]?.As<string>() ?? "",
                    Bio = r["bio"]?.As<string>() ?? ""
                }).ToList();

                return Ok(following);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching following for user {userId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }
    }

    // FIXED: DTOs - Made Email nullable (string?) to avoid binding fails if omitted
    public record CreateUserDto(string Name, string Username, string Email, string Password, string? Bio);
    public record UpdateUserDto(string Name, string Username, string? Email, string? Bio);  // Nullable Email
}