from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Address:
    street: str
    number: str
    neighborhood: str
    city: str
    state: str
    zip_code: str
    complement: Optional[str] = None
    country: str = "BR"

    def to_dict(self) -> dict:
        return {
            "street": self.street,
            "number": self.number,
            "complement": self.complement,
            "neighborhood": self.neighborhood,
            "city": self.city,
            "state": self.state,
            "zip_code": self.zip_code,
            "country": self.country,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Address":
        return cls(**data)


@dataclass(frozen=True)
class Location:
    latitude: float
    longitude: float

    def to_dict(self) -> dict:
        return {"latitude": self.latitude, "longitude": self.longitude}

    @classmethod
    def from_dict(cls, data: dict) -> "Location":
        return cls(latitude=data["latitude"], longitude=data["longitude"])
