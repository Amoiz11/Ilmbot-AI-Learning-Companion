from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, ConfigDict, Field

class GoogleAuthRequest(BaseModel):
    google_id: str
    name: str
    email: EmailStr
    picture: str | None = Field(default=None, alias="profile_picture")

    model_config = ConfigDict(populate_by_name=True)

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    google_id: str
    name: str
    email: str
    profile_picture: str | None = None
    created_at: datetime
    last_login: datetime
