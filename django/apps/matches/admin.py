from django.contrib import admin
from .models import Match


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ["id", "room_id", "winning_team", "score_a", "score_b", "court_achieved", "coat_achieved", "ended_at"]
    list_filter = ["winning_team", "court_achieved", "coat_achieved"]
    search_fields = ["room_id"]
    readonly_fields = ["ended_at"]
