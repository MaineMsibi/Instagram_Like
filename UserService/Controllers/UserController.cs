using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;  // For ILogger
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

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetUser(int userId)
        {
            try
            {
                await using var session = _driver.AsyncSession();
                var result = await session.RunAsync(@"
                    MATCH (u:User {user_id: $userId})
                    RETURN u.name AS name",
                    new { userId});

                var records = await result.ToListAsync();  // Fetch all (expected: 0 or 1)
                if (records.Count == 0)
                    return NotFound();

                var record = records[0];  // Take the first (only) record
                var name = record["name"].As<string>();
                return Ok(new { UserId = userId, Name = name });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching user {userId}", userId);
                return StatusCode(500, "Internal server error");
            }

        }
    }
}