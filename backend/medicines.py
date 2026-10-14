from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from backend.database import engine
from backend.auth import require_role


router = APIRouter(prefix="/medicines", tags=["Medicines"])


# Request model for adding a medicine
class MedicineCreate(BaseModel):
    name: str
    price: float
    quantity: int
    expiry_date: date | None = None


# Request model for updating a medicine
class MedicineUpdate(BaseModel):
    name: str | None = None
    price: float | None = None
    quantity: int | None = None
    min_stock: int | None = None
    expiry_date: date | None = None


# Get all medicines
@router.get("")
def get_medicines(
    current_user: dict = Depends(require_role("admin", "pharmacist"))
):
    with engine.connect() as connection:
        result = connection.execute(text("SELECT * FROM medicines"))

        medicines = []

        for row in result:
            medicines.append({
                "id": row.id,
                "name": row.name,
                "price": float(row.price),
                "quantity": row.quantity,
                "min_stock": row.min_stock,
                "expiry_date": str(row.expiry_date) if row.expiry_date else None
            })

        return medicines


# Get expired medicines and medicines expiring within 30 days
@router.get("/expiry-alerts")
def get_expiry_alerts(
    current_user: dict = Depends(require_role("admin", "pharmacist"))
):
    today = date.today()
    next_30_days = today + timedelta(days=30)

    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT id, name, price, quantity, expiry_date
                FROM medicines
                WHERE expiry_date < :today
                   OR (
                       expiry_date >= :today
                       AND expiry_date <= :next_30_days
                   )
                ORDER BY expiry_date ASC
            """),
            {
                "today": today,
                "next_30_days": next_30_days
            }
        )

        medicines = []

        for row in result:
            if row.expiry_date < today:
                status = "Expired"
            else:
                status = "Expiring Soon"

            medicines.append({
                "id": row.id,
                "name": row.name,
                "price": float(row.price),
                "quantity": row.quantity,
                "expiry_date": str(row.expiry_date),
                "status": status
            })

    return medicines


# Search medicines by name
@router.get("/search")
def search_medicines(
    name: str,
    current_user: dict = Depends(require_role("admin", "pharmacist"))
):
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT id, name, price, quantity, min_stock
                FROM medicines
                WHERE name LIKE :name
            """),
            {"name": f"%{name}%"}
        )

        medicines = []

        for row in result:
            medicines.append({
                "id": row.id,
                "name": row.name,
                "price": float(row.price),
                "quantity": row.quantity,
                "min_stock": row.min_stock
            })

    return medicines


# Get medicines at or below the configured minimum stock
@router.get("/low-stock")
def get_low_stock(
    current_user: dict = Depends(require_role("admin", "pharmacist"))
):
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT id, name, price, quantity, min_stock
                FROM medicines
                WHERE quantity <= min_stock
                ORDER BY quantity ASC
            """)
        )

        medicines = []

        for row in result:
            medicines.append({
                "id": row.id,
                "name": row.name,
                "price": float(row.price),
                "quantity": row.quantity,
                "min_stock": row.min_stock
            })

    return medicines


# Get a single medicine by ID
@router.get("/{medicine_id}")
def get_medicine(
    medicine_id: int,
    current_user: dict = Depends(require_role("admin"))
):
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT * FROM medicines WHERE id = :id"),
            {"id": medicine_id}
        )

        row = result.fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Medicine not found"
            )

        return {
            "id": row.id,
            "name": row.name,
            "price": float(row.price),
            "quantity": row.quantity
        }


# Add a new medicine
@router.post("")
def create_medicine(
    medicine: MedicineCreate,
    current_user: dict = Depends(require_role("admin"))
):
    with engine.begin() as connection:
        result = connection.execute(
            text("""
                INSERT INTO medicines
                    (name, price, quantity, expiry_date)
                VALUES
                    (:name, :price, :quantity, :expiry_date)
            """),
            {
                "name": medicine.name,
                "price": medicine.price,
                "quantity": medicine.quantity,
                "expiry_date": medicine.expiry_date
            }
        )

        medicine_id = result.lastrowid

    return {
        "message": "Medicine added successfully",
        "id": medicine_id,
        "name": medicine.name,
        "price": medicine.price,
        "quantity": medicine.quantity,
        "expiry_date": medicine.expiry_date
    }


# Update selected fields of an existing medicine
@router.put("/{medicine_id}")
def update_medicine(
    medicine_id: int,
    medicine: MedicineUpdate,
    current_user: dict = Depends(require_role("admin"))
):
    updates = medicine.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one field to update"
        )

    for field, value in updates.items():
        # Expiry date can be NULL.
        if field == "expiry_date":
            continue

        if value is None:
            raise HTTPException(
                status_code=400,
                detail=f"{field} cannot be null"
            )

        if field == "name" and not value.strip():
            raise HTTPException(
                status_code=400,
                detail="Name cannot be empty"
            )

        if field == "price" and value <= 0:
            raise HTTPException(
                status_code=400,
                detail="Price must be greater than zero"
            )

        if field in {"quantity", "min_stock"} and value < 0:
            raise HTTPException(
                status_code=400,
                detail=f"{field} cannot be negative"
            )

    # Build the SQL UPDATE statement.
    set_clause = ", ".join(
        f"{field} = :{field}" for field in updates
    )

    updates["medicine_id"] = medicine_id

    with engine.begin() as connection:
        result = connection.execute(
            text(f"""
                UPDATE medicines
                SET {set_clause}
                WHERE id = :medicine_id
            """),
            updates
        )

        if result.rowcount == 0:
            exists = connection.execute(
                text("SELECT id FROM medicines WHERE id = :id"),
                {"id": medicine_id}
            ).fetchone()

            if exists is None:
                raise HTTPException(
                    status_code=404,
                    detail="Medicine not found"
                )

    return {
        "message": "Medicine updated successfully",
        "medicine_id": medicine_id,
        "updated_fields": list(updates.keys())
    }

# Delete a medicine if it has no sales history
@router.delete("/{medicine_id}")
def delete_medicine(
    medicine_id: int,
    current_user: dict = Depends(require_role("admin"))
):
    with engine.begin() as connection:
        medicine = connection.execute(
            text("SELECT id FROM medicines WHERE id = :id"),
            {"id": medicine_id}
        ).fetchone()

        if medicine is None:
            raise HTTPException(
                status_code=404,
                detail="Medicine not found"
            )

        sales = connection.execute(
            text("""
                SELECT id
                FROM sales
                WHERE medicine_id = :id
                LIMIT 1
            """),
            {"id": medicine_id}
        ).fetchone()

        if sales is not None:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete medicine with sales history"
            )

        connection.execute(
            text("DELETE FROM medicines WHERE id = :id"),
            {"id": medicine_id}
        )

    return {"message": "Medicine deleted successfully"}