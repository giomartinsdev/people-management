from abc import ABC
from uuid import UUID
from typing import List
from .events import DomainEvent


class AggregateRoot(ABC):
    def __init__(self, id: UUID):
        self._id = id
        self._events: List[DomainEvent] = []

    @property
    def id(self) -> UUID:
        return self._id

    def add_event(self, event: DomainEvent) -> None:
        self._events.append(event)

    def pull_events(self) -> List[DomainEvent]:
        events = list(self._events)
        self._events.clear()
        return events
