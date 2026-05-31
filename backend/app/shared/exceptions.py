class AppError(Exception):
    def __init__(self, message: str, code: str = "ERROR") -> None:
        self.message = message
        self.code = code
        super().__init__(message)


class EntityNotFoundError(AppError):
    def __init__(self, entity_type: str, entity_id: str) -> None:
        super().__init__(f"{entity_type} '{entity_id}' not found", "NOT_FOUND")


class DuplicateEntityError(AppError):
    def __init__(self, entity_type: str, field: str, value: str) -> None:
        super().__init__(
            f"{entity_type} with {field}='{value}' already exists", "DUPLICATE"
        )
