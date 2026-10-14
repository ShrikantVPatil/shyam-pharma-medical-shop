from datetime import date

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import bindparam, text

from backend.auth import router as auth_router, require_role
from backend.database import engine
from backend.medicines import router as medicines_router
from backend.inventory import router as inventory_router
from backend.sales import router as sales_router
from backend.billing import router as billing_router
from backend.reports import router as reports_router

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(medicines_router)
app.include_router(inventory_router)
app.include_router(sales_router)
app.include_router(billing_router)
app.include_router(reports_router)

from datetime import date
from pydantic import BaseModel



@app.get("/")
def home():
    return {"message": "Medical Shop API is running"}
