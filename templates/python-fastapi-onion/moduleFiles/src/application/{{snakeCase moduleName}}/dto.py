from pydantic import BaseModel, Field


class {{pascalCase moduleName}}CreateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class {{pascalCase moduleName}}UpdateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class {{pascalCase moduleName}}ResponseDTO(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}
