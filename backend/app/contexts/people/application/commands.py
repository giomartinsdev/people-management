from dataclasses import dataclass, field
from typing import List, Optional
from uuid import UUID

from app.shared.application.bus import Command
from app.shared.domain.value_objects import Address, Location


@dataclass
class CreatePersonCommand(Command):
    name: str
    document: str
    email: str
    addresses: List[Address] = field(default_factory=list)
    location: Optional[Location] = None


@dataclass
class UpdatePersonCommand(Command):
    person_id: UUID
    name: Optional[str] = None
    document: Optional[str] = None
    email: Optional[str] = None
    addresses: Optional[List[Address]] = None
    location: Optional[Location] = None


@dataclass
class DeletePersonCommand(Command):
    person_id: UUID


@dataclass
class AssignPersonToSubareaCommand(Command):
    person_id: UUID
    subarea_id: UUID


@dataclass
class AssignPersonToAreaCommand(Command):
    person_id: UUID
    area_id: UUID
