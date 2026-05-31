from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class AddressSchema(BaseModel):
    street: str
    number: str
    complement: Optional[str] = None
    neighborhood: str
    city: str
    state: str
    zip_code: str
    country: str = "BR"


class LocationSchema(BaseModel):
    latitude: float
    longitude: float


class TenantCreateRequest(BaseModel):
    name: str
    document: str
    email: str
    addresses: List[AddressSchema] = []
    location: Optional[LocationSchema] = None


class TenantUpdateRequest(BaseModel):
    name: Optional[str] = None
    document: Optional[str] = None
    email: Optional[str] = None
    addresses: Optional[List[AddressSchema]] = None
    location: Optional[LocationSchema] = None


class TenantResponse(BaseModel):
    id: UUID
    name: str
    document: str
    email: str
    addresses: List[AddressSchema]
    location: Optional[LocationSchema]
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime]

    model_config = {"from_attributes": True}


class AreaCreateRequest(BaseModel):
    name: str


class AreaUpdateRequest(BaseModel):
    name: Optional[str] = None


class AreaResponse(BaseModel):
    id: UUID
    name: str
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime]

    model_config = {"from_attributes": True}


class SubareaCreateRequest(BaseModel):
    name: str


class SubareaUpdateRequest(BaseModel):
    name: Optional[str] = None


class SubareaResponse(BaseModel):
    id: UUID
    name: str
    area_id: UUID
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime]

    model_config = {"from_attributes": True}


class OrgChartNode(BaseModel):
    id: UUID
    label: str
    name: str
    parent_id: Optional[UUID] = None


class OrgChartResponse(BaseModel):
    nodes: List[OrgChartNode]
