from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings
from api.middleware import MaintenanceModeMiddleware
from api.routers import (
    setup as setup_router,
    auth as auth_router,
    site_config as site_config_router,
    categories as categories_router,
    products as products_router,
    images as images_router,
    enquiries as enquiries_router,
    account as account_router,
    wishlist as wishlist_router,
    admin_clients as admin_clients_router,
    admin_dashboard as admin_dashboard_router,
    ref_data as ref_data_router,
    collaborators as collaborators_router,
)

app = FastAPI(title="Clothing Store API", version="1.0.0")

_allowed_origins = [o.strip() for o in settings.frontend_url.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
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
app.include_router(account_router.router)
app.include_router(wishlist_router.router)
app.include_router(admin_clients_router.router)
app.include_router(admin_dashboard_router.router)
app.include_router(ref_data_router.router)
app.include_router(collaborators_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}
