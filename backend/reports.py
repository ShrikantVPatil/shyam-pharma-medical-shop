from fastapi import APIRouter, Depends
from sqlalchemy import text

from backend.auth import require_role
from backend.database import engine


router = APIRouter(prefix="/reports", tags=["Reports"])


# Generate the sales report
@router.get("/sales")
def get_sales_report(
    current_user: dict = Depends(require_role("admin"))
):
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    COUNT(*) AS total_sales,
                    COALESCE(SUM(total_price), 0) AS total_revenue,
                    COALESCE(SUM(quantity), 0) AS total_quantity_sold
                FROM sales
            """)
        )

        report = result.fetchone()

    return {
        "total_sales": report.total_sales,
        "total_revenue": float(report.total_revenue),
        "total_quantity_sold": report.total_quantity_sold
    }


# Generate the inventory report
@router.get("/inventory")
def get_inventory_report(
    current_user: dict = Depends(require_role("admin"))
):
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    COUNT(*) AS total_medicines,
                    COALESCE(SUM(quantity), 0) AS total_stock,
                    COALESCE(SUM(price * quantity), 0) AS inventory_value,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN quantity <= min_stock THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS low_stock_medicines
                FROM medicines
            """)
        )

        report = result.fetchone()

    return {
        "total_medicines": report.total_medicines,
        "total_stock": report.total_stock,
        "inventory_value": float(report.inventory_value),
        "low_stock_medicines": report.low_stock_medicines
    }