from dataclasses import dataclass, field
from uuid import UUID
from app.shared.domain.events import DomainEvent


@dataclass
class PersonCreatedEvent(DomainEvent):
    person_id: UUID = field(default=None)
    name: str = field(default="")
    email: str = field(default="")


@dataclass
class PersonUpdatedEvent(DomainEvent):
    person_id: UUID = field(default=None)


@dataclass
class PersonDeletedEvent(DomainEvent):
    person_id: UUID = field(default=None)


@dataclass
class PersonAssignedToSubareaEvent(DomainEvent):
    person_id: UUID = field(default=None)
    subarea_id: UUID = field(default=None)


@dataclass
class PersonAssignedToAreaEvent(DomainEvent):
    person_id: UUID = field(default=None)
    area_id: UUID = field(default=None)
