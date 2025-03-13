from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from ..models.user import UserCreate, UserResponse, TokenResponse
from ..utils.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
    verify_token,
    oauth2_scheme
)
from ..database.mongodb import MongoDB
from datetime import datetime
from bson import ObjectId
from ..utils.logger import logger

router = APIRouter()

# Create a separate OAuth2 scheme for refresh tokens
refresh_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/refresh", auto_error=True)

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate):
    db = MongoDB.get_db()
    
    # Check if user already exists
    existing_user = db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash the password
    hashed_password = get_password_hash(user_data.password)
    
    # Create new user
    new_user = {
        "email": user_data.email,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow()
    }
    
    result = db.users.insert_one(new_user)
    
    # Get the created user
    created_user = db.users.find_one({"_id": result.inserted_id})
    
    # Format response
    return {
        "id": str(created_user["_id"]),
        "email": created_user["email"],
        "created_at": created_user["created_at"]
    }

@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = MongoDB.get_db()
    
    # Find user by email
    user = db.users.find_one({"email": form_data.username})
    
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access and refresh tokens
    access_token = create_access_token(data={"sub": str(user["_id"])})
    refresh_token = create_refresh_token(data={"sub": str(user["_id"])})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str = Depends(refresh_scheme)):
    try:
        # Verify the refresh token
        payload = verify_token(refresh_token, token_type="refresh")
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Verify that the user still exists
        db = MongoDB.get_db()
        user = db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Create new access and refresh tokens
        access_token = create_access_token(data={"sub": user_id})
        new_refresh_token = create_refresh_token(data={"sub": user_id})
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.get("/me", response_model=UserResponse)
async def get_user_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "created_at": current_user["created_at"]
    }

@router.post("/logout")
async def logout():
    # JWT is stateless, so we don't need to do anything server-side
    # The client should remove both access and refresh tokens from storage
    return {"message": "Successfully logged out"}

@router.post("/set-chat-id")
async def set_chat_id(current_user: dict = Depends(get_current_user)):
    """
    Sets a new chat ID for the current user. Called when dashboard loads or refreshes.
    """
    db = MongoDB.get_db()
    
    # Generate a simple chat ID using timestamp for uniqueness
    new_chat_id = str(int(datetime.utcnow().timestamp()))
    
    # Update the user's active_chat_id
    db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"active_chat_id": new_chat_id}}
    )
    
    return {"active_chat_id": new_chat_id} 