from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from ..models.user import UserInDB
from ..database.mongodb import MongoDB
from jose import jwt
from bson import ObjectId
from bson.errors import InvalidId
import os
from dotenv import load_dotenv

load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"

# OAuth2 scheme for token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    """
    FastAPI dependency that gets the current user from a JWT token.
    Usage:
        @router.get("/some-protected-route")
        async def protected_route(current_user: UserInDB = Depends(get_current_user)):
            return {"message": f"Hello {current_user.email}"}
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.JWTError:
        raise credentials_exception
    
    try:
        db = MongoDB.get_db()
        user = db.users.find_one({"_id": ObjectId(user_id)})
        
        if user is None:
            raise credentials_exception
        
        # Convert ObjectId to string for the response
        user["_id"] = str(user["_id"])
        return UserInDB(**user)
    except InvalidId:
        # This happens if the user_id from the token is not a valid MongoDB ObjectId
        raise credentials_exception 