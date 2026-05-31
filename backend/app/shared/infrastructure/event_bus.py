import asyncio
import logging
from typing import Callable, Dict, List, Type
from app.shared.domain.events import DomainEvent

logger = logging.getLogger(__name__)


class EventBus:
    def __init__(self) -> None:
        self._handlers: Dict[Type[DomainEvent], List[Callable]] = {}

    def subscribe(self, event_type: Type[DomainEvent], handler: Callable) -> None:
        self._handlers.setdefault(event_type, []).append(handler)

    async def publish(self, event: DomainEvent) -> None:
        for handler in self._handlers.get(type(event), []):
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(event)
                else:
                    handler(event)
            except Exception:
                logger.exception("Event handler %s failed for %s", handler, type(event).__name__)

    async def publish_all(self, events: List[DomainEvent]) -> None:
        for event in events:
            await self.publish(event)


event_bus = EventBus()
