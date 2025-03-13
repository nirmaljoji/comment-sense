from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    
class UserLogin(BaseModel):
    email: EmailStr
    password: str
    
class UserResponse(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime
    active_chat_id: Optional[str] = None
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None

class UserInDB(BaseModel):
    id: str = Field(alias="_id")
    email: EmailStr
    hashed_password: str
    created_at: datetime
    active_chat_id: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        } 