from dataclasses import dataclass, field
from typing import List, Optional
from uuid import UUID

from app.shared.application.bus import Command
from app.shared.domain.value_objects import Address, Location


@dataclass
class CreateTenantCommand(Command):
    name: str
    document: str
    email: str
    addresses: List[Address] = field(default_factory=list)
    location: Optional[Location] = None


@dataclass
class UpdateTenantCommand(Command):
    tenant_id: UUID
    name: Optional[str] = None
    document: Optional[str] = None
    email: Optional[str] = None
    addresses: Optional[List[Address]] = None
    location: Optional[Location] = None


@dataclass
class DeleteTenantCommand(Command):
    tenant_id: UUID


@dataclass
class CreateAreaCommand(Command):
    tenant_id: UUID
    name: str


@dataclass
class UpdateAreaCommand(Command):
    area_id: UUID
    name: Optional[str] = None


@dataclass
class DeleteAreaCommand(Command):
    area_id: UUID


@dataclass
class CreateSubareaCommand(Command):
    area_id: UUID
    name: str


@dataclass
class UpdateSubareaCommand(Command):
    subarea_id: UUID
    name: Optional[str] = None


@dataclass
class DeleteSubareaCommand(Command):
    subarea_id: UUID
