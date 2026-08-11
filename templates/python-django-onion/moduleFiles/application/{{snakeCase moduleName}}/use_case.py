from domain.{{snakeCase moduleName}}.entity import {{pascalCase moduleName}}
from domain.{{snakeCase moduleName}}.repository import {{pascalCase moduleName}}Repository
from core.app_error import NotFoundError


class Create{{pascalCase moduleName}}UseCase:
    def __init__(self, repository: {{pascalCase moduleName}}Repository):
        self._repo = repository

    def execute(self, name: str) -> {{pascalCase moduleName}}:
        entity = {{pascalCase moduleName}}(name=name)
        return self._repo.save(entity)


class Get{{pascalCase moduleName}}UseCase:
    def __init__(self, repository: {{pascalCase moduleName}}Repository):
        self._repo = repository

    def get_all(self) -> list[{{pascalCase moduleName}}]:
        return self._repo.find_all()

    def get_by_id(self, pk: int) -> {{pascalCase moduleName}}:
        entity = self._repo.find_by_id(pk)
        if entity is None:
            raise NotFoundError(f"{{pascalCase moduleName}} with id {pk} not found")
        return entity


class Update{{pascalCase moduleName}}UseCase:
    def __init__(self, repository: {{pascalCase moduleName}}Repository):
        self._repo = repository

    def execute(self, pk: int, name: str) -> {{pascalCase moduleName}}:
        entity = self._repo.find_by_id(pk)
        if entity is None:
            raise NotFoundError(f"{{pascalCase moduleName}} with id {pk} not found")
        entity.name = name
        return self._repo.save(entity)


class Delete{{pascalCase moduleName}}UseCase:
    def __init__(self, repository: {{pascalCase moduleName}}Repository):
        self._repo = repository

    def execute(self, pk: int) -> None:
        self._repo.delete(pk)
