from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ["username", "email", "total_matches", "wins", "losses", "win_rate", "date_joined"]
    list_filter = ["is_staff", "is_active"]
    search_fields = ["username", "email"]
    readonly_fields = ["total_matches", "wins", "losses", "win_rate"]

    fieldsets = UserAdmin.fieldsets + (
        ("Game Stats", {"fields": ("avatar_url", "total_matches", "wins", "losses")}),
    )
