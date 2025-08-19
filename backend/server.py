from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str
    options: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    options: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int = 1
    price: float
    selected_options: Optional[Dict[str, Any]] = None

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_email: str
    customer_note: Optional[str] = None
    items: List[OrderItem]
    total_amount: float
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    customer_email: str
    customer_note: Optional[str] = None
    items: List[OrderItem]

# Helper functions for datetime serialization
def prepare_for_mongo(data):
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
            elif isinstance(value, list):
                data[key] = [prepare_for_mongo(item) if isinstance(item, dict) else item for item in value]
            elif isinstance(value, dict):
                data[key] = prepare_for_mongo(value)
    return data

def parse_from_mongo(item):
    if isinstance(item, dict):
        for key, value in item.items():
            if key == 'created_at' and isinstance(value, str):
                try:
                    item[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except:
                    item[key] = datetime.now(timezone.utc)
            elif isinstance(value, dict):
                item[key] = parse_from_mongo(value)
            elif isinstance(value, list):
                item[key] = [parse_from_mongo(sub_item) if isinstance(sub_item, dict) else sub_item for sub_item in value]
    return item

# Initialize products on startup
async def init_products():
    existing_count = await db.products.count_documents({})
    if existing_count == 0:
        products = [
            {
                "id": str(uuid.uuid4()),
                "name": "Professional Logo Design",
                "description": "Get a custom professional logo designed for your brand. Perfect for businesses, startups, and personal projects.",
                "price": 25.0,
                "category": "design",
                "image_url": "https://images.unsplash.com/photo-1705056509266-c80d38d564e4",
                "options": None
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Art Drawings - Photo to Art",
                "description": "Transform your photos into stunning art pieces with various artistic styles available.",
                "price": 45.0,
                "category": "art",
                "image_url": "https://images.pexels.com/photos/6231/marketing-color-colors-wheel.jpg",
                "options": {
                    "styles": [
                        {"name": "Oil Painting", "description": "Timeless, textured, rich colors (Van Gogh, Rembrandt style)"},
                        {"name": "Vector / Flat Design", "description": "Bold, clean shapes (perfect for logos, apps, infographics)"},
                        {"name": "Anime / Manga", "description": "Japanese style (Naruto, Studio Ghibli, Demon Slayer)"},
                        {"name": "Impressionism", "description": "Soft, light brushstrokes (Claude Monet's Water Lilies style)"},
                        {"name": "Cyberpunk", "description": "Neon, futuristic, dystopian (Blade Runner vibe)"}
                    ]
                }
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Video Editing - 1 Minute",
                "description": "Professional video editing for short form content, perfect for social media and marketing.",
                "price": 35.0,
                "category": "video",
                "image_url": "https://images.unsplash.com/photo-1712904284384-4ac912d0c9d8",
                "options": {"duration": "1 minute"}
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Video Editing - 5 Minutes",
                "description": "Professional video editing for medium length content, ideal for tutorials and presentations.",
                "price": 75.0,
                "category": "video",
                "image_url": "https://images.unsplash.com/photo-1712904284384-4ac912d0c9d8",
                "options": {"duration": "5 minutes"}
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Video Editing - 20+ Minutes",
                "description": "Professional video editing for long form content, perfect for documentaries and detailed presentations.",
                "price": 120.0,
                "category": "video",
                "image_url": "https://images.unsplash.com/photo-1712904284384-4ac912d0c9d8",
                "options": {"duration": "20+ minutes"}
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Full Photoshop Course",
                "description": "Complete Adobe Photoshop course covering everything from basics to advanced techniques. Perfect for beginners and professionals.",
                "price": 149.99,
                "category": "course",
                "image_url": "https://images.unsplash.com/photo-1626785774573-4b799315345d",
                "options": None
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Full Adobe Premiere Course",
                "description": "Comprehensive Adobe Premiere Pro course for video editing mastery. Learn professional video editing from scratch.",
                "price": 199.99,
                "category": "course",
                "image_url": "https://images.unsplash.com/photo-1609921212029-bb5a28e60960",
                "options": None
            }
        ]
        await db.products.insert_many(products)

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Digital Products Marketplace API"}

@api_router.get("/products", response_model=List[Product])
async def get_products():
    products = await db.products.find().to_list(length=None)
    return [Product(**product) for product in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate):
    # Validate order data
    if not order_data.customer_email or not order_data.customer_email.strip():
        raise HTTPException(status_code=422, detail="Customer email is required")
    
    if not order_data.items or len(order_data.items) == 0:
        raise HTTPException(status_code=422, detail="Order must contain at least one item")
    
    # Calculate total amount
    total_amount = sum(item.price * item.quantity for item in order_data.items)
    
    order_dict = order_data.dict()
    order_dict['total_amount'] = total_amount
    order_obj = Order(**order_dict)
    
    # Prepare for MongoDB
    order_mongo = prepare_for_mongo(order_obj.dict())
    await db.orders.insert_one(order_mongo)
    
    return order_obj

@api_router.get("/orders", response_model=List[Order])
async def get_orders():
    orders = await db.orders.find().sort("created_at", -1).to_list(length=None)
    parsed_orders = [parse_from_mongo(order) for order in orders]
    return [Order(**order) for order in parsed_orders]

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    parsed_order = parse_from_mongo(order)
    return Order(**parsed_order)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await init_products()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()