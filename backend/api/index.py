from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Response
from .langgraph.agent import assistant_ui_graph
from .routes.add_langgraph_route import add_langgraph_route
from .database.mongodb import MongoDB
from .routes.file_routes import router as file_router
from .routes.auth_routes import router as auth_router
from .routes.feedback_routes import router as feedback_router
from .utils.logger import logger
from apscheduler.schedulers.background import BackgroundScheduler
import httpx
import os
import asyncio

app = FastAPI()

# Get environment
ENVIRONMENT = os.getenv("NODE_ENV", "development")
BASE_URL = "https://comment-sense-qkru.onrender.com" if ENVIRONMENT == "production" else "http://localhost:8000"

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Service is running"}

# Async function to perform health check
async def perform_health_check():
    try:
        async with httpx.AsyncClient() as client:
            health_url = f"{BASE_URL}/health"
            response = await client.get(health_url)
            if response.status_code == 200:
                logger.info(f"Health check passed for {health_url}")
            else:
                logger.error(f"Health check failed for {health_url} with status code: {response.status_code}")
    except Exception as e:
        logger.error(f"Health check failed with error: {str(e)}")

# Sync wrapper for the async health check
def sync_health_check():
    asyncio.run(perform_health_check())

@app.on_event("startup")
async def startup_db_client():
    MongoDB.connect_db()
    # Initialize the scheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(sync_health_check, 'cron', minute='*/1')  
    scheduler.start()

@app.on_event("shutdown")
def shutdown_db_client():
    MongoDB.close_db()

# CORS configuration - update with your frontend URL in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://comment-sense-delta.vercel.app"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add routes
add_langgraph_route(app, assistant_ui_graph, "/api/chat")
app.include_router(file_router, prefix="/api/files", tags=["files"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(feedback_router, prefix="/api/feedback", tags=["feedback"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
