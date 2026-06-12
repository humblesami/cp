from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    avatar_url = models.URLField(blank=True, default="")
    total_matches = models.PositiveIntegerField(default=0)
    wins = models.PositiveIntegerField(default=0)
    losses = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.username

    @property
    def win_rate(self):
        if self.total_matches == 0:
            return 0
        return round((self.wins / self.total_matches) * 100, 1)
