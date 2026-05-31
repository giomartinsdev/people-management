import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.container import wire
from app.shared.exceptions import AppError
from app.shared.infrastructure.database import close_database, get_pool, setup_database

from app.contexts.organization.interfaces.api.routes import router as org_router
from app.contexts.people.interfaces.api.routes import router as people_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — connecting to database")
    await setup_database()
    pool = await get_pool()
    wire(pool)
    logger.info("Database connected and handlers wired")
    yield
    logger.info("Shutting down — closing database pool")
    await close_database()


app = FastAPI(
    title="People Management API",
    description="Graph-based people management using Apache AGE + DDD + CQRS",
    version="1.0.0",
    lifespan=lifespan,
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    status = 404 if exc.code == "NOT_FOUND" else 409 if exc.code == "DUPLICATE" else 500
    return JSONResponse(status_code=status, content={"error": exc.code, "detail": exc.message})


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"error": "BAD_REQUEST", "detail": str(exc)})


app.include_router(org_router, prefix="/api/v1", tags=["Organization"])
app.include_router(people_router, prefix="/api/v1", tags=["People"])


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
