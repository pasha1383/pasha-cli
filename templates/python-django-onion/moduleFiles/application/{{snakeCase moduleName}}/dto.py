from rest_framework import serializers


class {{pascalCase moduleName}}DTO(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=255)
