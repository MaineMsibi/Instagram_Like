using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NotificationService.Data;
using NotificationService.Models;

namespace NotificationService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationsController : ControllerBase
    {
        private readonly NotificationDbContext _context;
        private readonly ILogger<NotificationsController> _logger;

        public NotificationsController(NotificationDbContext context, ILogger<NotificationsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // Health Check
        [HttpGet("health")]
        [AllowAnonymous]
        public IActionResult HealthCheck()
        {
            return Ok(new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow,
                service = "NotificationService"
            });
        }

        // Create Notification (called by UserService)
        [HttpPost]
        [AllowAnonymous] // UserService calls this internally
        public async Task<IActionResult> CreateNotification([FromBody] CreateNotificationDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Type))
                    return BadRequest("Type is required");
                if (dto.UserId <= 0 || dto.TriggeredByUserId <= 0)
                    return BadRequest("Valid user IDs required");

                var notification = new Notification
                {
                    UserId = dto.UserId,
                    TriggeredByUserId = dto.TriggeredByUserId,
                    Type = dto.Type,
                    TriggeredByUsername = dto.TriggeredByUsername,
                    CreatedAt = DateTime.UtcNow,
                    IsRead = false
                };

                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Notification created: User {UserId} got {Type} event from {TriggeredByUserId}",
                    dto.UserId, dto.Type, dto.TriggeredByUserId);

                return Ok(new NotificationDto(
                    notification.Id,
                    notification.UserId,
                    notification.TriggeredByUserId,
                    notification.Type,
                    notification.TriggeredByUsername,
                    notification.CreatedAt,
                    notification.IsRead
                ));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating notification");
                return StatusCode(500, "Internal server error");
            }
        }

        // Get notifications for a user
        [HttpGet("user/{userId}")]
        [Authorize]
        public async Task<IActionResult> GetUserNotifications(int userId)
        {
            try
            {
                var userNotifications = await _context.Notifications
                    .Where(n => n.UserId == userId)
                    .OrderByDescending(n => n.CreatedAt)
                    .Select(n => new NotificationDto(
                        n.Id, n.UserId, n.TriggeredByUserId, n.Type,
                        n.TriggeredByUsername, n.CreatedAt, n.IsRead
                    ))
                    .ToListAsync();

                return Ok(userNotifications);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching notifications for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        // Mark notification as read
        [HttpPut("{notificationId}/read")]
        [Authorize]
        public async Task<IActionResult> MarkAsRead(int notificationId)
        {
            try
            {
                var notification = await _context.Notifications.FindAsync(notificationId);
                if (notification == null)
                    return NotFound("Notification not found");

                notification.IsRead = true;
                await _context.SaveChangesAsync();

                return Ok("Marked as read");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking notification as read");
                return StatusCode(500, "Internal server error");
            }
        }

        // Get unread count
        [HttpGet("user/{userId}/unread-count")]
        [Authorize]
        public async Task<IActionResult> GetUnreadCount(int userId)
        {
            try
            {
                var count = await _context.Notifications
                    .CountAsync(n => n.UserId == userId && !n.IsRead);

                return Ok(new { unreadCount = count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching unread count");
                return StatusCode(500, "Internal server error");
            }
        }

        // Delete old notifications (optional maintenance endpoint)
        [HttpDelete("cleanup")]
        [AllowAnonymous]
        public async Task<IActionResult> CleanupOldNotifications()
        {
            try
            {
                var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
                var deletedCount = await _context.Notifications
                    .Where(n => n.CreatedAt < thirtyDaysAgo && n.IsRead)
                    .ExecuteDeleteAsync();

                _logger.LogInformation("Cleaned up {Count} old notifications", deletedCount);
                return Ok(new { deletedNotifications = deletedCount });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cleaning up old notifications");
                return StatusCode(500, "Internal server error");
            }
        }
    }
}