using Microsoft.AspNetCore.Mvc;

namespace UserService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        // Temporary in-memory data
        private static readonly Dictionary<int, string> Users = new()
        {
            { 1, "Alice" },
            { 2, "Bob" }
        };

        [HttpGet("{id}")]
        public IActionResult GetUser(int id)
        {
            if (Users.TryGetValue(id, out var name))
                return Ok(new { Id = id, Name = name });

            return NotFound();
        }
    }
}
