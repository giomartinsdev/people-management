from dataclasses import dataclass, field
from uuid import UUID
from app.shared.domain.events import DomainEvent


@dataclass
class TenantCreatedEvent(DomainEvent):
    tenant_id: UUID = field(default=None)
    name: str = field(default="")
    email: str = field(default="")


@dataclass
class TenantUpdatedEvent(DomainEvent):
    tenant_id: UUID = field(default=None)


@dataclass
class TenantDeletedEvent(DomainEvent):
    tenant_id: UUID = field(default=None)


@dataclass
class AreaCreatedEvent(DomainEvent):
    area_id: UUID = field(default=None)
    tenant_id: UUID = field(default=None)
    name: str = field(default="")


@dataclass
class AreaUpdatedEvent(DomainEvent):
    area_id: UUID = field(default=None)


@dataclass
class AreaDeletedEvent(DomainEvent):
    area_id: UUID = field(default=None)


@dataclass
class SubareaCreatedEvent(DomainEvent):
    subarea_id: UUID = field(default=None)
    area_id: UUID = field(default=None)
    name: str = field(default="")


@dataclass
class SubareaUpdatedEvent(DomainEvent):
    subarea_id: UUID = field(default=None)


@dataclass
class SubareaDeletedEvent(DomainEvent):
    subarea_id: UUID = field(default=None)
