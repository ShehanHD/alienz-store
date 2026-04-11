from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.middleware import MaintenanceModeMiddleware
from api.routers import auth as auth_router
from api.routers import setup as setup_router

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


@app.get("/health")
def health():
    return {"status": "ok"}
