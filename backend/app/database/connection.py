import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load environment variables reliably from backend/.env or current directory
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(backend_dir, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL or DATABASE_URL == "your_neon_connection_string_here":
    print("WARNING: DATABASE_URL is missing or set to placeholder value in .env file.", file=sys.stderr)

# Ensure database URL starts with postgresql:// if given postgres://
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

try:
    if DATABASE_URL and DATABASE_URL != "your_neon_connection_string_here":
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    else:
        # Fallback or placeholder engine for local development testing when DATABASE_URL is placeholder
        engine = create_engine("sqlite:///./local_dev.db", connect_args={"check_same_thread": False})
except Exception as e:
    print(f"Error initializing SQLAlchemy engine: {e}", file=sys.stderr)
    engine = create_engine("sqlite:///./local_dev.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def init_db():
    if engine.url.drivername.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
