from .entity import {{pascalCase moduleName}}
from .repository import {{pascalCase moduleName}}Repository


class {{pascalCase moduleName}}Service:
    """Domain service — pure business logic, no Flask imports."""

    def __init__(self, repository: {{pascalCase moduleName}}Repository):
        self._repo = repository

    def create(self, name: str) -> {{pascalCase moduleName}}:
        if not name or not name.strip():
            raise ValueError("name must not be empty")
        entity = {{pascalCase moduleName}}(name=name.strip())
        return self._repo.save(entity)

    def get_all(self) -> list[{{pascalCase moduleName}}]:
        return self._repo.find_all()

    def get_by_id(self, pk: int) -> {{pascalCase moduleName}} | None:
        return self._repo.find_by_id(pk)

    def update(self, pk: int, name: str) -> {{pascalCase moduleName}}:
        entity = self._repo.find_by_id(pk)
        if entity is None:
            raise ValueError(f"{{pascalCase moduleName}} with id {pk} not found")
        if not name or not name.strip():
            raise ValueError("name must not be empty")
        entity.name = name.strip()
        return self._repo.save(entity)

    def delete(self, pk: int) -> None:
        self._repo.delete(pk)
