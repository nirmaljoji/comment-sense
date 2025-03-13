from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import os
from dotenv import load_dotenv
from ..models.user import UserInDB, TokenData
from ..database.mongodb import MongoDB
from bson import ObjectId
import hashlib

load_dotenv()

class AuthService:
    # JWT Configuration
    SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    REFRESH_TOKEN_EXPIRE_DAYS = 7

    def __init__(self):
        # Password hashing
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against a hash."""
        # Use simple SHA-256 hashing (MongoDB's default approach)
        hashed_input = hashlib.sha256(plain_password.encode()).hexdigest()
        return hashed_input == hashed_password

    def get_password_hash(self, password: str) -> str:
        """Generate a password hash."""
        # Use simple SHA-256 hashing (MongoDB's default approach)
        return hashlib.sha256(password.encode()).hexdigest()

    def get_user(self, email: str) -> Optional[UserInDB]:
        """Get a user from the database by email."""
        db = MongoDB.get_db()
        user_data = db.users.find_one({"email": email})
        if user_data:
            # Convert ObjectId to string for the id field
            user_data["_id"] = str(user_data["_id"])
            return UserInDB(**user_data)
        return None

    def authenticate_user(self, email: str, password: str) -> Optional[UserInDB]:
        """Authenticate a user."""
        user = self.get_user(email)
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.SECRET_KEY, algorithm=self.ALGORITHM)
        return encoded_jwt

    def create_refresh_token(self, data: dict) -> str:
        """Create a JWT refresh token."""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=self.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, self.SECRET_KEY, algorithm=self.ALGORITHM)
        return encoded_jwt

    def verify_token(self, token: str, token_type: str = "access") -> dict:
        """Verify a JWT token."""
        try:
            payload = jwt.decode(token, self.SECRET_KEY, algorithms=[self.ALGORITHM])
            
            # For refresh tokens, verify the token type
            if token_type == "refresh" and payload.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
                
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            ) 