import logging

import asyncpg

from app.shared.application.bus import command_bus, query_bus
from app.shared.infrastructure.event_bus import event_bus

from app.contexts.organization.application.commands import (
    CreateAreaCommand,
    CreateSubareaCommand,
    CreateTenantCommand,
    DeleteAreaCommand,
    DeleteSubareaCommand,
    DeleteTenantCommand,
    UpdateAreaCommand,
    UpdateSubareaCommand,
    UpdateTenantCommand,
)
from app.contexts.organization.application.handlers import (
    AreaCommandHandler,
    AreaQueryHandler,
    SubareaCommandHandler,
    SubareaQueryHandler,
    TenantCommandHandler,
    TenantQueryHandler,
)
from app.contexts.organization.application.queries import (
    GetAreaQuery,
    GetOrgChartQuery,
    GetSubareaQuery,
    GetTenantQuery,
    ListAreasQuery,
    ListSubareasQuery,
    ListTenantsQuery,
)
from app.contexts.organization.infrastructure.graph_queries import OrgChartQueryService
from app.contexts.organization.infrastructure.repositories import (
    AgeAreaRepository,
    AgeSubareaRepository,
    AgeTenantRepository,
)
from app.contexts.people.application.commands import (
    AssignPersonToAreaCommand,
    AssignPersonToSubareaCommand,
    CreatePersonCommand,
    DeletePersonCommand,
    UpdatePersonCommand,
)
from app.contexts.people.application.handlers import PersonCommandHandler, PersonQueryHandler
from app.contexts.people.application.queries import (
    GetPersonOrgPathQuery,
    GetPersonQuery,
    ListPeopleByAreaQuery,
    ListPeopleBySubareaQuery,
    ListPeopleQuery,
)
from app.contexts.people.infrastructure.repositories import AgePersonRepository
from app.contexts.organization.domain.events import TenantCreatedEvent
from app.contexts.people.domain.events import (
    PersonAssignedToSubareaEvent,
    PersonCreatedEvent,
)

logger = logging.getLogger(__name__)


def wire(pool: asyncpg.Pool) -> None:
    tenant_repo = AgeTenantRepository(pool)
    area_repo = AgeAreaRepository(pool)
    subarea_repo = AgeSubareaRepository(pool)
    person_repo = AgePersonRepository(pool)
    org_chart_svc = OrgChartQueryService(pool)

    tenant_cmd = TenantCommandHandler(tenant_repo)
    area_cmd = AreaCommandHandler(tenant_repo, area_repo)
    subarea_cmd = SubareaCommandHandler(area_repo, subarea_repo)
    person_cmd = PersonCommandHandler(person_repo)

    command_bus.register(CreateTenantCommand, tenant_cmd.handle_create)
    command_bus.register(UpdateTenantCommand, tenant_cmd.handle_update)
    command_bus.register(DeleteTenantCommand, tenant_cmd.handle_delete)
    command_bus.register(CreateAreaCommand, area_cmd.handle_create)
    command_bus.register(UpdateAreaCommand, area_cmd.handle_update)
    command_bus.register(DeleteAreaCommand, area_cmd.handle_delete)
    command_bus.register(CreateSubareaCommand, subarea_cmd.handle_create)
    command_bus.register(UpdateSubareaCommand, subarea_cmd.handle_update)
    command_bus.register(DeleteSubareaCommand, subarea_cmd.handle_delete)
    command_bus.register(CreatePersonCommand, person_cmd.handle_create)
    command_bus.register(UpdatePersonCommand, person_cmd.handle_update)
    command_bus.register(DeletePersonCommand, person_cmd.handle_delete)
    command_bus.register(AssignPersonToSubareaCommand, person_cmd.handle_assign_to_subarea)
    command_bus.register(AssignPersonToAreaCommand, person_cmd.handle_assign_to_area)

    tenant_qry = TenantQueryHandler(tenant_repo)
    area_qry = AreaQueryHandler(area_repo)
    subarea_qry = SubareaQueryHandler(subarea_repo)
    person_qry = PersonQueryHandler(person_repo)

    query_bus.register(GetTenantQuery, tenant_qry.handle_get)
    query_bus.register(ListTenantsQuery, tenant_qry.handle_list)
    query_bus.register(GetAreaQuery, area_qry.handle_get)
    query_bus.register(ListAreasQuery, area_qry.handle_list)
    query_bus.register(GetSubareaQuery, subarea_qry.handle_get)
    query_bus.register(ListSubareasQuery, subarea_qry.handle_list)
    query_bus.register(GetPersonQuery, person_qry.handle_get)
    query_bus.register(ListPeopleQuery, person_qry.handle_list)
    query_bus.register(ListPeopleBySubareaQuery, person_qry.handle_list_by_subarea)
    query_bus.register(ListPeopleByAreaQuery, person_qry.handle_list_by_area)
    query_bus.register(GetPersonOrgPathQuery, person_qry.handle_get_org_path)
    query_bus.register(GetOrgChartQuery, lambda q: org_chart_svc.get_org_chart(q.tenant_id))

    event_bus.subscribe(TenantCreatedEvent, _on_tenant_created)
    event_bus.subscribe(PersonCreatedEvent, _on_person_created)
    event_bus.subscribe(PersonAssignedToSubareaEvent, _on_person_assigned)


def _on_tenant_created(event: TenantCreatedEvent) -> None:
    logger.info("Tenant created: %s <%s>", event.name, event.email)


def _on_person_created(event: PersonCreatedEvent) -> None:
    logger.info("Person created: %s <%s>", event.name, event.email)


def _on_person_assigned(event: PersonAssignedToSubareaEvent) -> None:
    logger.info("Person %s assigned to subarea %s", event.person_id, event.subarea_id)
