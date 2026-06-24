"""Views for usuarios app — authentication endpoints."""
from django.conf import settings
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

class SSOLoginView(APIView):
    """POST /api/auth/sso/ — troca token do SystemD por token do ContratID.

    Acesso permitido apenas para:
    - perfil ADMIN  ou
    - setor 'Administrativo'
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import jwt as pyjwt

        systemd_token = request.data.get('token')
        if not systemd_token:
            return Response({'error': 'Campo token é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        signing_key = settings.SYSTEMD_JWT_KEY
        if not signing_key:
            return Response({'error': 'SSO não configurado.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            payload = pyjwt.decode(systemd_token, signing_key, algorithms=['HS256'])
        except pyjwt.ExpiredSignatureError:
            return Response({'error': 'Token expirado. Recarregue o SystemD.'}, status=status.HTTP_401_UNAUTHORIZED)
        except pyjwt.InvalidTokenError:
            return Response({'error': 'Token inválido.'}, status=status.HTTP_401_UNAUTHORIZED)

        if payload.get('token_type') != 'access':
            return Response({'error': 'Apenas access tokens são aceitos.'}, status=status.HTTP_400_BAD_REQUEST)

        perfil = payload.get('perfil', '')
        setor  = payload.get('setor', '') or ''
        email  = payload.get('email', '')
        nome   = payload.get('nome', '')

        if perfil != 'ADMIN' and setor.lower() != 'administrativo':
            return Response(
                {'error': 'Acesso restrito ao setor Administrativo ou perfil Admin.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        usuario, _ = Usuario.objects.get_or_create(
            email=email,
            defaults={'nome': nome, 'is_active': True, 'is_admin': perfil == 'ADMIN'},
        )
        # Sync nome e is_admin em cada login SSO
        usuario.nome     = nome
        usuario.is_admin = (perfil == 'ADMIN')
        usuario.save(update_fields=['nome', 'is_admin'])

        refresh = RefreshToken.for_user(usuario)
        return Response({
            'access':  str(refresh.access_token),
            'refresh': str(refresh),
            'user':    {'email': email, 'nome': nome, 'perfil': perfil, 'setor': setor},
        }, status=status.HTTP_200_OK)
