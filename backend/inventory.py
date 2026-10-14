from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from backend.auth import require_role
from backend.database import engine


router = APIRouter(prefix="/inventory", tags=["Inventory"])


class StockIn(BaseModel):
    medicine_id: int
    quantity: int


# Add stock to an existing medicine
@router.post("/stock-in")
def stock_in(
    stock: StockIn,
    current_user: dict = Depends(require_role("admin"))
):
    with engine.begin() as connection:
        result = connection.execute(
            text("""
                SELECT id, name, quantity
                FROM medicines
                WHERE id = :id
                FOR UPDATE
            """),
            {"id": stock.medicine_id}
        )

        medicine = result.fetchone()

        if medicine is None:
            raise HTTPException(
                status_code=404,
                detail="Medicine not found"
            )

        if stock.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Quantity must be greater than zero"
            )

        connection.execute(
            text("""
                UPDATE medicines
                SET quantity = quantity + :quantity
                WHERE id = :id
            """),
            {
                "quantity": stock.quantity,
                "id": stock.medicine_id
            }
        )

        new_quantity = medicine.quantity + stock.quantity

    return {
        "message": "Stock added successfully",
        "medicine_id": medicine.id,
        "medicine_name": medicine.name,
        "stock_received": stock.quantity,
        "new_quantity": new_quantity
    }


# Remove stock from an existing medicine
@router.post("/stock-out")
def stock_out(
    stock: StockIn,
    current_user: dict = Depends(require_role("admin"))
):
    with engine.begin() as connection:
        result = connection.execute(
            text("""
                SELECT id, name, quantity
                FROM medicines
                WHERE id = :id
                FOR UPDATE
            """),
            {"id": stock.medicine_id}
        )

        medicine = result.fetchone()

        if medicine is None:
            raise HTTPException(
                status_code=404,
                detail="Medicine not found"
            )

        if stock.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Quantity must be greater than zero"
            )

        if medicine.quantity < stock.quantity:
            raise HTTPException(
                status_code=400,
                detail="Not enough stock"
            )

        connection.execute(
            text("""
                UPDATE medicines
                SET quantity = quantity - :quantity
                WHERE id = :id
            """),
            {
                "quantity": stock.quantity,
                "id": stock.medicine_id
            }
        )

        new_quantity = medicine.quantity - stock.quantity

    return {
        "message": "Stock removed successfully",
        "medicine_id": medicine.id,
        "medicine_name": medicine.name,
        "stock_removed": stock.quantity,
        "new_quantity": new_quantity
    }