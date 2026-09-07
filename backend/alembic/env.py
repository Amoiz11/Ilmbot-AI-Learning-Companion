import os
import sys
from logging.config import fileConfig
from dotenv import load_dotenv

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Add backend directory to sys.path
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))

# Load .env variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Import Base and models
from app.database.connection import Base, DATABASE_URL
import app.models  # ensure all models (including RAG documents) are loaded

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set main sqlalchemy.url dynamically from DATABASE_URL
url = DATABASE_URL
if url and url.startswith("postgres://"):
    url = url.replace("postgres://", "postgresql://", 1)

if url and url != "your_neon_connection_string_here":
    config.set_main_option("sqlalchemy.url", url)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url_to_use = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url_to_use,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
