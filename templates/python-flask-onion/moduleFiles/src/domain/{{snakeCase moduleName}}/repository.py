from abc import ABC, abstractmethod

from .entity import {{pascalCase moduleName}}


class {{pascalCase moduleName}}Repository(ABC):
    @abstractmethod
    def save(self, entity: {{pascalCase moduleName}}) -> {{pascalCase moduleName}}:
        ...

    @abstractmethod
    def find_all(self) -> list[{{pascalCase moduleName}}]:
        ...

    @abstractmethod
    def find_by_id(self, pk: int) -> {{pascalCase moduleName}} | None:
        ...

    @abstractmethod
    def delete(self, pk: int) -> None:
        ...
