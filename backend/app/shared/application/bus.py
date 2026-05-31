from dataclasses import dataclass
from typing import Any, Callable, Dict, Type


@dataclass
class Command:
    pass


@dataclass
class Query:
    pass


class CommandBus:
    def __init__(self) -> None:
        self._handlers: Dict[Type[Command], Callable] = {}

    def register(self, command_type: Type[Command], handler: Callable) -> None:
        self._handlers[command_type] = handler

    async def dispatch(self, command: Command) -> Any:
        handler = self._handlers.get(type(command))
        if not handler:
            raise ValueError(f"No handler registered for {type(command).__name__}")
        return await handler(command)


class QueryBus:
    def __init__(self) -> None:
        self._handlers: Dict[Type[Query], Callable] = {}

    def register(self, query_type: Type[Query], handler: Callable) -> None:
        self._handlers[query_type] = handler

    async def dispatch(self, query: Query) -> Any:
        handler = self._handlers.get(type(query))
        if not handler:
            raise ValueError(f"No handler registered for {type(query).__name__}")
        return await handler(query)


command_bus = CommandBus()
query_bus = QueryBus()
