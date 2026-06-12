from rest_framework import serializers, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import Match
from apps.users.models import User


class RecordMatchSerializer(serializers.Serializer):
    room_id = serializers.CharField()
    team_a_user_ids = serializers.ListField(child=serializers.IntegerField())
    team_b_user_ids = serializers.ListField(child=serializers.IntegerField())
    winning_team = serializers.ChoiceField(choices=["A", "B"])
    score_a = serializers.IntegerField()
    score_b = serializers.IntegerField()
    court_achieved = serializers.BooleanField(default=False)
    coat_achieved = serializers.BooleanField(default=False)
    started_at = serializers.DateTimeField()


class RecordMatchView(APIView):
    """
    Called by Node.js (server-to-server) when a game ends.
    Requires a shared service token passed as Bearer JWT.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        s = RecordMatchSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data

        match = Match.objects.create(
            room_id=d["room_id"],
            winning_team=d["winning_team"],
            score_a=d["score_a"],
            score_b=d["score_b"],
            court_achieved=d["court_achieved"],
            coat_achieved=d["coat_achieved"],
            started_at=d["started_at"],
        )

        team_a_users = User.objects.filter(id__in=d["team_a_user_ids"])
        team_b_users = User.objects.filter(id__in=d["team_b_user_ids"])
        match.team_a.set(team_a_users)
        match.team_b.set(team_b_users)

        # Update user stats
        for user in team_a_users:
            user.total_matches += 1
            if d["winning_team"] == "A":
                user.wins += 1
            else:
                user.losses += 1
            user.save(update_fields=["total_matches", "wins", "losses"])

        for user in team_b_users:
            user.total_matches += 1
            if d["winning_team"] == "B":
                user.wins += 1
            else:
                user.losses += 1
            user.save(update_fields=["total_matches", "wins", "losses"])

        return Response({"match_id": match.id}, status=status.HTTP_201_CREATED)
