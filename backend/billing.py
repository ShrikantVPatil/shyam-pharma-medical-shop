from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import bindparam, text

from backend.auth import require_role
from backend.database import engine


router = APIRouter(prefix="/bills", tags=["Billing"])


class BillCreate(BaseModel):
    sale_ids: list[int]
    payment_method: str


# Create a bill from existing sales
@router.post("")
def create_bill(
    bill: BillCreate,
    current_user: dict = Depends(require_role("admin", "pharmacist"))
):
    if not bill.sale_ids:
        raise HTTPException(
            status_code=400,
            detail="At least one sale is required"
        )

    if bill.payment_method.lower() not in ["cash", "upi", "card"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid payment method"
        )

    with engine.begin() as connection:
        # Prevent duplicate sale IDs
        if len(bill.sale_ids) != len(set(bill.sale_ids)):
            raise HTTPException(
                status_code=400,
                detail="Duplicate sale IDs are not allowed"
            )

        # Retrieve selected sales and lock their rows
        result = connection.execute(
            text("""
                SELECT id, total_price, bill_id
                FROM sales
                WHERE id IN :sale_ids
                FOR UPDATE
            """).bindparams(
                bindparam("sale_ids", expanding=True)
            ),
            {"sale_ids": bill.sale_ids}
        )

        sales = result.fetchall()

        if len(sales) != len(bill.sale_ids):
            raise HTTPException(
                status_code=404,
                detail="One or more sales were not found"
            )

        if any(sale.bill_id is not None for sale in sales):
            raise HTTPException(
                status_code=400,
                detail="One or more sales already belong to a bill"
            )

        total_amount = round(
            sum(float(sale.total_price) for sale in sales),
            2
        )

        # Create the bill
        result = connection.execute(
            text("""
                INSERT INTO bills
                    (total_amount, payment_method, payment_status)
                VALUES
                    (:total_amount, :payment_method, :payment_status)
            """),
            {
                "total_amount": total_amount,
                "payment_method": bill.payment_method.lower(),
                "payment_status": "Paid"
            }
        )

        bill_id = result.lastrowid

        # Associate the selected sales with this bill
        connection.execute(
            text("""
                UPDATE sales
                SET bill_id = :bill_id
                WHERE id IN :sale_ids
            """).bindparams(
                bindparam("sale_ids", expanding=True)
            ),
            {
                "bill_id": bill_id,
                "sale_ids": bill.sale_ids
            }
        )

    return {
        "message": "Bill created successfully",
        "bill_id": bill_id,
        "sale_ids": bill.sale_ids,
        "total_amount": total_amount,
        "payment_method": bill.payment_method.lower(),
        "payment_status": "Paid"
    }


# Retrieve a bill and its items
@router.get("/{bill_id}")
def get_bill(
    bill_id: int,
    current_user: dict = Depends(require_role("admin", "pharmacist"))
):
    with engine.connect() as connection:
        # Retrieve the bill
        bill_result = connection.execute(
            text("""
                SELECT id, total_amount, payment_method,
                       payment_status, bill_date
                FROM bills
                WHERE id = :id
            """),
            {"id": bill_id}
        )

        bill = bill_result.fetchone()

        if bill is None:
            raise HTTPException(
                status_code=404,
                detail="Bill not found"
            )

        # Retrieve the medicines associated with the bill
        sales_result = connection.execute(
            text("""
                SELECT s.id AS sale_id,
                       m.name AS medicine_name,
                       s.quantity,
                       s.unit_price,
                       s.total_price
                FROM sales s
                JOIN medicines m ON s.medicine_id = m.id
                WHERE s.bill_id = :bill_id
                ORDER BY s.id
            """),
            {"bill_id": bill_id}
        )

        items = []

        for row in sales_result:
            items.append({
                "sale_id": row.sale_id,
                "medicine_name": row.medicine_name,
                "quantity": row.quantity,
                "unit_price": float(row.unit_price),
                "total_price": float(row.total_price)
            })

    return {
        "bill_id": bill.id,
        "total_amount": float(bill.total_amount),
        "payment_method": bill.payment_method,
        "payment_status": bill.payment_status,
        "bill_date": str(bill.bill_date),
        "items": items
    }