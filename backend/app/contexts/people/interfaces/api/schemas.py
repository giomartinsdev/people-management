from datetime import datetime
from typing import Any, Dict, List, Optional
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


class PersonCreateRequest(BaseModel):
    name: str
    document: str
    email: str
    addresses: List[AddressSchema] = []
    location: Optional[LocationSchema] = None


class PersonUpdateRequest(BaseModel):
    name: Optional[str] = None
    document: Optional[str] = None
    email: Optional[str] = None
    addresses: Optional[List[AddressSchema]] = None
    location: Optional[LocationSchema] = None


class PersonResponse(BaseModel):
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


class AssignToSubareaRequest(BaseModel):
    subarea_id: UUID


class AssignToAreaRequest(BaseModel):
    area_id: UUID


class PersonOrgPathResponse(BaseModel):
    tenant: Optional[Dict[str, Any]]
    area: Optional[Dict[str, Any]]
    subarea: Optional[Dict[str, Any]]
    person: Optional[Dict[str, Any]]
