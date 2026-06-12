from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/matches/", include("apps.matches.urls")),
    path("social/", include("social_django.urls", namespace="social")),  # OAuth callbacks
]
