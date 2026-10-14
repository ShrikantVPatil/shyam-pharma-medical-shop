from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from backend.auth import require_role
from backend.database import engine


router = APIRouter(prefix="/sales", tags=["Sales"])


class SaleCreate(BaseModel):
    medicine_id: int
    quantity: int = Field(gt=0)


# Create a sale and reduce medicine stock
@router.post("")
def create_sale(
    sale: SaleCreate,
    current_user: dict = Depends(require_role("admin", "pharmacist"))
):
    with engine.begin() as connection:
        result = connection.execute(
            text("""
                SELECT *
                FROM medicines
                WHERE id = :id
                FOR UPDATE
            """),
            {"id": sale.medicine_id}
        )

        medicine = result.fetchone()

        if medicine is None:
            raise HTTPException(
                status_code=404,
                detail="Medicine not found"
            )

        # Prevent selling expired medicines
        if (
            medicine.expiry_date is not None
            and medicine.expiry_date < date.today()
        ):
            raise HTTPException(
                status_code=400,
                detail="Cannot sell expired medicine"
            )

        if medicine.quantity < sale.quantity:
            raise HTTPException(
                status_code=400,
                detail="Not enough stock"
            )

        unit_price = float(medicine.price)
        total_price = round(unit_price * sale.quantity, 2)

        # Save the sale
        result = connection.execute(
            text("""
                INSERT INTO sales
                    (medicine_id, quantity, unit_price, total_price)
                VALUES
                    (:medicine_id, :quantity, :unit_price, :total_price)
            """),
            {
                "medicine_id": sale.medicine_id,
                "quantity": sale.quantity,
                "unit_price": unit_price,
                "total_price": total_price
            }
        )

        sale_id = result.lastrowid

        # Reduce medicine stock
        connection.execute(
            text("""
                UPDATE medicines
                SET quantity = quantity - :quantity
                WHERE id = :id
            """),
            {
                "quantity": sale.quantity,
                "id": sale.medicine_id
            }
        )

        remaining_stock = medicine.quantity - sale.quantity

    return {
        "message": "Sale completed successfully",
        "sale_id": sale_id,
        "medicine_id": sale.medicine_id,
        "medicine_name": medicine.name,
        "quantity_sold": sale.quantity,
        "unit_price": unit_price,
        "total_price": total_price,
        "remaining_stock": remaining_stock
    }


# Retrieve sales history
@router.get("")
def get_sales(
    current_user: dict = Depends(require_role("admin", "pharmacist"))
):
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    s.id AS sale_id,
                    m.name AS medicine_name,
                    s.quantity,
                    s.unit_price,
                    s.total_price,
                    s.sale_date
                FROM sales s
                JOIN medicines m ON s.medicine_id = m.id
                ORDER BY s.id DESC
            """)
        )

        sales = []

        for row in result:
            sales.append({
                "sale_id": row.sale_id,
                "medicine_name": row.medicine_name,
                "quantity": row.quantity,
                "unit_price": float(row.unit_price),
                "total_price": float(row.total_price),
                "sale_date": str(row.sale_date)
            })

    return sales