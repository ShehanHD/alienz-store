from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.middleware import MaintenanceModeMiddleware
from api.routers import auth as auth_router
from api.routers import setup as setup_router
from api.routers import site_config as site_config_router
from api.routers import categories as categories_router
from api.routers import products as products_router
from api.routers import images as images_router
from api.routers import enquiries as enquiries_router

app = FastAPI(title="Clothing Store API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # replace with production domain before going live
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(MaintenanceModeMiddleware)


app.include_router(setup_router.router)
app.include_router(auth_router.router)
app.include_router(site_config_router.router)
app.include_router(categories_router.router)
app.include_router(products_router.router)
app.include_router(images_router.router)
app.include_router(enquiries_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}
