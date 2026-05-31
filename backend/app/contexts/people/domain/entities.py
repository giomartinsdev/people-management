from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from app.shared.domain.entity import AggregateRoot
from app.shared.domain.value_objects import Address, Location
from .events import (
    PersonAssignedToAreaEvent,
    PersonAssignedToSubareaEvent,
    PersonCreatedEvent,
    PersonDeletedEvent,
    PersonUpdatedEvent,
)


class Person(AggregateRoot):
    def __init__(
        self,
        id: UUID,
        name: str,
        document: str,
        email: str,
        addresses: Optional[List[Address]] = None,
        location: Optional[Location] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        deleted_at: Optional[datetime] = None,
    ) -> None:
        super().__init__(id)
        self.name = name
        self.document = document
        self.email = email
        self.addresses: List[Address] = addresses or []
        self.location = location
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or datetime.now(timezone.utc)
        self.deleted_at = deleted_at

    @classmethod
    def create(
        cls,
        name: str,
        document: str,
        email: str,
        addresses: Optional[List[Address]] = None,
        location: Optional[Location] = None,
    ) -> "Person":
        person = cls(id=uuid4(), name=name, document=document, email=email,
                     addresses=addresses, location=location)
        person.add_event(PersonCreatedEvent(person_id=person.id, name=name, email=email))
        return person

    def update(
        self,
        name: Optional[str] = None,
        document: Optional[str] = None,
        email: Optional[str] = None,
        addresses: Optional[List[Address]] = None,
        location: Optional[Location] = None,
    ) -> None:
        if name is not None:
            self.name = name
        if document is not None:
            self.document = document
        if email is not None:
            self.email = email
        if addresses is not None:
            self.addresses = addresses
        if location is not None:
            self.location = location
        self.updated_at = datetime.now(timezone.utc)
        self.add_event(PersonUpdatedEvent(person_id=self.id))

    def assign_to_subarea(self, subarea_id: UUID) -> None:
        self.add_event(PersonAssignedToSubareaEvent(person_id=self.id, subarea_id=subarea_id))

    def assign_to_area(self, area_id: UUID) -> None:
        self.add_event(PersonAssignedToAreaEvent(person_id=self.id, area_id=area_id))

    def soft_delete(self) -> None:
        self.deleted_at = datetime.now(timezone.utc)
        self.add_event(PersonDeletedEvent(person_id=self.id))

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
