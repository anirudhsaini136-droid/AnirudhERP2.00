from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone, date
import uuid

from auth import get_current_user, TokenData
from database import get_db
from pydantic import BaseModel
from sqlalchemy import select, update, insert, delete as sql_delete, func

router = APIRouter(prefix="/purchases", tags=["Purchases"])

def generate_id():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

def parse_date(d):
    if isinstance(d, date):
        return d
    if isinstance(d, str):
        return datetime.strptime(d, "%Y-%m-%d").date()
    return None

def serialize(obj, exclude=None):
    if obj is None:
        return None
    exclude = exclude or []
    result = {}
    for key in obj.__table__.columns.keys():
        if key in exclude:
            continue
        val = getattr(obj, key)
        if isinstance(val, datetime):
            result[key] = val.isoformat()
        elif isinstance(val, date):
            result[key] = val.isoformat()
        elif hasattr(val, 'value'):
            result[key] = val.value
        else:
            result[key] = val
    return result

def calculate_gst(tax_rate: float, subtotal: float, seller_state: str, buyer_state: str):
    """For purchases: seller = vendor, buyer = our business"""
    if not tax_rate or tax_rate == 0:
        return {"supply_type": "intrastate", "cgst_rate": 0, "cgst_amount": 0,
                "sgst_rate": 0, "sgst_amount": 0, "igst_rate": 0, "igst_amount": 0}
    s1 = (seller_state or '').strip().lower()
    s2 = (buyer_state or '').strip().lower()
    tax_amount = round(subtotal * tax_rate / 100, 2)
    if s1 and s2 and s1 == s2:
        half_rate = round(tax_rate / 2, 2)
        half_amount = round(tax_amount / 2, 2)
        return {"supply_type": "intrastate",
                "cgst_rate": half_rate, "cgst_amount": half_amount,
                "sgst_rate": half_rate, "sgst_amount": half_amount,
                "igst_rate": 0, "igst_amount": 0}
    else:
        return {"supply_type": "interstate",
                "cgst_rate": 0, "cgst_amount": 0,
                "sgst_rate": 0, "sgst_amount": 0,
                "igst_rate": tax_rate, "igst_amount": tax_amount}

class PurchaseItemCreate(BaseModel):
    description: str
    hsn_code: Optional[str] = None
    quantity: float = 1
    unit_price: float
    product_id: Optional[str] = None  # link to inventory product
    update_stock: bool = True          # auto-increase stock

class PurchaseBillCreate(BaseModel):
    vendor_name: str
    vendor_phone: Optional[str] = None
    vendor_email: Optional[str] = None
    vendor_gstin: Optional[str] = None
    vendor_state: Optional[str] = None
    bill_date: str
    due_date: Optional[str] = None
    tax_rate: float = 0
    discount_amount: float = 0
    notes: Optional[str] = None
    items: List[PurchaseItemCreate]

class PurchasePaymentCreate(BaseModel):
    amount: float
    payment_date: str
    payment_method: str = "cash"
    reference: Optional[str] = None
    notes: Optional[str] = None

def require_access():
    async def checker(current_user: TokenData = Depends(get_current_user)):
        if current_user.role not in ["finance_admin", "business_owner", "super_admin", "inventory_admin"]:
            raise HTTPException(status_code=403, detail="Access denied")
        return current_user
    return checker

@router.get("")
async def list_purchase_bills(
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: TokenData = Depends(require_access()),
    db=Depends(get_db)
):
    from models import PurchaseBill
    business_id = current_user.business_id

    query = select(PurchaseBill).where(PurchaseBill.business_id == business_id)
    count_query = select(func.count()).where(PurchaseBill.business_id == business_id)

    if search:
        from sqlalchemy import or_
        sf = or_(PurchaseBill.vendor_name.ilike(f"%{search}%"),
                 PurchaseBill.bill_number.ilike(f"%{search}%"))
        query = query.where(sf)
        count_query = count_query.where(sf)

    if status and status != "all":
        query = query.where(PurchaseBill.status == status)
        count_query = count_query.where(PurchaseBill.status == status)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.order_by(PurchaseBill.created_at.desc())
                              .offset((page - 1) * limit).limit(limit))

    # Summary stats
    stats_result = await db.execute(
        select(func.sum(PurchaseBill.total_amount),
               func.sum(PurchaseBill.amount_paid),
               func.sum(PurchaseBill.balance_due),
               func.sum(PurchaseBill.cgst_amount),
               func.sum(PurchaseBill.sgst_amount),
               func.sum(PurchaseBill.igst_amount))
        .where(PurchaseBill.business_id == business_id)
    )
    row = stats_result.one()

    return {
        "bills": [serialize(b) for b in result.scalars()],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "stats": {
            "total_purchases": float(row[0] or 0),
            "total_paid": float(row[1] or 0),
            "total_outstanding": float(row[2] or 0),
            "total_cgst_itc": float(row[3] or 0),
            "total_sgst_itc": float(row[4] or 0),
            "total_igst_itc": float(row[5] or 0),
            "total_itc": float((row[3] or 0) + (row[4] or 0) + (row[5] or 0))
        }
    }

@router.post("")
async def create_purchase_bill(
    data: PurchaseBillCreate,
    current_user: TokenData = Depends(require_access()),
    db=Depends(get_db)
):
    from models import PurchaseBill, PurchaseBillItem, Product, StockMovement, MovementType, Business

    business_id = current_user.business_id
    now = utc_now()
    bill_id = generate_id()

    # Get our business state for GST calculation
    biz_result = await db.execute(select(Business).where(Business.id == business_id))
    biz = biz_result.scalar_one_or_none()
    our_state = getattr(biz, 'state', '') or ''

    # Generate bill number
    count_result = await db.execute(select(func.count()).where(PurchaseBill.business_id == business_id))
    bill_count = count_result.scalar() or 0
    bill_number = f"PUR-{now.strftime('%Y%m')}-{str(bill_count + 1).zfill(4)}"

    # Calculate totals
    subtotal = sum(item.quantity * item.unit_price for item in data.items)
    # For purchases: vendor is seller, we are buyer
    gst = calculate_gst(data.tax_rate, subtotal, data.vendor_state or '', our_state)
    tax_amount = round(subtotal * data.tax_rate / 100, 2) if data.tax_rate > 0 else 0
    total_amount = subtotal + tax_amount - data.discount_amount

    await db.execute(insert(PurchaseBill).values(
        id=bill_id,
        business_id=business_id,
        bill_number=bill_number,
        vendor_name=data.vendor_name,
        vendor_phone=data.vendor_phone,
        vendor_email=data.vendor_email,
        vendor_gstin=data.vendor_gstin,
        vendor_state=data.vendor_state,
        bill_date=parse_date(data.bill_date),
        due_date=parse_date(data.due_date) if data.due_date else None,
        subtotal=subtotal,
        tax_rate=data.tax_rate,
        tax_amount=tax_amount,
        cgst_rate=gst['cgst_rate'], cgst_amount=gst['cgst_amount'],
        sgst_rate=gst['sgst_rate'], sgst_amount=gst['sgst_amount'],
        igst_rate=gst['igst_rate'], igst_amount=gst['igst_amount'],
        supply_type=gst['supply_type'],
        discount_amount=data.discount_amount,
        total_amount=total_amount,
        amount_paid=0,
        balance_due=total_amount,
        status='unpaid',
        notes=data.notes,
        created_by=current_user.user_id,
        created_at=now,
        updated_at=now
    ))

    # Insert items + update stock
    for item in data.items:
        line_total = item.quantity * item.unit_price
        await db.execute(insert(PurchaseBillItem).values(
            id=generate_id(),
            bill_id=bill_id,
            business_id=business_id,
            product_id=item.product_id or None,
            description=item.description,
            hsn_code=item.hsn_code or None,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total=line_total,
            created_at=now
        ))

        # Update stock if product linked and update_stock is True
        if item.product_id and item.update_stock:
            prod_result = await db.execute(
                select(Product).where(Product.id == item.product_id, Product.business_id == business_id)
            )
            product = prod_result.scalar_one_or_none()
            if product:
                prev_stock = product.current_stock or 0
                new_stock = prev_stock + int(item.quantity)
                await db.execute(
                    update(Product).where(Product.id == item.product_id)
                    .values(current_stock=new_stock, updated_at=now)
                )
                await db.execute(insert(StockMovement).values(
                    id=generate_id(),
                    business_id=business_id,
                    product_id=item.product_id,
                    movement_type=MovementType.stock_in,
                    quantity=int(item.quantity),
                    previous_stock=prev_stock,
                    new_stock=new_stock,
                    reference=f"Purchase: {bill_number}",
                    notes=f"Stock added from purchase bill {bill_number}",
                    created_by=current_user.user_id,
                    created_at=now
                ))

    await db.commit()
    return {"id": bill_id, "bill_number": bill_number, "message": "Purchase bill created", "total_amount": total_amount}

@router.get("/{bill_id}")
async def get_purchase_bill(
    bill_id: str,
    current_user: TokenData = Depends(require_access()),
    db=Depends(get_db)
):
    from models import PurchaseBill, PurchaseBillItem, PurchasePayment
    business_id = current_user.business_id

    result = await db.execute(
        select(PurchaseBill).where(PurchaseBill.id == bill_id, PurchaseBill.business_id == business_id)
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    items_result = await db.execute(select(PurchaseBillItem).where(PurchaseBillItem.bill_id == bill_id))
    payments_result = await db.execute(
        select(PurchasePayment).where(PurchasePayment.bill_id == bill_id)
        .order_by(PurchasePayment.created_at.desc())
    )

    return {
        "bill": serialize(bill),
        "items": [serialize(i) for i in items_result.scalars()],
        "payments": [serialize(p) for p in payments_result.scalars()]
    }

@router.delete("/{bill_id}")
async def delete_purchase_bill(
    bill_id: str,
    current_user: TokenData = Depends(require_access()),
    db=Depends(get_db)
):
    from models import PurchaseBill, PurchaseBillItem, PurchasePayment
    business_id = current_user.business_id

    result = await db.execute(
        select(PurchaseBill).where(PurchaseBill.id == bill_id, PurchaseBill.business_id == business_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Bill not found")

    await db.execute(sql_delete(PurchaseBillItem).where(PurchaseBillItem.bill_id == bill_id))
    await db.execute(sql_delete(PurchasePayment).where(PurchasePayment.bill_id == bill_id))
    await db.execute(sql_delete(PurchaseBill).where(PurchaseBill.id == bill_id))
    await db.commit()
    return {"message": "Bill deleted"}

@router.post("/{bill_id}/payments")
async def record_purchase_payment(
    bill_id: str,
    data: PurchasePaymentCreate,
    current_user: TokenData = Depends(require_access()),
    db=Depends(get_db)
):
    from models import PurchaseBill, PurchasePayment
    business_id = current_user.business_id

    result = await db.execute(
        select(PurchaseBill).where(PurchaseBill.id == bill_id, PurchaseBill.business_id == business_id)
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    balance = float(bill.balance_due or 0)
    if data.amount > balance + 0.01:
        raise HTTPException(status_code=400, detail=f"Amount exceeds balance due of {balance:.2f}")

    now = utc_now()
    await db.execute(insert(PurchasePayment).values(
        id=generate_id(),
        bill_id=bill_id,
        business_id=business_id,
        amount=data.amount,
        payment_date=parse_date(data.payment_date),
        payment_method=data.payment_method,
        reference=data.reference,
        notes=data.notes,
        created_at=now
    ))

    new_paid = float(bill.amount_paid or 0) + data.amount
    new_balance = max(0, float(bill.total_amount or 0) - new_paid)
    new_status = 'paid' if new_balance <= 0.01 else 'partial'

    await db.execute(
        update(PurchaseBill).where(PurchaseBill.id == bill_id)
        .values(amount_paid=new_paid, balance_due=new_balance, status=new_status, updated_at=now)
    )
    await db.commit()
    return {"message": "Payment recorded"}

@router.get("/itc/summary")
async def itc_summary(
    start_date: str,
    end_date: str,
    current_user: TokenData = Depends(require_access()),
    db=Depends(get_db)
):
    """Input Tax Credit summary for GSTR-3B"""
    from models import PurchaseBill
    from routes.finance import parse_date as fd_parse_date
    business_id = current_user.business_id
    start = parse_date(start_date)
    end = parse_date(end_date)

    result = await db.execute(
        select(PurchaseBill).where(
            PurchaseBill.business_id == business_id,
            PurchaseBill.bill_date >= start,
            PurchaseBill.bill_date <= end
        )
    )
    bills = result.scalars().all()

    total_itc_cgst = sum(float(b.cgst_amount or 0) for b in bills)
    total_itc_sgst = sum(float(b.sgst_amount or 0) for b in bills)
    total_itc_igst = sum(float(b.igst_amount or 0) for b in bills)
    total_itc = total_itc_cgst + total_itc_sgst + total_itc_igst
    total_purchases = sum(float(b.total_amount or 0) for b in bills)

    return {
        "period": {"start": start_date, "end": end_date},
        "total_purchases": total_purchases,
        "itc": {
            "cgst": total_itc_cgst,
            "sgst": total_itc_sgst,
            "igst": total_itc_igst,
            "total": total_itc
        },
        "bills": [serialize(b) for b in bills]
    }
