"""Serializers for usuarios app."""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Usuario


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT serializer that adds user info to the token payload."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['nome'] = user.nome
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Augment login response with user info
        data['usuario'] = {
            'id': self.user.id,
            'email': self.user.email,
            'nome': self.user.nome,
            'is_admin': self.user.is_admin,
            'empresa_id': self.user.empresa_id,
        }
        return data


class UsuarioSerializer(serializers.ModelSerializer):
    """Read serializer for Usuario."""

    class Meta:
        model = Usuario
        fields = ['id', 'email', 'nome', 'empresa', 'is_active', 'is_admin', 'criado_em']
        read_only_fields = ['id', 'criado_em']


class UsuarioCriarSerializer(serializers.ModelSerializer):
    """Write serializer for creating/updating Usuario."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Usuario
        fields = ['email', 'nome', 'password', 'empresa', 'is_admin']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Usuario(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
