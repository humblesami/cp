from django.urls import path
from .views import RecordMatchView

urlpatterns = [
    path("record/", RecordMatchView.as_view()),
]
