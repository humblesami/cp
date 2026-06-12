from django.db import models
from apps.users.models import User


class Match(models.Model):
    TEAM_CHOICES = [("A", "Team A"), ("B", "Team B")]

    room_id = models.CharField(max_length=64, db_index=True)
    team_a = models.ManyToManyField(User, related_name="matches_as_team_a")
    team_b = models.ManyToManyField(User, related_name="matches_as_team_b")
    winning_team = models.CharField(max_length=1, choices=TEAM_CHOICES)
    score_a = models.PositiveSmallIntegerField(default=0)
    score_b = models.PositiveSmallIntegerField(default=0)
    court_achieved = models.BooleanField(default=False)   # someone won all 13
    coat_achieved = models.BooleanField(default=False)    # someone won first 7 consecutive
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-ended_at"]

    def __str__(self):
        return f"Match {self.id} | Room {self.room_id} | Winner: Team {self.winning_team}"

    @property
    def duration_seconds(self):
        return int((self.ended_at - self.started_at).total_seconds())
