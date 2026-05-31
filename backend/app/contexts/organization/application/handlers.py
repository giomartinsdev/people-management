from app.shared.exceptions import EntityNotFoundError
from app.shared.infrastructure.event_bus import event_bus

from ..domain.entities import Area, Subarea, Tenant
from ..domain.repositories import AreaRepository, SubareaRepository, TenantRepository
from .commands import (
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
from .queries import (
    GetAreaQuery,
    GetOrgChartQuery,
    GetSubareaQuery,
    GetTenantQuery,
    ListAreasQuery,
    ListSubareasQuery,
    ListTenantsQuery,
)


class TenantCommandHandler:
    def __init__(self, repo: TenantRepository) -> None:
        self._repo = repo

    async def handle_create(self, cmd: CreateTenantCommand) -> Tenant:
        tenant = Tenant.create(
            name=cmd.name,
            document=cmd.document,
            email=cmd.email,
            addresses=cmd.addresses,
            location=cmd.location,
        )
        await self._repo.save(tenant)
        await event_bus.publish_all(tenant.pull_events())
        return tenant

    async def handle_update(self, cmd: UpdateTenantCommand) -> Tenant:
        tenant = await self._repo.find_by_id(cmd.tenant_id)
        if not tenant:
            raise EntityNotFoundError("Tenant", str(cmd.tenant_id))
        tenant.update(
            name=cmd.name,
            document=cmd.document,
            email=cmd.email,
            addresses=cmd.addresses,
            location=cmd.location,
        )
        await self._repo.save(tenant)
        await event_bus.publish_all(tenant.pull_events())
        return tenant

    async def handle_delete(self, cmd: DeleteTenantCommand) -> None:
        tenant = await self._repo.find_by_id(cmd.tenant_id)
        if not tenant:
            raise EntityNotFoundError("Tenant", str(cmd.tenant_id))
        tenant.soft_delete()
        await self._repo.delete(tenant)
        await event_bus.publish_all(tenant.pull_events())


class TenantQueryHandler:
    def __init__(self, repo: TenantRepository) -> None:
        self._repo = repo

    async def handle_get(self, query: GetTenantQuery) -> Tenant:
        tenant = await self._repo.find_by_id(query.tenant_id)
        if not tenant:
            raise EntityNotFoundError("Tenant", str(query.tenant_id))
        return tenant

    async def handle_list(self, query: ListTenantsQuery) -> list[Tenant]:
        return await self._repo.find_all(skip=query.skip, limit=query.limit)


class AreaCommandHandler:
    def __init__(self, tenant_repo: TenantRepository, area_repo: AreaRepository) -> None:
        self._tenant_repo = tenant_repo
        self._area_repo = area_repo

    async def handle_create(self, cmd: CreateAreaCommand) -> Area:
        tenant = await self._tenant_repo.find_by_id(cmd.tenant_id)
        if not tenant:
            raise EntityNotFoundError("Tenant", str(cmd.tenant_id))
        area = Area.create(name=cmd.name, tenant_id=cmd.tenant_id)
        await self._area_repo.save(area)
        await event_bus.publish_all(area.pull_events())
        return area

    async def handle_update(self, cmd: UpdateAreaCommand) -> Area:
        area = await self._area_repo.find_by_id(cmd.area_id)
        if not area:
            raise EntityNotFoundError("Area", str(cmd.area_id))
        area.update(name=cmd.name)
        await self._area_repo.save(area)
        await event_bus.publish_all(area.pull_events())
        return area

    async def handle_delete(self, cmd: DeleteAreaCommand) -> None:
        area = await self._area_repo.find_by_id(cmd.area_id)
        if not area:
            raise EntityNotFoundError("Area", str(cmd.area_id))
        area.soft_delete()
        await self._area_repo.delete(area)
        await event_bus.publish_all(area.pull_events())


class AreaQueryHandler:
    def __init__(self, repo: AreaRepository) -> None:
        self._repo = repo

    async def handle_get(self, query: GetAreaQuery) -> Area:
        area = await self._repo.find_by_id(query.area_id)
        if not area:
            raise EntityNotFoundError("Area", str(query.area_id))
        return area

    async def handle_list(self, query: ListAreasQuery) -> list[Area]:
        return await self._repo.find_by_tenant(
            query.tenant_id, skip=query.skip, limit=query.limit
        )


class SubareaCommandHandler:
    def __init__(self, area_repo: AreaRepository, subarea_repo: SubareaRepository) -> None:
        self._area_repo = area_repo
        self._subarea_repo = subarea_repo

    async def handle_create(self, cmd: CreateSubareaCommand) -> Subarea:
        area = await self._area_repo.find_by_id(cmd.area_id)
        if not area:
            raise EntityNotFoundError("Area", str(cmd.area_id))
        subarea = Subarea.create(name=cmd.name, area_id=cmd.area_id)
        await self._subarea_repo.save(subarea)
        await event_bus.publish_all(subarea.pull_events())
        return subarea

    async def handle_update(self, cmd: UpdateSubareaCommand) -> Subarea:
        subarea = await self._subarea_repo.find_by_id(cmd.subarea_id)
        if not subarea:
            raise EntityNotFoundError("Subarea", str(cmd.subarea_id))
        subarea.update(name=cmd.name)
        await self._subarea_repo.save(subarea)
        await event_bus.publish_all(subarea.pull_events())
        return subarea

    async def handle_delete(self, cmd: DeleteSubareaCommand) -> None:
        subarea = await self._subarea_repo.find_by_id(cmd.subarea_id)
        if not subarea:
            raise EntityNotFoundError("Subarea", str(cmd.subarea_id))
        subarea.soft_delete()
        await self._subarea_repo.delete(subarea)
        await event_bus.publish_all(subarea.pull_events())


class SubareaQueryHandler:
    def __init__(self, repo: SubareaRepository) -> None:
        self._repo = repo

    async def handle_get(self, query: GetSubareaQuery) -> Subarea:
        subarea = await self._repo.find_by_id(query.subarea_id)
        if not subarea:
            raise EntityNotFoundError("Subarea", str(query.subarea_id))
        return subarea

    async def handle_list(self, query: ListSubareasQuery) -> list[Subarea]:
        return await self._repo.find_by_area(
            query.area_id, skip=query.skip, limit=query.limit
        )
