"""Views for usuarios app — authentication endpoints."""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import CustomTokenObtainPairSerializer, UsuarioSerializer, UsuarioCriarSerializer
from .models import Usuario


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — returns access + refresh JWT with user info."""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class RefreshView(TokenRefreshView):
    """POST /api/auth/refresh/ — refresh access token."""
    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    """POST /api/auth/logout/ — blacklist the refresh token."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'detail': 'O campo refresh é obrigatório.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Logout realizado com sucesso.'}, status=status.HTTP_200_OK)
        except Exception:
            return Response(
                {'detail': 'Token inválido ou expirado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PUT /api/auth/me/ — current authenticated user profile."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UsuarioCriarSerializer
        return UsuarioSerializer

    def get_object(self):
        return self.request.user
