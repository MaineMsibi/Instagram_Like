using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NotificationService.Models
{
    [Table("Notifications")]
    public class Notification
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public int TriggeredByUserId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty; // "follow" or "unfollow"

        [Required]
        [MaxLength(255)]
        public string TriggeredByUsername { get; set; } = string.Empty;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public bool IsRead { get; set; }
    }

    public record NotificationDto(
        int Id,
        int UserId,
        int TriggeredByUserId,
        string Type,
        string TriggeredByUsername,
        DateTime CreatedAt,
        bool IsRead
    );

    public record CreateNotificationDto(
        int UserId,
        int TriggeredByUserId,
        string Type,
        string TriggeredByUsername
    );
}