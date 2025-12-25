"""
Seed script to create initial users for development and testing.

Usage:
    python scripts/seed_users.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.db.database import get_db, engine
from app.models.user import User, UserRole
from app.core.security import get_password_hash


async def create_default_users():
    """Create default users for development."""

    # Get database session
    async with engine.begin() as conn:
        # Import Base from models to create tables
        from app.db.database import Base
        from app.models import user  # noqa: F401 - Import to register models

        # Create all tables
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async for db in get_db():
        # Check if admin user exists
        result = await db.execute(select(User).where(User.username == "admin"))
        existing_admin = result.scalar_one_or_none()

        if existing_admin:
            print("❌ Admin user already exists. Skipping user creation.")
            return

        # Create admin user
        admin_user = User(
            username="admin",
            email="admin@example.com",
            full_name="Admin User",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin_user)

        # Create regular test user
        test_user = User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            hashed_password=get_password_hash("test123"),
            role=UserRole.USER,
            is_active=True,
        )
        db.add(test_user)

        # Create viewer test user
        viewer_user = User(
            username="viewer",
            email="viewer@example.com",
            full_name="Viewer User",
            hashed_password=get_password_hash("viewer123"),
            role=UserRole.VIEWER,
            is_active=True,
        )
        db.add(viewer_user)

        await db.commit()

        print("✅ Default users created successfully!")
        print("\nUser Credentials:")
        print("=" * 50)
        print("Admin User:")
        print("  Username: admin")
        print("  Password: admin123")
        print("  Email: admin@example.com")
        print("  Role: ADMIN")
        print()
        print("Test User:")
        print("  Username: testuser")
        print("  Password: test123")
        print("  Email: test@example.com")
        print("  Role: USER")
        print()
        print("Viewer User:")
        print("  Username: viewer")
        print("  Password: viewer123")
        print("  Email: viewer@example.com")
        print("  Role: VIEWER")
        print("=" * 50)
        print("\n⚠️  IMPORTANT: Change these passwords in production!")

        break  # Exit after first session


if __name__ == "__main__":
    print("Creating default users...")
    asyncio.run(create_default_users())
