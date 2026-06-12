from rest_framework_simplejwt.tokens import RefreshToken


def save_avatar(backend, user, response, *args, **kwargs):
    """Pull avatar URL from Google or Facebook OAuth response."""
    if backend.name == "google-oauth2":
        picture = response.get("picture", "")
        if picture and not user.avatar_url:
            user.avatar_url = picture
            user.save(update_fields=["avatar_url"])

    elif backend.name == "facebook":
        picture = response.get("picture", {}).get("data", {}).get("url", "")
        if picture and not user.avatar_url:
            user.avatar_url = picture
            user.save(update_fields=["avatar_url"])


def issue_jwt_tokens(backend, user, *args, **kwargs):
    """
    Attach JWT tokens to the pipeline so the redirect URL can carry them.
    The frontend callback page reads them from the URL query params.
    """
    refresh = RefreshToken.for_user(user)
    return {
        "access_token": str(refresh.access_token),
        "refresh_token": str(refresh),
    }
