from src.domain.{{snakeCase moduleName}}.entity import {{pascalCase moduleName}}
from src.domain.{{snakeCase moduleName}}.repository import {{pascalCase moduleName}}Repository
from src.errors.app_error import NotFoundError


class Create{{pascalCase moduleName}}UseCase:
    def __init__(self, repository: {{pascalCase moduleName}}Repository):
        self._repo = repository

    async def execute(self, name: str) -> {{pascalCase moduleName}}:
        entity = {{pascalCase moduleName}}(id=0, name=name)
        return await self._repo.save(entity)


class Get{{pascalCase moduleName}}UseCase:
    def __init__(self, repository: {{pascalCase moduleName}}Repository):
        self._repo = repository

    async def get_all(self) -> list[{{pascalCase moduleName}}]:
        return await self._repo.find_all()

    async def get_by_id(self, pk: int) -> {{pascalCase moduleName}}:
        entity = await self._repo.find_by_id(pk)
        if entity is None:
            raise NotFoundError(f"{{pascalCase moduleName}} with id {pk} not found")
        return entity


class Update{{pascalCase moduleName}}UseCase:
    def __init__(self, repository: {{pascalCase moduleName}}Repository):
        self._repo = repository

    async def execute(self, pk: int, name: str) -> {{pascalCase moduleName}}:
        entity = await self._repo.find_by_id(pk)
        if entity is None:
            raise NotFoundError(f"{{pascalCase moduleName}} with id {pk} not found")
        entity.name = name
        return await self._repo.save(entity)


class Delete{{pascalCase moduleName}}UseCase:
    def __init__(self, repository: {{pascalCase moduleName}}Repository):
        self._repo = repository

    async def execute(self, pk: int) -> None:
        await self._repo.delete(pk)
