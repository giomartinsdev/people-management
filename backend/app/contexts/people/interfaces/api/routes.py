from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.shared.application.bus import command_bus, query_bus
from app.shared.domain.value_objects import Address, Location
from app.shared.exceptions import EntityNotFoundError

from ...application.commands import (
    AssignPersonToAreaCommand,
    AssignPersonToSubareaCommand,
    CreatePersonCommand,
    DeletePersonCommand,
    UpdatePersonCommand,
)
from ...application.queries import (
    GetPersonOrgPathQuery,
    GetPersonQuery,
    ListPeopleByAreaQuery,
    ListPeopleBySubareaQuery,
    ListPeopleQuery,
)
from ...domain.entities import Person
from .schemas import (
    AssignToAreaRequest,
    AssignToSubareaRequest,
    PersonCreateRequest,
    PersonOrgPathResponse,
    PersonResponse,
    PersonUpdateRequest,
)

router = APIRouter()


def _person_to_response(p: Person) -> PersonResponse:
    return PersonResponse(
        id=p.id,
        name=p.name,
        document=p.document,
        email=p.email,
        addresses=[a.to_dict() for a in p.addresses],
        location=p.location.to_dict() if p.location else None,
        created_at=p.created_at,
        updated_at=p.updated_at,
        deleted_at=p.deleted_at,
    )


@router.post("/people", response_model=PersonResponse, status_code=status.HTTP_201_CREATED)
async def create_person(body: PersonCreateRequest):
    cmd = CreatePersonCommand(
        name=body.name,
        document=body.document,
        email=body.email,
        addresses=[Address(**a.model_dump()) for a in body.addresses],
        location=Location(**body.location.model_dump()) if body.location else None,
    )
    person = await command_bus.dispatch(cmd)
    return _person_to_response(person)


@router.get("/people", response_model=List[PersonResponse])
async def list_people(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    name: Optional[str] = Query(None),
):
    people = await query_bus.dispatch(
        ListPeopleQuery(skip=skip, limit=limit, name_filter=name)
    )
    return [_person_to_response(p) for p in people]


@router.get("/people/{person_id}", response_model=PersonResponse)
async def get_person(person_id: UUID):
    try:
        person = await query_bus.dispatch(GetPersonQuery(person_id=person_id))
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    return _person_to_response(person)


@router.put("/people/{person_id}", response_model=PersonResponse)
async def update_person(person_id: UUID, body: PersonUpdateRequest):
    try:
        cmd = UpdatePersonCommand(
            person_id=person_id,
            name=body.name,
            document=body.document,
            email=body.email,
            addresses=[Address(**a.model_dump()) for a in body.addresses] if body.addresses else None,
            location=Location(**body.location.model_dump()) if body.location else None,
        )
        person = await command_bus.dispatch(cmd)
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    return _person_to_response(person)


@router.delete("/people/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person(person_id: UUID):
    try:
        await command_bus.dispatch(DeletePersonCommand(person_id=person_id))
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.post("/people/{person_id}/assign-subarea", status_code=status.HTTP_200_OK)
async def assign_person_to_subarea(person_id: UUID, body: AssignToSubareaRequest):
    try:
        await command_bus.dispatch(
            AssignPersonToSubareaCommand(person_id=person_id, subarea_id=body.subarea_id)
        )
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    return {"message": "Person assigned to subarea"}


@router.post("/people/{person_id}/assign-area", status_code=status.HTTP_200_OK)
async def assign_person_to_area(person_id: UUID, body: AssignToAreaRequest):
    try:
        await command_bus.dispatch(
            AssignPersonToAreaCommand(person_id=person_id, area_id=body.area_id)
        )
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    return {"message": "Person assigned to area"}


@router.get("/people/{person_id}/org-path", response_model=PersonOrgPathResponse)
async def get_person_org_path(person_id: UUID):
    try:
        path = await query_bus.dispatch(GetPersonOrgPathQuery(person_id=person_id))
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    return path


@router.get("/subareas/{subarea_id}/people", response_model=List[PersonResponse])
async def list_people_by_subarea(
    subarea_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    people = await query_bus.dispatch(
        ListPeopleBySubareaQuery(subarea_id=subarea_id, skip=skip, limit=limit)
    )
    return [_person_to_response(p) for p in people]


@router.get("/areas/{area_id}/people", response_model=List[PersonResponse])
async def list_people_by_area(
    area_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    people = await query_bus.dispatch(
        ListPeopleByAreaQuery(area_id=area_id, skip=skip, limit=limit)
    )
    return [_person_to_response(p) for p in people]
