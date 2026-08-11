from .entity import {{pascalCase moduleName}}
from .repository import {{pascalCase moduleName}}Repository


class {{pascalCase moduleName}}Service:
    """Domain service — pure business logic, no framework imports."""

    def __init__(self, repository: {{pascalCase moduleName}}Repository):
        self._repo = repository

    async def create(self, name: str) -> {{pascalCase moduleName}}:
        if not name or not name.strip():
            raise ValueError("name must not be empty")
        entity = {{pascalCase moduleName}}(id=0, name=name.strip())
        return await self._repo.save(entity)

    async def get_all(self) -> list[{{pascalCase moduleName}}]:
        return await self._repo.find_all()

    async def get_by_id(self, pk: int) -> {{pascalCase moduleName}} | None:
        return await self._repo.find_by_id(pk)

    async def update(self, pk: int, name: str) -> {{pascalCase moduleName}}:
        entity = await self._repo.find_by_id(pk)
        if entity is None:
            raise ValueError(f"{{pascalCase moduleName}} with id {pk} not found")
        if not name or not name.strip():
            raise ValueError("name must not be empty")
        entity.name = name.strip()
        return await self._repo.save(entity)

    async def delete(self, pk: int) -> None:
        await self._repo.delete(pk)
