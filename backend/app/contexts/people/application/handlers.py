from app.shared.exceptions import EntityNotFoundError
from app.shared.infrastructure.event_bus import event_bus

from ..domain.entities import Person
from ..domain.repositories import PersonRepository
from .commands import (
    AssignPersonToAreaCommand,
    AssignPersonToSubareaCommand,
    CreatePersonCommand,
    DeletePersonCommand,
    UpdatePersonCommand,
)
from .queries import (
    GetPersonOrgPathQuery,
    GetPersonQuery,
    ListPeopleByAreaQuery,
    ListPeopleBySubareaQuery,
    ListPeopleQuery,
)


class PersonCommandHandler:
    def __init__(self, repo: PersonRepository) -> None:
        self._repo = repo

    async def handle_create(self, cmd: CreatePersonCommand) -> Person:
        person = Person.create(
            name=cmd.name,
            document=cmd.document,
            email=cmd.email,
            addresses=cmd.addresses,
            location=cmd.location,
        )
        await self._repo.save(person)
        await event_bus.publish_all(person.pull_events())
        return person

    async def handle_update(self, cmd: UpdatePersonCommand) -> Person:
        person = await self._repo.find_by_id(cmd.person_id)
        if not person:
            raise EntityNotFoundError("Person", str(cmd.person_id))
        person.update(
            name=cmd.name,
            document=cmd.document,
            email=cmd.email,
            addresses=cmd.addresses,
            location=cmd.location,
        )
        await self._repo.save(person)
        await event_bus.publish_all(person.pull_events())
        return person

    async def handle_delete(self, cmd: DeletePersonCommand) -> None:
        person = await self._repo.find_by_id(cmd.person_id)
        if not person:
            raise EntityNotFoundError("Person", str(cmd.person_id))
        person.soft_delete()
        await self._repo.delete(person)
        await event_bus.publish_all(person.pull_events())

    async def handle_assign_to_subarea(self, cmd: AssignPersonToSubareaCommand) -> None:
        person = await self._repo.find_by_id(cmd.person_id)
        if not person:
            raise EntityNotFoundError("Person", str(cmd.person_id))
        await self._repo.assign_to_subarea(cmd.person_id, cmd.subarea_id)
        person.assign_to_subarea(cmd.subarea_id)
        await event_bus.publish_all(person.pull_events())

    async def handle_assign_to_area(self, cmd: AssignPersonToAreaCommand) -> None:
        person = await self._repo.find_by_id(cmd.person_id)
        if not person:
            raise EntityNotFoundError("Person", str(cmd.person_id))
        await self._repo.assign_to_area(cmd.person_id, cmd.area_id)
        person.assign_to_area(cmd.area_id)
        await event_bus.publish_all(person.pull_events())


class PersonQueryHandler:
    def __init__(self, repo: PersonRepository) -> None:
        self._repo = repo

    async def handle_get(self, query: GetPersonQuery) -> Person:
        person = await self._repo.find_by_id(query.person_id)
        if not person:
            raise EntityNotFoundError("Person", str(query.person_id))
        return person

    async def handle_list(self, query: ListPeopleQuery) -> list[Person]:
        return await self._repo.find_all(
            skip=query.skip, limit=query.limit, name_filter=query.name_filter
        )

    async def handle_list_by_subarea(self, query: ListPeopleBySubareaQuery) -> list[Person]:
        return await self._repo.find_by_subarea(
            query.subarea_id, skip=query.skip, limit=query.limit
        )

    async def handle_list_by_area(self, query: ListPeopleByAreaQuery) -> list[Person]:
        return await self._repo.find_by_area(
            query.area_id, skip=query.skip, limit=query.limit
        )

    async def handle_get_org_path(self, query: GetPersonOrgPathQuery) -> dict:
        person = await self._repo.find_by_id(query.person_id)
        if not person:
            raise EntityNotFoundError("Person", str(query.person_id))
        return await self._repo.get_org_path(query.person_id)
